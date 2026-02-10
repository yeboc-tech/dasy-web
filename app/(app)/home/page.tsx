'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Target, BarChart3, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { hasUserSolvedAny } from '@/lib/api/SupabaseTable';

interface WeeklyStat {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [hasSolved, setHasSolved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [stats] = useState<WeeklyStat[]>([
    { id: '1', label: '푼 문제', current: 23, target: 50, unit: '문제' },
    { id: '2', label: '복습한 오답', current: 10, target: 10, unit: '문제' },
    { id: '3', label: '완료한 학습지', current: 2, target: 5, unit: '개' },
  ]);

  useEffect(() => {
    async function checkSolveHistory() {
      if (!user) {
        setHasSolved(false);
        setLoading(false);
        return;
      }

      const { hasSolved: solved } = await hasUserSolvedAny();
      setHasSolved(solved);
      setLoading(false);
    }

    if (!authLoading) {
      checkSolveHistory();
    }
  }, [user, authLoading]);

  const getProgressPercent = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const isCompleted = (current: number, target: number) => current >= target;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">홈</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 주간 학습 목표 */}
          <section className="bg-white border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-[var(--gray-500)]" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">주간 학습 목표</h2>
            </div>

            {loading || authLoading ? (
              <div className="text-sm text-[var(--gray-500)]">로딩 중...</div>
            ) : !hasSolved ? (
              <div className="space-y-4">
                <p className="text-sm text-[var(--gray-600)] leading-relaxed">
                  주간 학습 목표는 학습기록을 바탕으로 추정합니다. 현재 기출문제를 푼 이력이 없으니 아래 중 하나를 선택하셔서 풀기를 권장합니다.
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/worksheet-group/11"
                    className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-[var(--foreground)]">상위권 진단고사 시작하기</span>
                    <span className="text-xs text-[var(--gray-500)]">정답률 90% 이상</span>
                  </Link>
                  <Link
                    href="/worksheet-group/12"
                    className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-[var(--foreground)]">중위권 진단고사 시작하기</span>
                    <span className="text-xs text-[var(--gray-500)]">정답률 70~90%</span>
                  </Link>
                  <Link
                    href="/worksheet-group/13"
                    className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-[var(--foreground)]">하위권 진단고사 시작하기</span>
                    <span className="text-xs text-[var(--gray-500)]">정답률 50~70%</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* TODO: 학습 기록 기반 목표 표시 */}
                <p className="text-sm text-[var(--gray-500)]">학습 기록을 분석 중입니다...</p>
              </div>
            )}
          </section>

          {/* 주간 학습 현황 */}
          <section className="bg-white border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-[var(--gray-500)]" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">주간 학습 현황</h2>
            </div>

            <div className="space-y-4">
              {stats.map((stat) => {
                const percent = getProgressPercent(stat.current, stat.target);
                const completed = isCompleted(stat.current, stat.target);

                return (
                  <div key={stat.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {completed ? (
                          <CheckCircle2 className="w-4 h-4 text-[var(--gray-600)]" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300" />
                        )}
                        <span className="text-sm text-[var(--foreground)]">
                          {stat.label}
                        </span>
                      </div>
                      <span className="text-sm text-[var(--gray-500)]">
                        {stat.current} / {stat.target} {stat.unit}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-[var(--gray-400)]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
