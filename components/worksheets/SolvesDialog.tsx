'use client';

import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SolveRecord } from '@/lib/supabase/services/solveService';

interface SolvesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worksheetId: string;
  worksheetTitle: string;
  userId: string;
  onSolveClick?: (solve: SolveRecord) => void;
}

export function SolvesDialog({ open, onOpenChange, worksheetId, worksheetTitle, userId, onSolveClick }: SolvesDialogProps) {
  const [solves, setSolves] = useState<SolveRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && worksheetId && userId) {
      fetchSolves();
    }
  }, [open, worksheetId, userId]);

  const fetchSolves = async () => {
    try {
      setLoading(true);
      const { createClient } = await import('@/lib/supabase/client');
      const { getSolvesByWorksheet } = await import('@/lib/supabase/services/solveService');
      const supabase = createClient();

      const data = await getSolvesByWorksheet(supabase, worksheetId, userId);
      setSolves(data);
    } catch (error) {
      console.error('Error fetching solves:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}.${day} ${hours}:${minutes}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-sm p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-200">
          <DialogTitle className="text-sm font-semibold truncate pr-8">
            {worksheetTitle} 풀이 기록
          </DialogTitle>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={16} className="animate-spin text-gray-500" />
          </div>
        ) : solves.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            풀이 기록이 없습니다.
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
              <div className="px-3 py-2 text-center">#</div>
              <div className="px-3 py-2 text-center">점수</div>
              <div className="px-3 py-2 text-center">정답률</div>
              <div className="px-3 py-2 text-center">날짜</div>
            </div>

            {/* Table Rows */}
            <div className="max-h-[280px] overflow-y-auto">
              {solves.map((solve, index) => (
                <div
                  key={solve.id}
                  className={`grid grid-cols-4 text-sm ${
                    index !== solves.length - 1 ? 'border-b border-gray-100' : ''
                  } ${onSolveClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
                  onClick={() => onSolveClick?.(solve)}
                >
                  <div className="px-3 py-2.5 text-center text-gray-600">
                    {index + 1}
                  </div>
                  <div className="px-3 py-2.5 text-center font-medium">
                    {solve.score}/{solve.max_score}
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    {solve.correct_count}/{solve.total_problems}
                  </div>
                  <div className="px-3 py-2.5 text-center text-gray-500 text-xs">
                    {formatDate(solve.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
