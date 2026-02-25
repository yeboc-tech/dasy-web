'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, ChevronRight, FileText, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';

interface SessionResult {
  session_id: string;
  worksheet_id: string;
  score: number | null;
  max_score: number;
  correct_answer_count: number | null;
  total_problem_count: number;
  created_at: string;
  worksheet?: {
    id: string;
    title: string;
  };
}

export function ProblemAnalysisByWorksheetPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      if (!user) {
        setLoading(false);
        return;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('solve_session_result')
        .select(`
          session_id,
          worksheet_id,
          score,
          max_score,
          correct_answer_count,
          total_problem_count,
          created_at,
          worksheet:worksheet_id(id, title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
      } else {
        setSessions((data as unknown as SessionResult[]) || []);
      }
      setLoading(false);
    }

    if (!authLoading) {
      fetchSessions();
    }
  }, [user, authLoading]);

  const handleSessionClick = (worksheetId: string, sessionId: string) => {
    router.push(`/solve/${worksheetId}/result?session=${sessionId}`);
  };

  if (authLoading || loading) {
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

  // Group sessions by worksheet
  const sessionsByWorksheet = sessions.reduce((acc, session) => {
    const worksheetId = session.worksheet_id;
    if (!acc[worksheetId]) {
      acc[worksheetId] = {
        worksheetId,
        worksheetTitle: (session.worksheet as { title?: string } | null)?.title || '제목 없음',
        sessions: [],
      };
    }
    acc[worksheetId].sessions.push(session);
    return acc;
  }, {} as Record<string, { worksheetId: string; worksheetTitle: string; sessions: SessionResult[] }>);

  const worksheetGroups = Object.values(sessionsByWorksheet);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-end gap-2">
          <h1 className="text-lg font-semibold leading-none text-[var(--foreground)]">학습지 별 분석</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {worksheetGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <p>풀이 기록이 없습니다.</p>
            <p className="text-sm mt-1">학습지를 풀어보세요!</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {worksheetGroups.map((group) => (
              <div key={group.worksheetId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Worksheet Header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-sm">{group.worksheetTitle}</span>
                  <span className="text-xs text-gray-400 ml-auto">{group.sessions.length}회 풀이</span>
                </div>

                {/* Sessions */}
                <div className="divide-y divide-gray-100">
                  {group.sessions.map((session, index) => {
                    const isCompleted = session.score !== null;
                    const scorePercent = isCompleted && session.max_score > 0
                      ? Math.round((session.score! / session.max_score) * 100)
                      : null;

                    return (
                      <div
                        key={session.session_id}
                        onClick={() => isCompleted && handleSessionClick(session.worksheet_id, session.session_id)}
                        className={`
                          px-4 py-3 flex items-center gap-4
                          ${isCompleted ? 'cursor-pointer hover:bg-gray-50' : 'opacity-60'}
                        `}
                      >
                        {/* Attempt Number */}
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                          {group.sessions.length - index}
                        </div>

                        {/* Date */}
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">
                            {new Date(session.created_at).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {!isCompleted && (
                            <p className="text-xs text-amber-500 mt-0.5">미완료</p>
                          )}
                        </div>

                        {/* Score */}
                        {isCompleted ? (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="w-3 h-3 text-green-600" />
                              </div>
                              <span className="text-sm text-green-600 font-medium">
                                {session.correct_answer_count}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                                <X className="w-3 h-3 text-red-600" />
                              </div>
                              <span className="text-sm text-red-600 font-medium">
                                {session.total_problem_count - (session.correct_answer_count || 0)}
                              </span>
                            </div>
                            <div className="w-16 text-right">
                              <span className={`text-lg font-bold ${scorePercent! >= 80 ? 'text-green-600' : scorePercent! >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                {scorePercent}%
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
