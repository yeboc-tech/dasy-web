'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WorksheetItem, createMyWorksheetsColumns } from '@/components/worksheets/columns';
import { WorksheetsDataTable } from '@/components/worksheets/WorksheetsDataTable';
import { SolvesDialog } from '@/components/worksheets/SolvesDialog';
import { Search, Loader } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/contexts/auth-context';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

type TabFilter = 'created' | 'solved';

export default function MyWorksheetsPage() {
  const [selectedFilters, setSelectedFilters] = useState<Set<TabFilter>>(new Set(['created']));
  const [worksheets, setWorksheets] = useState<WorksheetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; title: string }>({
    open: false,
    id: '',
    title: '',
  });
  const [solvesDialog, setSolvesDialog] = useState<{ open: boolean; id: string; title: string }>({
    open: false,
    id: '',
    title: '',
  });
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const observerTarget = useRef<HTMLDivElement>(null);
  const currentPage = useRef(0);
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isFetching = useRef(false);
  const prevSearchTerm = useRef(searchTerm);

  // Fetch data based on selected filters
  const fetchWorksheets = useCallback(async (page: number, search: string = '') => {
    if (!user?.id) return;

    // Prevent duplicate fetches (React Strict Mode)
    if (page === 0 && isFetching.current) return;

    const showCreated = selectedFilters.has('created');
    const showSolved = selectedFilters.has('solved');

    // If neither selected, show nothing
    if (!showCreated && !showSolved) {
      setWorksheets([]);
      setLoading(false);
      return;
    }

    try {
      if (page === 0) {
        isFetching.current = true;
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      let allWorksheets: WorksheetItem[] = [];

      // Fetch created worksheets
      if (showCreated) {
        const { getMyWorksheets } = await import('@/lib/supabase/services/worksheetService');
        const { getSolveCountByWorksheet } = await import('@/lib/supabase/services/solveService');

        const { worksheets: createdData } = await getMyWorksheets(supabase, user.id, {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          search: search.trim() || undefined,
        });

        const createdWithSolveCounts = await Promise.all(
          createdData.map(async (ws) => {
            const solveCount = await getSolveCountByWorksheet(supabase, ws.id, user.id);
            return { ...ws, solve_count: solveCount };
          })
        );

        allWorksheets = [...allWorksheets, ...createdWithSolveCounts];
      }

      // Fetch solved worksheets
      if (showSolved) {
        const { getSolvedWorksheets } = await import('@/lib/supabase/services/solveService');

        const { worksheets: solvedData } = await getSolvedWorksheets(supabase, user.id, {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });

        const solvedItems: WorksheetItem[] = solvedData
          .filter(ws => !search || ws.title.toLowerCase().includes(search.toLowerCase()))
          .map(ws => ({
            id: ws.id,
            title: ws.title,
            author: ws.author,
            created_at: ws.last_solve_at,
            selected_problem_ids: [],
            solve_count: ws.solve_count,
            thumbnail_path: ws.thumbnail_path,
          }));

        allWorksheets = [...allWorksheets, ...solvedItems];
      }

      // Sort by created_at descending
      allWorksheets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (page === 0) {
        setWorksheets(allWorksheets);
      } else {
        setWorksheets(prev => [...prev, ...allWorksheets]);
      }

      setHasMore(allWorksheets.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching worksheets:', error);
      toast.error('학습지를 불러오는데 실패했습니다.');
    } finally {
      isFetching.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id, selectedFilters]);

  // Fetch when filters change or user becomes available
  useEffect(() => {
    if (user?.id) {
      currentPage.current = 0;
      fetchWorksheets(0, searchTerm);
    }
  }, [selectedFilters, user?.id]);

  // Handle search with debounce
  useEffect(() => {
    // Skip if searchTerm hasn't actually changed (handles Strict Mode double-run)
    if (prevSearchTerm.current === searchTerm) {
      return;
    }
    prevSearchTerm.current = searchTerm;

    if (!user?.id) return;

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
  }, [searchTerm, user?.id, fetchWorksheets]);

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
  }, [hasMore, loadingMore, loading, searchTerm, fetchWorksheets]);

  const handleDeleteClick = useCallback((id: string, title: string) => {
    setDeleteDialog({ open: true, id, title });
  }, []);

  const handlePdfGenerate = useCallback((id: string) => {
    router.push(`/w/${id}?pdf=true`);
  }, [router]);

  const handleShareClick = useCallback(async (id: string, title: string, isCurrentlyPublic: boolean) => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const newPublicStatus = !isCurrentlyPublic;

      const { error } = await supabase
        .from('worksheets')
        .update({ is_public: newPublicStatus })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setWorksheets(prev =>
        prev.map(w => w.id === id ? { ...w, is_public: newPublicStatus } : w)
      );

      toast.success(newPublicStatus ? '학습지가 공개되었습니다.' : '공개가 해제되었습니다.');
    } catch (error) {
      console.error('Error toggling share status:', error);
      toast.error('공개 상태 변경에 실패했습니다.');
    }
  }, []);

  const handleSolvesClick = useCallback((id: string, title: string) => {
    setSolvesDialog({ open: true, id, title });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!user?.id || !deleteDialog.id) return;

    setDeleting(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const { deleteWorksheet } = await import('@/lib/supabase/services/worksheetService');
      const supabase = createClient();

      await deleteWorksheet(supabase, deleteDialog.id, user.id);

      // Remove from local state
      setWorksheets(prev => prev.filter(w => w.id !== deleteDialog.id));
      toast.success('학습지가 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting worksheet:', error);
      toast.error('학습지 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
      setDeleteDialog({ open: false, id: '', title: '' });
    }
  }, [user?.id, deleteDialog.id]);

  const columns = useMemo(
    () => createMyWorksheetsColumns(handleDeleteClick, handleShareClick, handlePdfGenerate, handleSolvesClick),
    [handleDeleteClick, handleShareClick, handlePdfGenerate, handleSolvesClick]
  );

  return (
    <ProtectedRoute>
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">내 학습지</h1>

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

        {/* Tabs */}
        <div className="bg-white px-4 py-3 border-b border-[var(--border)]">
          <div className="flex gap-2">
            {/* 내가 만든 button */}
            <button
              onClick={() => setSelectedFilters(new Set(['created']))}
              className={`rounded-full px-6 py-2 text-sm font-medium transition-all border cursor-pointer ${
                selectedFilters.has('created')
                  ? 'border-black text-black bg-gray-100'
                  : 'bg-white text-black border-gray-300 hover:bg-gray-50'
              }`}
            >
              내가 만든
            </button>
            {/* 내가 푼 button */}
            <button
              onClick={() => setSelectedFilters(new Set(['solved']))}
              className={`rounded-full px-6 py-2 text-sm font-medium transition-all border cursor-pointer ${
                selectedFilters.has('solved')
                  ? 'border-black text-black bg-gray-100'
                  : 'bg-white text-black border-gray-300 hover:bg-gray-50'
              }`}
            >
              내가 푼
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader size={16} className="animate-spin text-gray-500" />
            </div>
          ) : worksheets.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              학습지가 없습니다.
            </div>
          ) : (
            <>
              <WorksheetsDataTable
                columns={columns}
                data={worksheets}
              />

              {/* Infinite Scroll Observer + Loader */}
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))} modal={false}>
          <DialogContent className="bg-white" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>학습지 삭제</DialogTitle>
              <DialogDescription>
                &quot;{deleteDialog.title}&quot; 학습지를 삭제하시겠습니까?
                <br />
                이 작업은 되돌릴 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialog(prev => ({ ...prev, open: false }))} disabled={deleting}>
                취소
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Solves Dialog */}
        {user?.id && (
          <SolvesDialog
            open={solvesDialog.open}
            onOpenChange={(open) => setSolvesDialog(prev => ({ ...prev, open }))}
            worksheetId={solvesDialog.id}
            worksheetTitle={solvesDialog.title}
            userId={user.id}
            onSolveClick={(solve) => {
              setSolvesDialog(prev => ({ ...prev, open: false }));
              router.push(`/w/${solve.worksheet_id}?solve=${solve.id}`);
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
