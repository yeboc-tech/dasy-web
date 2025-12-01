'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WorksheetItem, publicWorksheetsColumns } from '@/components/worksheets/columns';
import { WorksheetsDataTable } from '@/components/worksheets/WorksheetsDataTable';
import { Loader, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 20;

export default function WorksheetsPage() {
  const [worksheets, setWorksheets] = useState<WorksheetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const observerTarget = useRef<HTMLDivElement>(null);
  const currentPage = useRef(0);
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  const fetchWorksheets = useCallback(async (page: number, search: string = '') => {
    try {
      if (page === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('worksheets')
        .select('id, title, author, created_at, selected_problem_ids')
        .eq('is_public', true);

      // Add search filter if search term exists
      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        if (page === 0) {
          setWorksheets(data);
        } else {
          setWorksheets(prev => [...prev, ...data]);
        }

        // If we got fewer items than PAGE_SIZE, we've reached the end
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error('Error fetching worksheets:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    currentPage.current = 0;
    fetchWorksheets(0, searchTerm);
  }, []);

  // Handle search with debounce
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    searchDebounceTimer.current = setTimeout(() => {
      currentPage.current = 0;
      fetchWorksheets(0, searchTerm);
    }, 300);

    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [searchTerm]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          currentPage.current += 1;
          fetchWorksheets(currentPage.current, searchTerm);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, searchTerm]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">공개 학습지</h1>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="제목으로 검색..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-8 w-64 pl-8"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader size={16} className="animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            <WorksheetsDataTable
              columns={publicWorksheetsColumns}
              data={worksheets}
              emptyMessage="아직 공개된 학습지가 없습니다."
            />

            {/* Infinite Scroll Observer + Loader - Only show when there's more data */}
            {hasMore && (
              <div ref={observerTarget} className="flex justify-center py-4">
                {loadingMore && (
                  <Loader size={16} className="animate-spin text-gray-500" />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
