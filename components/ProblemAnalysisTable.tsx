'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';
import { getMyProblemAnalysis, ProblemAnalysis, ProblemAnalysisBySubject, fetchProblemById } from '@/lib/api/SupabaseRpc';
import { useSelectedSubjectStore } from '@/lib/zustand/selectedSubjectStore';
import { OneProblemSolverDialog } from '@/components/OneProblemSolverDialog';
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
}

export function ProblemAnalysisTable({ title, filterFn, emptyMessage }: ProblemAnalysisTableProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [dataBySubject, setDataBySubject] = useState<ProblemAnalysisBySubject | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const { selectedSubject, setSelectedSubject } = useSelectedSubjectStore();

  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveProblemId, setResolveProblemId] = useState<string | null>(null);

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
    const allOxRecords = data.map((item) => item.oxRecord).join('');
    const correctCount = (allOxRecords.match(/O/g) || []).length;
    const wrongCount = (allOxRecords.match(/X/g) || []).length;
    const overallAccuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

    const difficultyDistribution = data.reduce((acc, item) => {
      const key = item.difficulty || '미분류';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tagDistribution = data.reduce((acc, item) => {
      if (item.tags) {
        item.tags.forEach((tag) => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
      }
      return acc;
    }, {} as Record<string, number>);
    const sortedTags = Object.entries(tagDistribution).sort((a, b) => b[1] - a[1]);

    const problemsWithScore = data.filter((item) => item.score !== null);
    const averageScore = problemsWithScore.length > 0
      ? Math.round(problemsWithScore.reduce((sum, item) => sum + (item.score || 0), 0) / problemsWithScore.length * 10) / 10
      : null;

    return {
      totalProblems,
      totalAttempts,
      correctCount,
      wrongCount,
      overallAccuracy,
      difficultyDistribution,
      sortedTags,
      averageScore,
    };
  }, [data]);

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
      {data.length > 0 && (
        <div className="p-4 border-b border-[var(--border)] bg-white space-y-6">
          {/* 풀이 통계 */}
          <div>
            <h2 className="text-sm font-medium text-[var(--foreground)] mb-3">풀이 통계</h2>
            <div className="flex gap-6">
              <div className="flex flex-col">
                <span className="text-xs text-[var(--gray-500)]">푼 문제 수</span>
                <span className="text-xl font-semibold text-[var(--foreground)]">{stats.totalProblems}개</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[var(--gray-500)]">풀이 횟수</span>
                <span className="text-xl font-semibold text-[var(--foreground)]">{stats.totalAttempts}회</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[var(--gray-500)]">전체 정답률</span>
                <span className="text-xl font-semibold text-[var(--foreground)]">{stats.overallAccuracy}%</span>
              </div>
            </div>
          </div>

          {/* 성적 관련 */}
          <div>
            <h2 className="text-sm font-medium text-[var(--foreground)] mb-3">성적</h2>
            <div className="flex gap-6">
              <div className="flex flex-col">
                <span className="text-xs text-[var(--gray-500)]">평균 배점</span>
                <span className="text-xl font-semibold text-[var(--foreground)]">
                  {stats.averageScore !== null ? `${stats.averageScore}점` : '-'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[var(--gray-500)]">맞힌 횟수</span>
                <span className="text-xl font-semibold text-green-600">{stats.correctCount}회</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[var(--gray-500)]">틀린 횟수</span>
                <span className="text-xl font-semibold text-red-600">{stats.wrongCount}회</span>
              </div>
            </div>
          </div>

          {/* 난이도별 분포 */}
          {Object.keys(stats.difficultyDistribution).length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[var(--foreground)] mb-3">난이도별 분포</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.difficultyDistribution).map(([difficulty, count]) => (
                  <div
                    key={difficulty}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg"
                  >
                    <span className="text-sm text-[var(--foreground)]">{difficulty}</span>
                    <span className="text-sm font-semibold text-[var(--gray-600)]">{count}개</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 단원별 분포 */}
          {stats.sortedTags.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[var(--foreground)] mb-3">단원별 분포</h2>
              <div className="flex flex-wrap gap-2">
                {stats.sortedTags.map(([tag, count]) => (
                  <div
                    key={tag}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg"
                  >
                    <span className="text-sm text-[var(--foreground)]">{tag}</span>
                    <span className="text-sm font-semibold text-[var(--gray-600)]">{count}개</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
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
