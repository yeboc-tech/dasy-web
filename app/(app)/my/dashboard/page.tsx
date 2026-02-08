'use client';

import { Target, BookOpen, BarChart3 } from 'lucide-react';

export default function MyDashboardPage() {
  // TODO: 실제 데이터로 교체
  const turnData = [
    { turn: 1, completed: 45, total: 100 },
    { turn: 2, completed: 20, total: 100 },
    { turn: 3, completed: 5, total: 100 },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">내 학습 현황</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 5개년 기출문제 3턴 현황 */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-[#FF00A1]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">5개년 기출문제 3턴 현황</h2>
          </div>

          <div className="space-y-4">
            {turnData.map(({ turn, completed, total }) => {
              const percentage = Math.round((completed / total) * 100);
              return (
                <div key={turn} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[var(--foreground)]">{turn}턴</span>
                    <span className="text-[var(--gray-500)]">{completed} / {total} ({percentage}%)</span>
                  </div>
                  <div className="h-3 bg-[#FFF0F7] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF00A1] rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 단원별 기출 학습 현황 */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-[#FF00A1]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">단원별 기출 학습 현황</h2>
          </div>

          {/* TODO: 단원별 학습 현황 내용 추가 */}
          <div className="text-sm text-gray-400 py-8 text-center">
            준비 중
          </div>
        </div>

        {/* 난이도별 기출 학습 현황 */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[#FF00A1]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">난이도별 기출 학습 현황</h2>
          </div>

          {/* TODO: 난이도별 학습 현황 내용 추가 */}
          <div className="text-sm text-gray-400 py-8 text-center">
            준비 중
          </div>
        </div>
      </div>
    </div>
  );
}
