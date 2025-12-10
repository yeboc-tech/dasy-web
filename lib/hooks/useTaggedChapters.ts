'use client';

import { useState, useEffect } from 'react';
import { getTaggedChapterTree } from '@/lib/supabase/services/clientServices';
import type { ChapterTreeItem } from '@/lib/types';

/**
 * Hook to fetch chapters for a tagged subject (경제, 사회문화, 생활과윤리, etc.)
 */
export function useTaggedChapters(subject: string) {
  const [chapters, setChapters] = useState<ChapterTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChapters() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTaggedChapterTree(subject);
        setChapters(data);
      } catch (err) {
        console.error(`Error loading ${subject} chapters:`, err);
        setError(err instanceof Error ? err.message : `Failed to load ${subject} chapters`);
      } finally {
        setLoading(false);
      }
    }

    loadChapters();
  }, [subject]);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTaggedChapterTree(subject);
      setChapters(data);
    } catch (err) {
      console.error(`Error refetching ${subject} chapters:`, err);
      setError(err instanceof Error ? err.message : `Failed to refetch ${subject} chapters`);
    } finally {
      setLoading(false);
    }
  };

  return {
    chapters,
    loading,
    error,
    refetch
  };
}
