'use client';

import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface TodayProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TodayProblemDialog({ open, onOpenChange }: TodayProblemDialogProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hideToday, setHideToday] = useState(false);

  const handleConfirm = () => {
    if (hideToday) {
      localStorage.setItem('hideTodayProblem', new Date().toDateString());
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#FF00A1]" />
          <span>오늘의 문제</span>
        </DialogTitle>

        <div className="mt-4">
          {/* 문제 이미지 */}
          <div className="bg-gray-50 rounded-lg mb-4 overflow-hidden">
            <img
              src="https://cdn.y3c.kr/tongkidari/contents/경제_고3_2024_03_학평_1_문제.png"
              alt="문제 이미지"
              className="w-full h-auto"
            />
          </div>

          {/* 5지선다 */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => setSelectedAnswer(num)}
                className={`
                  flex-1 py-3 rounded-lg border text-sm font-medium transition-colors
                  ${selectedAnswer === num
                    ? 'bg-[#FF00A1] text-white border-[#FF00A1]'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#FF00A1]'
                  }
                `}
              >
                {num}
              </button>
            ))}
          </div>

          {/* 하단 영역 */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideToday}
                onChange={(e) => setHideToday(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#FF00A1] focus:ring-[#FF00A1]"
              />
              <span className="text-sm text-gray-500">오늘 하루 보지 않기</span>
            </label>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-[#FF00A1] rounded-lg hover:bg-[#E0008E] transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 세션 중 다이얼로그가 이미 표시되었는지 추적
let hasShownThisSession = false;

export function useTodayProblemDialog() {
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // 이미 이 세션에서 보여줬으면 스킵
    if (hasShownThisSession) return;

    const hiddenDate = localStorage.getItem('hideTodayProblem');
    const today = new Date().toDateString();
    if (hiddenDate !== today) {
      setShowDialog(true);
      hasShownThisSession = true;
    }
  }, []);

  return { showDialog, setShowDialog };
}
