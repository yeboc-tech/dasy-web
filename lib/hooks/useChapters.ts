'use client';

import { useState, useEffect } from 'react';
import { getChapterTree } from '@/lib/supabase/services/clientServices';
import type { ChapterTreeItem } from '@/lib/types';

export function useChapters() {
  const [chapters, setChapters] = useState<ChapterTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChapters() {
      try {
        setLoading(true);
        setError(null);
        const data = await getChapterTree();
        setChapters(data);
      } catch (err) {
        console.error('Error loading chapters:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chapters');
      } finally {
        setLoading(false);
      }
    }

    loadChapters();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getChapterTree();
      setChapters(data);
    } catch (err) {
      console.error('Error refetching chapters:', err);
      setError(err instanceof Error ? err.message : 'Failed to refetch chapters');
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
