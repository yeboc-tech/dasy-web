'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { WorksheetItem, createMyWorksheetsColumns } from '@/components/worksheets/columns';
import { WorksheetsDataTable } from '@/components/worksheets/WorksheetsDataTable';
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

export default function MyWorksheetsPage() {
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
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();

  const observerTarget = useRef<HTMLDivElement>(null);
  const currentPage = useRef(0);
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  const fetchWorksheets = useCallback(async (page: number, search: string = '') => {
    if (!user?.id) return;

    try {
      if (page === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const { createClient } = await import('@/lib/supabase/client');
      const { getMyWorksheets } = await import('@/lib/supabase/services/worksheetService');
      const supabase = createClient();

      const { worksheets: data } = await getMyWorksheets(supabase, user.id, {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        search: search.trim() || undefined,
      });

      if (page === 0) {
        setWorksheets(data);
      } else {
        setWorksheets(prev => [...prev, ...data]);
      }

      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching worksheets:', error);
      toast.error('학습지를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id]);

  // Initial load when user is available
  useEffect(() => {
    if (user?.id) {
      currentPage.current = 0;
      fetchWorksheets(0, searchTerm);
    }
  }, [user?.id]);

  // Handle search with debounce
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

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
  }, [searchTerm, user?.id]);

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
    () => createMyWorksheetsColumns(handleDeleteClick, handleShareClick),
    [handleDeleteClick, handleShareClick]
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader size={16} className="animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              <WorksheetsDataTable
                columns={columns}
                data={worksheets}
                emptyMessage="아직 생성한 학습지가 없습니다."
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
      </div>
    </ProtectedRoute>
  );
}
