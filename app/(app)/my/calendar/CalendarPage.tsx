'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';

export function CalendarPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [monthlyCounts, setMonthlyCounts] = useState<Record<string, number>>({});
  const [totalStats, setTotalStats] = useState({ solved: 0, days: 0 });

  const today = useMemo(() => new Date(), []);
  const todayStr = today.toISOString().slice(0, 10);

  // 전체 풀이 수 조회
  useEffect(() => {
    if (!user) return;

    async function fetchTotal() {
      const supabase = createClient();
      const { data } = await supabase
        .from('user_problem_solve_record')
        .select('created_at')
        .eq('user_id', user!.id);

      const dateSet = new Set<string>();
      data?.forEach(r => dateSet.add(r.created_at.slice(0, 10)));
      setTotalStats({ solved: data?.length || 0, days: dateSet.size });
    }

    fetchTotal();
  }, [user]);

  // 월간 풀이 수 조회
  useEffect(() => {
    if (!user) return;

    async function fetchMonthly() {
      const supabase = createClient();
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);

      const { data } = await supabase
        .from('user_problem_solve_record')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const counts: Record<string, number> = {};
      data?.forEach(r => {
        const date = r.created_at.slice(0, 10);
        counts[date] = (counts[date] || 0) + 1;
      });
      setMonthlyCounts(counts);
    }

    fetchMonthly();
  }, [user, currentMonth]);

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // 캘린더 그리드 계산
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=일
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 월요일 시작으로 변환 (월=0, 화=1, ... 일=6)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const days: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);

    return days;
  }, [currentMonth]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // 이번 달 총 풀이 수
  const totalSolved = Object.values(monthlyCounts).reduce((a, b) => a + b, 0);
  const activeDays = Object.values(monthlyCounts).filter(v => v > 0).length;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">학습 캘린더</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 전체 요약 */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">
            전체 요약
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-[var(--foreground)]">{totalStats.solved}</p>
              <p className="text-xs text-gray-500 mt-1">풀이한 문제 수</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-[var(--foreground)]">{totalStats.days}</p>
              <p className="text-xs text-gray-500 mt-1">학습한 일수</p>
            </div>
          </div>
        </div>

        {/* 월간 요약 */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">
            {month + 1}월 요약
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-[var(--foreground)]">{totalSolved}</p>
              <p className="text-xs text-gray-500 mt-1">풀이한 문제 수</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-[var(--foreground)]">{activeDays}</p>
              <p className="text-xs text-gray-500 mt-1">학습한 일수</p>
            </div>
          </div>
        </div>

        {/* 월 네비게이션 */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-[var(--foreground)]">
                {year}년 {month + 1}월
              </span>
              <button
                onClick={goToToday}
                className="px-2 py-0.5 text-xs font-medium text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                오늘
              </button>
            </div>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-1">
            {['월', '화', '수', '목', '금', '토', '일'].map((day, i) => (
              <div
                key={day}
                className={`text-center text-xs font-medium py-2 ${
                  i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-gray-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const count = monthlyCounts[dateStr] || 0;
              const isToday = dateStr === todayStr;
              const dayOfWeek = idx % 7; // 0=월 ~ 6=일
              const isSaturday = dayOfWeek === 5;
              const isSunday = dayOfWeek === 6;
              const isPast = dateStr < todayStr;

              return (
                <div
                  key={dateStr}
                  className={`
                    aspect-square flex flex-col items-center justify-start pt-1.5 gap-0.5 rounded-lg overflow-hidden
                    ${isToday ? 'border-2 border-[#FF00A1]' : ''}
                  `}
                >
                  <span className={`text-lg font-bold leading-none ${
                    isSaturday ? 'text-blue-500' : isSunday ? 'text-red-500' : 'text-gray-700'
                  }`}>
                    {day}
                  </span>
                  {count > 0 ? (
                    <div className="grid grid-cols-5 gap-[1px] px-0.5 overflow-hidden flex-1 place-items-center content-start">
                      {Array.from({ length: count }, (_, i) => (
                        <span key={i} className="w-[8px] h-[8px] rounded-full shrink-0" style={{ background: 'radial-gradient(circle at 35% 35%, #FFB3D9, #FF80BF)' }} />
                      ))}
                    </div>
                  ) : (
                    <span className={`text-xs font-semibold ${
                      isPast ? 'text-red-300' : 'text-gray-300'
                    }`}>
                      {isPast ? 'x' : isToday ? '-' : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
