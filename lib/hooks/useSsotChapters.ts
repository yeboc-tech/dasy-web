'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ChapterTreeItem } from '@/lib/types';

interface SsotChapter {
  id: string;
  title: string;
  chapters?: SsotChapter[];
}

interface SsotValue {
  id: string;
  title: string;
  tagType: string;
  chapters: SsotChapter[];
}

// 과목 ID를 ssot key로 변환
function getSsotKey(subjectId: string): string {
  // 통합사회 과목
  if (subjectId === '통합사회_1') return '단원_자세한통합사회_1';
  if (subjectId === '통합사회_2') return '단원_자세한통합사회_2';

  // 일반 사회탐구 과목
  return `단원_사회탐구_${subjectId}`;
}

// ssot 챕터 데이터를 ChapterTreeItem으로 변환
function convertToChapterTree(ssotChapters: SsotChapter[], parentId: string = ''): ChapterTreeItem[] {
  return ssotChapters.map(chapter => {
    const id = parentId ? `${parentId}-${chapter.id}` : chapter.id;
    return {
      id,
      label: chapter.title,
      type: chapter.chapters && chapter.chapters.length > 0 ? 'category' : 'item',
      expanded: false,
      children: chapter.chapters ? convertToChapterTree(chapter.chapters, id) : undefined,
    };
  });
}

/**
 * Hook to fetch chapters from ssot table
 */
export function useSsotChapters(subjectId: string) {
  const [chapters, setChapters] = useState<ChapterTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChapters() {
      if (!subjectId) {
        setChapters([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const ssotKey = getSsotKey(subjectId);

        const { data, error: fetchError } = await supabase
          .from('ssot')
          .select('value')
          .eq('key', ssotKey)
          .single();

        if (fetchError) {
          console.error(`Error fetching ssot for ${subjectId}:`, fetchError);
          setError(fetchError.message);
          setChapters([]);
          return;
        }

        if (!data || !data.value) {
          setChapters([]);
          return;
        }

        const ssotValue = data.value as SsotValue;

        // 과목명을 루트로 하는 트리 구조 생성
        const rootItem: ChapterTreeItem = {
          id: ssotValue.id,
          label: ssotValue.title,
          type: 'category',
          expanded: true,
          children: convertToChapterTree(ssotValue.chapters),
        };

        setChapters([rootItem]);
      } catch (err) {
        console.error(`Error loading ssot chapters for ${subjectId}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load chapters');
      } finally {
        setLoading(false);
      }
    }

    loadChapters();
  }, [subjectId]);

  return {
    chapters,
    loading,
    error,
  };
}
