'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, BarChart3, FileText, ChevronRight, Lightbulb } from 'lucide-react';
import { TodayProblemDialog } from '@/components/TodayProblemDialog';
import { useAuth } from '@/lib/contexts/auth-context';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';
import { createClient } from '@/lib/supabase/client';
import { getSubjectLabel } from '@/lib/utils/subjectUtils';
import {
  DashboardStatistics,
  SolveRecordDTO,
  ChapterProgress,
  SsotChapterTree,
  ChapterCountEntry,
} from '@/lib/service/DashboardStatistics';
import { EXAM_DATA_YEAR_RANGE } from '@/lib/constants/examConstants';

export function MyDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { interestSubjectIds, fetchSettings } = useUserAppSettingStore();
  const [selectedTurn, setSelectedTurn] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [weeklyCounts, setWeeklyCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [showTodayProblem, setShowTodayProblem] = useState(false);
  const [chapterTree, setChapterTree] = useState<SsotChapterTree | null>(null);
  const [chapterCounts, setChapterCounts] = useState<Record<string, ChapterCountEntry> | null>(null);
  const [problemTagMap, setProblemTagMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!authLoading && user) {
      fetchSettings(user.id);
    }
  }, [user, authLoading, fetchSettings]);

  // 풀이 기록 + accuracy_rate 조인 데이터 fetch
  useEffect(() => {
    if (!user) return;
    async function fetchSolveRecords() {
      const supabase = createClient();

      // 1. 전체 풀이 기록
      const { data: records } = await supabase
        .from('user_problem_solve_record')
        .select('problem_id, submit_answer, created_at')
        .eq('user_id', user!.id);

      if (!records || records.length === 0) {
        setStats(new DashboardStatistics([]));
        return;
      }

      // 2. 해당 problem_id들의 accuracy_rate 정보
      const problemIds = [...new Set(records.map(r => r.problem_id))];
      const { data: accuracyData } = await supabase
        .from('accuracy_rate')
        .select('problem_id, correct_answer, difficulty, score, accuracy_rate')
        .in('problem_id', problemIds);

      const accuracyMap = new Map(
        (accuracyData || []).map(a => [a.problem_id, a])
      );

      // 3. DTO 조인
      const dtos: SolveRecordDTO[] = records.map(r => {
        const acc = accuracyMap.get(r.problem_id);
        return {
          problemId: r.problem_id,
          submitAnswer: r.submit_answer,
          createdAt: r.created_at,
          correctAnswer: acc?.correct_answer ?? null,
          difficulty: acc?.difficulty ?? null,
          score: acc?.score ?? null,
          accuracyRate: acc?.accuracy_rate ?? null,
        };
      });

      setStats(new DashboardStatistics(dtos));
    }
    fetchSolveRecords();
  }, [user]);

  // 주간 캘린더용 (선택 과목 기준)
  useEffect(() => {
    if (!stats || !selectedSubject) return;
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const counts: Record<string, number> = {};
    stats.getRecords()
      .filter(r => r.problemId.split('_')[0] === selectedSubject)
      .forEach(r => {
        const date = r.createdAt.slice(0, 10);
        if (date >= sevenDaysAgo.toISOString().slice(0, 10)) {
          counts[date] = (counts[date] || 0) + 1;
        }
      });
    setWeeklyCounts(counts);
  }, [stats, selectedSubject]);

  useEffect(() => {
    if (interestSubjectIds.length > 0 && !selectedSubject) {
      setSelectedSubject(interestSubjectIds[0]);
    }
  }, [interestSubjectIds, selectedSubject]);

  // SSOT 챕터 트리 + 단원별 문제 개수 + problem_tags 매핑 fetch
  useEffect(() => {
    if (!selectedSubject) return;
    let cancelled = false;

    async function fetchChapterData() {
      const supabase = createClient();

      // 1. 챕터 트리
      const ssotKey = selectedSubject!.startsWith('통합사회_')
        ? `단원_자세한${selectedSubject}`
        : `단원_사회탐구_${selectedSubject}`;

      const [treeRes, countsRes, tagsRes] = await Promise.all([
        supabase.from('ssot').select('value').eq('key', ssotKey).single(),
        supabase.from('ssot').select('value').eq('key', '단원별_문제_개수').single(),
        supabase
          .from('problem_tags')
          .select('problem_id, tag_ids')
          .eq('type', ssotKey),
      ]);

      if (cancelled) return;

      // 챕터 트리
      if (treeRes.data?.value) {
        setChapterTree(treeRes.data.value as SsotChapterTree);
      } else {
        setChapterTree(null);
      }

      // 단원별 문제 개수 (해당 과목)
      if (countsRes.data?.value) {
        const allCounts = countsRes.data.value as Record<string, Record<string, ChapterCountEntry>>;
        setChapterCounts(allCounts[selectedSubject!] || null);
      } else {
        setChapterCounts(null);
      }

      // problem_tags → 대단원 매핑 (tag_ids[0] = 대단원 id)
      const tagMap = new Map<string, string>();
      if (tagsRes.data) {
        for (const row of tagsRes.data) {
          if (row.tag_ids && row.tag_ids.length > 0) {
            tagMap.set(row.problem_id, row.tag_ids[0]);
          }
        }
      }
      setProblemTagMap(tagMap);
    }

    fetchChapterData();
    return () => { cancelled = true; };
  }, [selectedSubject]);

  // 연도 계산
  const currentYear = new Date().getFullYear();
  const recent5Start = currentYear - 5;
  const recent5End = currentYear - 1;
  const allStart = Math.min(...Object.values(EXAM_DATA_YEAR_RANGE).map(r => r.start));
  const allEnd = Math.max(...Object.values(EXAM_DATA_YEAR_RANGE).map(r => r.end));

  // 선택된 과목 + 턴에 대한 복습 현황
  const reviewStats = useMemo(() => {
    if (!stats || !selectedSubject) return null;
    return stats.getReviewStats(selectedSubject, selectedTurn);
  }, [stats, selectedSubject, selectedTurn]);

  // 대단원별 학습 진행 현황 (실제 데이터)
  const chapterProgressList = useMemo<ChapterProgress[]>(() => {
    if (!stats || !selectedSubject || !chapterTree || !chapterCounts) return [];
    return stats.getChapterProgress(selectedSubject, chapterTree, chapterCounts, problemTagMap);
  }, [stats, selectedSubject, chapterTree, chapterCounts, problemTagMap]);

  // 학습 분석 코멘트 (실제 데이터 기반 자동 생성)
  const chapterComment = useMemo(() => {
    if (chapterProgressList.length === 0) return '';

    const withSolved = chapterProgressList.filter(c => c.solved > 0);
    if (withSolved.length === 0) {
      return '아직 풀이 기록이 없습니다. 기출문제를 풀어보세요!';
    }

    // 가장 많이 푼 단원
    const mostSolved = [...withSolved].sort((a, b) => b.solved - a.solved)[0];
    // 정답률이 가장 낮은 단원 (2문제 이상 풀이)
    const lowAccuracy = [...withSolved]
      .filter(c => c.solved >= 2)
      .sort((a, b) => a.accuracy - b.accuracy)[0];
    // 아직 안 푼 단원 중 첫 번째
    const unstudied = chapterProgressList.find(c => c.solved === 0 && c.total > 0);

    let comment = `<b>${mostSolved.chapter}</b> 단원을 가장 많이 학습했어요 (${mostSolved.solved}문제).`;

    if (lowAccuracy && lowAccuracy.chapterId !== mostSolved.chapterId) {
      comment += ` <b>${lowAccuracy.chapter}</b> 단원은 정답률이 ${lowAccuracy.accuracy}%로 복습이 필요합니다.`;
    } else if (unstudied) {
      comment += ` <b>${unstudied.chapter}</b> 단원은 아직 학습하지 않았으니 도전해보세요!`;
    }

    return comment;
  }, [chapterProgressList]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 flex items-center justify-between px-4 shrink-0 bg-white">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">내 학습 현황</h1>
        <div className="flex">
          {[1, 2, 3].map((turn, i) => (
            <button
              key={turn}
              onClick={() => setSelectedTurn(turn)}
              className={`
                px-3 py-1.5 text-xs font-medium transition-colors border border-gray-200
                ${i === 0 ? 'rounded-l-lg' : ''}
                ${i === 2 ? 'rounded-r-lg' : ''}
                ${i > 0 ? '-ml-px' : ''}
                ${selectedTurn === turn
                  ? 'bg-[#FF00A1] text-white border-[#FF00A1] z-10 relative'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
                }
              `}
            >
              {turn}턴
            </button>
          ))}
        </div>
      </div>

      {/* 관심 과목 선택 (고정 영역) */}
      {interestSubjectIds.length > 0 && (
        <div className="flex px-4 pb-3 pt-2 shrink-0 bg-white border-b border-[var(--border)]">
          {interestSubjectIds.map((subjectId, i) => (
            <button
              key={subjectId}
              onClick={() => setSelectedSubject(subjectId)}
              className={`
                flex-1 py-3 text-sm font-semibold transition-all border border-gray-200
                ${i === 0 ? 'rounded-l-lg' : ''}
                ${i === interestSubjectIds.length - 1 ? 'rounded-r-lg' : ''}
                ${i > 0 ? '-ml-px' : ''}
                ${selectedSubject === subjectId
                  ? 'bg-[#FF00A1] text-white border-[#FF00A1] shadow-inner z-10 relative'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
                }
              `}
            >
              {getSubjectLabel(subjectId) || subjectId}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* 7일 캘린더 (월~일 고정) */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center justify-end mb-3">
            <Link
              href="/my/calendar"
              className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-[#FF00A1] transition-colors"
            >
              상세보기
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const today = new Date();
              const todayDay = today.getDay(); // 0=일 ~ 6=토
              // 이번 주 월요일 계산 (월=1)
              const monday = new Date(today);
              const diff = todayDay === 0 ? -6 : 1 - todayDay;
              monday.setDate(today.getDate() + diff);

              const dayNames = ['월', '화', '수', '목', '금', '토', '일'];

              return dayNames.map((dayName, i) => {
                const date = new Date(monday);
                date.setDate(monday.getDate() + i);
                const dateStr = date.toISOString().slice(0, 10);
                const todayStr = today.toISOString().slice(0, 10);
                const isToday = dateStr === todayStr;
                const count = weeklyCounts[dateStr] || 0;
                const isSaturday = i === 5;
                const isSunday = i === 6;

                const dayColor = isSaturday ? 'text-blue-500' : isSunday ? 'text-red-500' : 'text-gray-400';

                return (
                  <div
                    key={dateStr}
                    className={`
                      flex flex-col items-center gap-1 py-2 rounded-lg
                      ${isToday ? 'border-2 border-[#FF00A1]' : ''}
                    `}
                  >
                    <span className={`text-[11px] font-medium ${dayColor}`}>
                      {dayName}
                    </span>
                    <span className={`text-lg font-bold ${isSaturday ? 'text-blue-500' : isSunday ? 'text-red-500' : 'text-gray-700'}`}>
                      {date.getDate()}
                    </span>
                    <span className={`
                      text-[11px] font-medium
                      ${count > 0 ? 'text-[var(--foreground)]' : 'text-red-400'}
                    `}>
                      {count > 0 ? `${count}문제` : dateStr < todayStr ? 'x' : isToday ? '-' : ''}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* 기출문제 복습현황 */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '이번년도', sub: `${currentYear}`, completed: reviewStats?.thisYear.completed ?? 0, total: reviewStats?.thisYear.total ?? 0 },
              { label: '지난 3개년', sub: `${currentYear - 3}~${currentYear - 1}`, completed: reviewStats?.recent3.completed ?? 0, total: reviewStats?.recent3.total ?? 0 },
              { label: '지난 5개년', sub: `${recent5Start}~${recent5End}`, completed: reviewStats?.recent5.completed ?? 0, total: reviewStats?.recent5.total ?? 0 },
              { label: '전체 기출문제', sub: `${allStart}~${allEnd}`, completed: reviewStats?.all.completed ?? 0, total: reviewStats?.all.total ?? 0 },
            ].map(({ label, sub, completed, total }) => {
              const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
              const radius = 54;
              const circumference = 2 * Math.PI * radius;
              const offset = circumference - (circumference * percent) / 100;

              return (
                <div key={label} className="flex flex-col items-center gap-2">
                  <svg width="140" height="140" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r={radius} fill="none" stroke="#FFF0F7" strokeWidth="10" />
                    <circle
                      cx="70" cy="70" r={radius} fill="none"
                      stroke={percent === 100 ? '#4ade80' : '#FF00A1'}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      transform="rotate(-90 70 70)"
                      className="transition-all duration-500"
                    />
                    <text x="70" y="66" textAnchor="middle" dominantBaseline="central" className="font-bold fill-[var(--foreground)]" style={{ fontSize: '24px' }}>
                      {percent}%
                    </text>
                    <text x="70" y="88" textAnchor="middle" dominantBaseline="central" className="fill-gray-400" style={{ fontSize: '13px' }}>
                      {completed}/{total}
                    </text>
                  </svg>
                  <div className="text-center">
                    <span className="text-xs font-medium text-gray-700 block">{label}</span>
                    {sub && <span className="text-[11px] text-gray-400">{sub}</span>}
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

          {selectedSubject ? (
            <div>
              {chapterComment && (
                <p
                  className="text-sm text-gray-600 leading-relaxed mb-3"
                  dangerouslySetInnerHTML={{ __html: chapterComment }}
                />
              )}
              <div className="space-y-2">
                {chapterProgressList.map((item) => {
                  const progressPercent = item.total > 0 ? Math.round((item.solved / item.total) * 100) : 0;
                  return (
                    <div key={item.chapterId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 truncate flex-1 mr-2">
                          <span className="text-gray-700 truncate">{item.chapter}</span>
                          <button
                            onClick={() => setShowTodayProblem(true)}
                            className="shrink-0 hover:opacity-70 transition-opacity cursor-pointer"
                            title="오늘의 문제"
                          >
                            <Image src="/images/flash-card.png" alt="오늘의 문제" width={14} height={14} />
                          </button>
                        </div>
                        <span className="text-gray-500 whitespace-nowrap">
                          {item.solved}/{item.total} · 정답률 {item.accuracy}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF00A1] rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 py-8 text-center">
              관심 과목을 설정해주세요.
            </div>
          )}

          <Link
            href="/my/by-chapter"
            className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-[#FF00A1] transition-colors pt-4 mt-4 border-t border-gray-100"
          >
            상세보기
            <ChevronRight className="w-4 h-4" />
          </Link>
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

          <Link
            href="/my/by-difficulty"
            className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-[#FF00A1] transition-colors pt-2 border-t border-gray-100"
          >
            상세보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 시험별 학습 현황 */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-[#FF00A1]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">시험별 학습 현황</h2>
          </div>

          {/* TODO: 시험별 학습 현황 내용 추가 */}
          <div className="text-sm text-gray-400 py-8 text-center">
            준비 중
          </div>

          <Link
            href="/my/by-exam"
            className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-[#FF00A1] transition-colors pt-2 border-t border-gray-100"
          >
            상세보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 과목별 기출문제 TIP */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-[#FF00A1]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">과목별 기출문제 TIP</h2>
          </div>

          <div className="text-sm text-gray-400 py-8 text-center">
            준비 중
          </div>

          {/* TODO: 과목별 기출문제 TIP 내용 추가
          {selectedSubject ? (
            <p
              className="text-sm text-gray-600 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: chapterAnalysis[selectedSubject] || '분석 데이터를 준비 중입니다.'
              }}
            />
          ) : (
            <div className="text-sm text-gray-400 py-8 text-center">
              관심 과목을 설정해주세요.
            </div>
          )}
          */}
        </div>
      </div>

      <TodayProblemDialog open={showTodayProblem} onOpenChange={setShowTodayProblem} />
    </div>
  );
}
