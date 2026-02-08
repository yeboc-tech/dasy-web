'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Loader, Check, X, Trophy, Target } from 'lucide-react';
import { CustomButton } from '@/components/custom-button';
import { createClient } from '@/lib/supabase/client';

interface SessionResult {
  session_id: string;
  user_id: string;
  worksheet_id: string;
  score: number;
  max_score: number;
  correct_answer_count: number;
  total_problem_count: number;
  total_problem_ids: string[];
  created_at: string;
}

interface SessionRecord {
  session_id: string;
  session_index: number;
  problem_id: string;
  submit_answer: number | null;
}

interface ProblemAnswer {
  problem_id: string;
  correct_answer: string;
}

export default function SolveResultPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const worksheetId = params.id as string;
  const sessionId = searchParams.get('session');

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const loadResult = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        // Load session result
        const { data: resultData, error: resultError } = await supabase
          .from('solve_session_result')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (resultError || !resultData) {
          console.error('Error loading result:', resultError);
          setLoading(false);
          return;
        }

        setResult(resultData);

        // Load session records
        const { data: recordData, error: recordError } = await supabase
          .from('solve_session_record')
          .select('session_id, session_index, problem_id, submit_answer')
          .eq('session_id', sessionId)
          .order('session_index', { ascending: true });

        if (recordError) {
          console.error('Error loading records:', recordError);
        } else {
          setRecords(recordData || []);
        }

        // Load correct answers
        const { data: answerData, error: answerError } = await supabase
          .from('accuracy_rate')
          .select('problem_id, correct_answer')
          .in('problem_id', resultData.total_problem_ids || []);

        if (answerError) {
          console.error('Error loading answers:', answerError);
        } else if (answerData) {
          const answerMap = new Map<string, number>();
          for (const item of answerData) {
            answerMap.set(item.problem_id, parseInt(item.correct_answer) || 0);
          }
          setCorrectAnswers(answerMap);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
      }
    };

    loadResult();
  }, [sessionId]);

  const handleBack = () => {
    router.push('/my-worksheets');
  };

  const handleRetry = () => {
    router.push(`/solve/${worksheetId}`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <Loader className="animate-spin w-6 h-6 text-gray-600" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white gap-4">
        <p className="text-gray-500">결과를 찾을 수 없습니다.</p>
        <CustomButton variant="outline" onClick={handleBack}>
          돌아가기
        </CustomButton>
      </div>
    );
  }

  const scorePercent = result.max_score > 0
    ? Math.round((result.score / result.max_score) * 100)
    : 0;

  const getGrade = (percent: number) => {
    if (percent >= 90) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-50' };
    if (percent >= 80) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (percent >= 70) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (percent >= 60) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { grade: 'F', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const gradeInfo = getGrade(scorePercent);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-semibold">시험 결과</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Score Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-16 h-16 rounded-full ${gradeInfo.bg} flex items-center justify-center`}>
                  <span className={`text-3xl font-bold ${gradeInfo.color}`}>
                    {gradeInfo.grade}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">점수</p>
                  <p className="text-2xl font-bold">
                    {result.score} <span className="text-base font-normal text-gray-400">/ {result.max_score}점</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-[#FF00A1]">{scorePercent}%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-green-600">정답</p>
                  <p className="text-lg font-semibold text-green-700">{result.correct_answer_count}문제</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-red-600">오답</p>
                  <p className="text-lg font-semibold text-red-700">
                    {result.total_problem_count - result.correct_answer_count}문제
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Answer Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-500" />
              문제별 결과
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {records.map((record, index) => {
                const correctAnswer = correctAnswers.get(record.problem_id);
                const isCorrect = record.submit_answer !== null && record.submit_answer === correctAnswer;
                const isUnanswered = record.submit_answer === null;

                return (
                  <div
                    key={record.session_index}
                    className={`
                      relative p-2 rounded-lg border text-center
                      ${isCorrect
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                      }
                    `}
                  >
                    <p className="text-xs text-gray-500 mb-1">{index + 1}번</p>
                    <p className={`text-sm font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {isUnanswered ? '-' : record.submit_answer}
                    </p>
                    {!isCorrect && correctAnswer && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        정답: {correctAnswer}
                      </p>
                    )}
                    <div className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                      {isCorrect ? (
                        <Check className="w-2.5 h-2.5 text-white" />
                      ) : (
                        <X className="w-2.5 h-2.5 text-white" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <CustomButton
              variant="outline"
              className="flex-1"
              onClick={handleBack}
            >
              학습지 목록으로
            </CustomButton>
            <CustomButton
              variant="primary"
              className="flex-1"
              onClick={handleRetry}
            >
              다시 풀기
            </CustomButton>
          </div>
        </div>
      </div>
    </div>
  );
}
