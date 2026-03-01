'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ChapterCount {
  current: number;  // 올해
  recent3: number;  // 최근 3년 (올해 제외)
  recent5: number;  // 최근 5년 (올해 제외)
  total: number;
}

export interface SubjectCounts {
  [chapterId: string]: ChapterCount;
}

export interface AllCounts {
  [subject: string]: SubjectCounts;
}

/**
 * Hook to fetch chapter problem counts from ssot table
 */
export function useChapterProblemCounts() {
  const [counts, setCounts] = useState<AllCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCounts() {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from('ssot')
          .select('value')
          .eq('key', '단원별_문제_개수')
          .single();

        if (fetchError) {
          console.error('Error fetching chapter problem counts:', fetchError);
          setError(fetchError.message);
          setCounts(null);
          return;
        }

        if (data?.value) {
          setCounts(data.value as AllCounts);
        } else {
          setCounts(null);
        }
      } catch (err) {
        console.error('Error loading chapter problem counts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load counts');
      } finally {
        setLoading(false);
      }
    }

    fetchCounts();
  }, []);

  // Helper function to get count for a specific subject and chapter
  // 통합사회_1/2는 학년별 분리 구조이므로 grade 파라미터 필요
  const getCount = (subject: string, chapterId: string, grade?: string): ChapterCount | null => {
    if (!counts || !counts[subject]) return null;

    // 통합사회는 학년별 중첩 구조: { "고2": { "1-1": {...} }, "고3": { ... } }
    if (subject.startsWith('통합사회_') && grade) {
      const gradeData = (counts[subject] as Record<string, SubjectCounts>)[grade] as SubjectCounts | undefined;
      return gradeData?.[chapterId] ?? null;
    }

    // 9개 과목: flat 구조
    if (!counts[subject][chapterId]) return null;
    return counts[subject][chapterId];
  };

  return {
    counts,
    loading,
    error,
    getCount,
  };
}
