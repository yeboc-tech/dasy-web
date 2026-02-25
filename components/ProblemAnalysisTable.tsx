'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/auth-context';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';
import { getMyProblemAnalysis, ProblemAnalysis, ProblemAnalysisBySubject, fetchProblemById } from '@/lib/api/SupabaseRpc';
import { useSelectedSubjectStore } from '@/lib/zustand/selectedSubjectStore';
import { OneProblemSolverDialog } from '@/components/OneProblemSolverDialog';
import { HelpTooltip } from '@/components/HelpTooltip';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays <= 6) return `${diffDays}일전`;
  if (diffDays <= 13) return '1주전';
  if (diffDays <= 20) return '2주전';
  if (diffDays <= 27) return '3주전';
  const months = Math.floor(diffDays / 30);
  return months <= 0 ? '1달전' : `${months}달전`;
}

interface ProblemAnalysisTableProps {
  title: string;
  filterFn?: (items: ProblemAnalysis[]) => ProblemAnalysis[];
  emptyMessage?: string;
  showReport?: boolean;
}

export function ProblemAnalysisTable({ title, filterFn, emptyMessage, showReport = true }: ProblemAnalysisTableProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [dataBySubject, setDataBySubject] = useState<ProblemAnalysisBySubject | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const { selectedSubject, setSelectedSubject } = useSelectedSubjectStore();

  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveProblemId, setResolveProblemId] = useState<string | null>(null);

  const [allChapterPaths, setAllChapterPaths] = useState<string[]>([]);

  const { interestSubjectIds, loading: settingsLoading, fetchSettings } = useUserAppSettingStore();

  useEffect(() => {
    if (!authLoading && user) {
      fetchSettings(user.id);
    }
  }, [user, authLoading, fetchSettings]);

  useEffect(() => {
    if (interestSubjectIds.length > 0 && !selectedSubject) {
      setSelectedSubject(interestSubjectIds[0]);
    }
  }, [interestSubjectIds, selectedSubject]);

  useEffect(() => {
    async function fetchAllChapters() {
      if (!selectedSubject) return;
      const supabase = createClient();
      const { data: tagData } = await supabase
        .from('problem_tags')
        .select('tag_labels, problem_id')
        .eq('type', `단원_사회탐구_${selectedSubject}`)
        .order('problem_id');

      if (tagData) {
        const seen = new Set<string>();
        const paths: string[] = [];
        for (const row of tagData) {
          const key = (row.tag_labels as string[]).join(' > ');
          if (!seen.has(key)) {
            seen.add(key);
            paths.push(key);
          }
        }
        setAllChapterPaths(paths);
      }
    }
    fetchAllChapters();
  }, [selectedSubject]);

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setDataLoading(false);
        return;
      }

      const { data: result, error } = await getMyProblemAnalysis();

      if (error) {
        console.error('Error fetching problem analysis:', error);
      } else {
        setDataBySubject(result);
      }
      setDataLoading(false);
    }

    if (!authLoading && user) {
      fetchData();
    }
  }, [user, authLoading]);

  const data = useMemo(() => {
    if (!dataBySubject || !selectedSubject) return [];
    const items = dataBySubject.get(selectedSubject) || [];
    const sorted = [...items].sort((a, b) => {
      if (!a.lastSolvedAt && !b.lastSolvedAt) return 0;
      if (!a.lastSolvedAt) return 1;
      if (!b.lastSolvedAt) return -1;
      return b.lastSolvedAt.localeCompare(a.lastSolvedAt);
    });
    return filterFn ? filterFn(sorted) : sorted;
  }, [dataBySubject, selectedSubject, filterFn]);

  const stats = useMemo(() => {
    const totalProblems = data.length;
    const totalAttempts = data.reduce((sum, item) => sum + item.solveCount, 0);
    const correctCount = data.filter((item) => item.oxRecord.slice(-1) === 'O').length;
    const wrongCount = totalProblems - correctCount;
    const overallAccuracy = totalProblems > 0 ? Math.round((correctCount / totalProblems) * 100) : 0;

    const difficultyDistribution = data.reduce((acc, item) => {
      const key = item.difficulty || '미분류';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chapterMap: Record<string, { total: number; wrong: number }> = {};
    data.forEach((item) => {
      if (item.tags) {
        const key = item.tags.join(' > ');
        if (!chapterMap[key]) chapterMap[key] = { total: 0, wrong: 0 };
        chapterMap[key].total += 1;
        if (item.oxRecord.slice(-1) === 'X') chapterMap[key].wrong += 1;
      }
    });

    const mostSolved = Object.entries(chapterMap)
      .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))
      .slice(0, 3);

    const mostWrong = Object.entries(chapterMap)
      .filter(([, s]) => s.wrong > 0)
      .sort((a, b) => b[1].wrong - a[1].wrong || a[0].localeCompare(b[0]))
      .slice(0, 3);

    return {
      totalProblems,
      totalAttempts,
      correctCount,
      wrongCount,
      overallAccuracy,
      difficultyDistribution,
      mostSolved,
      mostWrong,
      solvedChapterKeys: new Set(Object.keys(chapterMap)),
    };
  }, [data]);

  const unstudiedChapters = useMemo(() => {
    return allChapterPaths
      .filter((path) => !stats.solvedChapterKeys.has(path))
      .sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }))
      .slice(0, 3);
  }, [allChapterPaths, stats.solvedChapterKeys]);

  const fetchResolveProblem = useCallback(async () => {
    if (!resolveProblemId) return { data: null, error: new Error('문제 ID가 없습니다.') };
    return fetchProblemById(resolveProblemId);
  }, [resolveProblemId]);

  const resolveSessionId = useCallback(() => {
    const today = new Date();
    return `resolve-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  const loading = authLoading || settingsLoading || dataLoading;

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader className="animate-spin w-6 h-6 text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">로그인이 필요합니다.</p>
        <button
          onClick={() => router.push('/auth/signin')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          로그인하기
        </button>
      </div>
    );
  }

  if (interestSubjectIds.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">관심 과목을 설정해주세요.</p>
        <button
          onClick={() => router.push('/settings/subjects')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          앱 설정에서 설정하기
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-end gap-2">
          <h1 className="text-lg font-semibold leading-none text-[var(--foreground)]">{title}</h1>
        </div>
      </div>

      {/* 과목 탭 */}
      <div className="flex gap-1 px-4 pt-3 pb-2 bg-white border-b border-[var(--border)]">
        {interestSubjectIds.map((subjectName) => (
          <button
            key={subjectName}
            onClick={() => setSelectedSubject(subjectName)}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${selectedSubject === subjectName
                ? 'bg-[#FF00A1] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {subjectName}
          </button>
        ))}
      </div>

      {/* 전체 레포트 */}
      {showReport && data.length > 0 && (
        <div className="p-4 border-b border-[var(--border)] bg-white space-y-6">
          {/* 풀이 통계 */}
          <div>
            <h2 className="text-sm font-medium text-[var(--foreground)] mb-3">풀이 통계</h2>
            <div className="flex gap-6">
              <div className="flex flex-col items-center">
                <span className="text-xs text-[var(--gray-500)] flex items-center gap-1">
                  풀이 횟수
                  <HelpTooltip>
                    문제를 푼 총 횟수입니다.<br />
                    같은 문제를 2번 풀면 2회로 집계됩니다.
                  </HelpTooltip>
                </span>
                <span className="text-xl font-semibold text-[var(--foreground)]">{stats.totalAttempts}회</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-[var(--gray-500)] flex items-center gap-1">
                  푼 문제 수
                  <HelpTooltip>
                    풀어본 고유 문제의 개수입니다.<br />
                    같은 문제를 여러 번 풀어도 1개로 집계됩니다.
                  </HelpTooltip>
                </span>
                <span className="text-xl font-semibold text-[var(--foreground)]">{stats.totalProblems}개</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-[var(--gray-500)] flex items-center gap-1">
                  전체 정답률
                  <HelpTooltip>
                    각 문제의 가장 최근 풀이 결과를 기준으로 계산합니다.<br />
                    최근에 모두 맞혔다면 100%가 됩니다.
                  </HelpTooltip>
                </span>
                <span className="text-xl font-semibold text-[var(--foreground)]">{stats.overallAccuracy}%</span>
              </div>
            </div>
          </div>


          {/* 난이도별 분포 바 차트 */}
          {Object.keys(stats.difficultyDistribution).length > 0 && (() => {
            const difficultyOrder = ['하', '중하', '중', '중상', '상', '최상'];
            const maxCount = Math.max(...difficultyOrder.map((d) => stats.difficultyDistribution[d] || 0), 1);
            return (
              <div>
                <h2 className="text-sm font-medium text-[var(--foreground)] mb-3">난이도별 분포</h2>
                <div className="flex items-end gap-3" style={{ width: 200, height: 100 }}>
                  {difficultyOrder.map((difficulty) => {
                    const count = stats.difficultyDistribution[difficulty] || 0;
                    const heightPercent = (count / maxCount) * 100;
                    return (
                      <div key={difficulty} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-xs font-semibold text-[var(--foreground)]">{count}</span>
                        <div
                          className="w-full rounded-t-md bg-[#FF00A1] min-h-[2px]"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-xs text-[var(--gray-500)] mt-1">{difficulty}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 단원별 분포 */}
          <div>
            <h2 className="text-sm font-medium text-[var(--foreground)] mb-3">단원별 분포</h2>
            <div className="grid grid-cols-3">
              <div className="pr-5">
                <h3 className="text-xs font-medium text-blue-600 mb-2">많이 푼 단원</h3>
                {stats.mostSolved.length > 0 ? (
                  <div className="space-y-1.5">
                    {stats.mostSolved.map(([name, s]) => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 truncate">{name}</span>
                        <span className="text-xs font-semibold text-gray-600 shrink-0">{s.total}개</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">데이터가 없습니다.</p>
                )}
              </div>
              <div className="px-5 border-l border-gray-200">
                <h3 className="text-xs font-medium text-red-600 mb-2">오답이 많은 단원</h3>
                {stats.mostWrong.length > 0 ? (
                  <div className="space-y-1.5">
                    {stats.mostWrong.map(([name, s]) => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 truncate">{name}</span>
                        <span className="text-xs font-semibold text-gray-600 shrink-0">{s.wrong}개</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">데이터가 없습니다.</p>
                )}
              </div>
              <div className="pl-5 border-l border-gray-200">
                <h3 className="text-xs font-medium text-yellow-600 mb-2">학습이 필요한 단원</h3>
                {unstudiedChapters.length > 0 ? (
                  <div className="space-y-1.5">
                    {unstudiedChapters.map((name) => (
                      <div key={name}>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">모든 단원을 학습했습니다!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">
            {emptyMessage || (selectedSubject ? `${selectedSubject} 과목의 풀이 기록이 없습니다.` : '풀이 기록이 없습니다.')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--gray-50)] shadow-[0_1px_0_var(--border)]">
              <tr>
                <th className="h-10 px-4 text-left align-middle font-medium text-[var(--foreground)] whitespace-nowrap">
                  문제 ID
                </th>
                <th className="h-10 px-4 text-left align-middle font-medium text-[var(--foreground)] whitespace-nowrap">
                  단원
                </th>
                <th className="h-10 px-4 text-center align-middle font-medium text-[var(--foreground)] whitespace-nowrap">
                  푼 횟수
                </th>
                <th className="h-10 px-4 text-left align-middle font-medium text-[var(--foreground)] whitespace-nowrap w-[120px] min-w-[120px]">
                  결과
                </th>
                <th className="h-10 px-4 text-center align-middle font-medium text-[var(--foreground)] whitespace-nowrap">
                  경과
                </th>
                <th className="h-10 px-4 text-center align-middle font-medium text-[var(--foreground)] whitespace-nowrap">
                  마지막 풀이
                </th>
                <th className="h-10 px-4 text-center align-middle font-medium text-[var(--foreground)] whitespace-nowrap">
                  정답률
                </th>
                <th className="h-10 px-4 text-center align-middle font-medium text-[var(--foreground)] whitespace-nowrap">
                  난이도
                </th>
                <th className="h-10 px-4 text-center align-middle font-medium text-[var(--foreground)] whitespace-nowrap">
                  배점
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr
                  key={item.problemId}
                  className="hover:bg-gray-50 transition-colors border-b border-[var(--border)]"
                >
                  <td className="p-4 align-middle font-mono text-xs">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="cursor-pointer hover:text-[#FF00A1] transition-colors"
                          onClick={() => {
                            setResolveProblemId(item.problemId);
                            setResolveDialogOpen(true);
                          }}
                        >
                          {item.problemId}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4} className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-md">클릭하여 다시 풀기</TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="p-4 align-middle">
                    {item.tags ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {item.tags.join(' > ')}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-4 align-middle text-center">
                    {item.solveCount}
                  </td>
                  <td className="p-4 align-middle text-left font-mono w-[120px] min-w-[120px]">
                    {item.oxRecord.split('').map((char, idx) => (
                      <span
                        key={idx}
                        className={char === 'O' ? 'text-green-600' : 'text-red-600'}
                      >
                        {char}
                      </span>
                    ))}
                  </td>
                  <td className="p-4 align-middle text-center text-xs text-[var(--gray-500)] whitespace-nowrap">
                    {getRelativeTime(item.lastSolvedAt)}
                  </td>
                  <td className="p-4 align-middle text-center text-xs text-[var(--gray-500)] whitespace-nowrap">
                    {item.lastSolvedAt ? item.lastSolvedAt.slice(0, 10) : '-'}
                  </td>
                  <td className="p-4 align-middle text-center">
                    {item.accuracyRate ? `${item.accuracyRate}%` : '-'}
                  </td>
                  <td className="p-4 align-middle text-center">
                    {item.difficulty || '-'}
                  </td>
                  <td className="p-4 align-middle text-center">
                    {item.score || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* 다시 풀기 다이얼로그 */}
      {resolveProblemId && (
        <OneProblemSolverDialog
          open={resolveDialogOpen}
          onOpenChange={setResolveDialogOpen}
          mode="resolve"
          title="다시 풀기"
          fetchProblem={fetchResolveProblem}
          getSessionId={resolveSessionId}
        />
      )}
    </div>
  );
}
