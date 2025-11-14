'use client';

import { useState, useEffect } from 'react';
import { getMTChapterTree } from '@/lib/supabase/services/clientServices';
import type { ChapterTreeItem } from '@/lib/types';

export function useEconomyChapters() {
  const [chapters, setChapters] = useState<ChapterTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChapters() {
      try {
        setLoading(true);
        setError(null);
        const data = await getMTChapterTree();
        setChapters(data);
      } catch (err) {
        console.error('Error loading economy chapters:', err);
        setError(err instanceof Error ? err.message : 'Failed to load economy chapters');
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
      const data = await getMTChapterTree();
      setChapters(data);
    } catch (err) {
      console.error('Error refetching economy chapters:', err);
      setError(err instanceof Error ? err.message : 'Failed to refetch economy chapters');
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
