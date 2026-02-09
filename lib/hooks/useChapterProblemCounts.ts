'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ChapterCount {
  recent3: number;
  recent5: number;
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
  const getCount = (subject: string, chapterId: string): ChapterCount | null => {
    if (!counts || !counts[subject] || !counts[subject][chapterId]) {
      return null;
    }
    return counts[subject][chapterId];
  };

  return {
    counts,
    loading,
    error,
    getCount,
  };
}
