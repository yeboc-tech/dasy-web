'use client';

import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';
import { useAuth } from '@/lib/contexts/auth-context';
import { fetchTodayProblem, TodayProblem } from '@/lib/api/SupabaseRpc';
import { createClient } from '@/lib/supabase/client';

interface TodayProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TodayProblemDialog({ open, onOpenChange }: TodayProblemDialogProps) {
  const { user } = useAuth();
  const { interestSubjectIds, problemRange, currentGrade, fetchSettings, initialized } = useUserAppSettingStore();

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hideToday, setHideToday] = useState(false);
  const [problem, setProblem] = useState<TodayProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // 사용자 설정 로드
  useEffect(() => {
    if (open && user) {
      // initialized 상태와 관계없이 과목이 없으면 다시 로드
      if (!initialized || interestSubjectIds.length === 0) {
        fetchSettings(user.id);
      }
    }
  }, [open, user, initialized, interestSubjectIds, fetchSettings]);

  // 문제 가져오기
  useEffect(() => {
    async function loadProblem() {
      if (!open || !initialized) {
        return;
      }

      if (interestSubjectIds.length === 0) {
        setError('앱 설정에서 학습 과목을 선택해주세요.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setSelectedAnswer(null);
      setShowResult(false);

      const { data, error: fetchError } = await fetchTodayProblem({
        interestSubjectIds,
        problemRange,
        currentGrade,
      });

      if (fetchError) {
        setError(fetchError.message);
        setProblem(null);
      } else {
        setProblem(data);
      }
      setLoading(false);
    }

    loadProblem();
  }, [open, initialized, interestSubjectIds, problemRange, currentGrade]);

  const handleSubmit = async () => {
    if (selectedAnswer === null || !problem || !user) return;

    // 풀이 기록 저장
    const supabase = createClient();
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const sessionId = `today-problem-${yy}${mm}${dd}`;

    // 오늘 이미 푼 문제 수 확인하여 session_index 결정
    const { data: existingRecords } = await supabase
      .from('solve_session_record')
      .select('session_index')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('session_index', { ascending: false })
      .limit(1);

    const nextIndex = existingRecords && existingRecords.length > 0
      ? existingRecords[0].session_index + 1
      : 0;

    await supabase
      .from('solve_session_record')
      .insert({
        session_id: sessionId,
        session_index: nextIndex,
        user_id: user.id,
        problem_id: problem.problemId,
        submit_answer: String(selectedAnswer),
      });

    setShowResult(true);
  };

  const handleConfirm = () => {
    if (hideToday) {
      localStorage.setItem('hideTodayProblem', new Date().toDateString());
    }
    onOpenChange(false);
  };

  const handleNextProblem = async () => {
    // 현재 과목 유지
    const currentSubject = problem?.subject;

    setLoading(true);
    setError(null);
    setSelectedAnswer(null);
    setShowResult(false);
    setProblem(null);

    const { data, error: fetchError } = await fetchTodayProblem({
      // 현재 과목이 있으면 그 과목만, 없으면 전체 관심 과목
      interestSubjectIds: currentSubject ? [currentSubject] : interestSubjectIds,
      problemRange,
      currentGrade,
    });

    if (fetchError) {
      setError(fetchError.message);
      setProblem(null);
    } else {
      setProblem(data);
    }
    setLoading(false);
  };

  const isCorrect = problem && selectedAnswer !== null &&
    String(selectedAnswer) === problem.correctAnswer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <div className="flex items-center justify-between">
          <DialogTitle>
            <span className="font-light">오늘의 문제</span>{problem ? ` - ${problem.subject}` : ''}
          </DialogTitle>
          {process.env.NODE_ENV === 'development' && problem && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(problem.problemId);
              }}
              className="text-xs text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
            >
              {problem.problemId}
            </button>
          )}
        </div>

        <div className="mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin w-6 h-6 text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">{error}</p>
              <button
                onClick={handleConfirm}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#FF00A1] rounded-lg hover:bg-[#E0008E] transition-colors"
              >
                닫기
              </button>
            </div>
          ) : problem ? (
            <>
              {/* 문제 정보 */}
              {(() => {
                // problemId 파싱: 과목_학년_년도_월_시험유형_번호_문제
                const parts = problem.problemId.split('_');
                const year = parts[2] || '';
                const grade = parts[1] || '';
                const month = parts[3] || '';
                const examType = parts[4] || '';

                return (
                  <div className="space-y-1 mb-3">
                    {/* 1행: 년도 - 학년 - type */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span>{year}년</span>
                      <span className="text-gray-300">·</span>
                      <span>{grade}</span>
                      <span className="text-gray-300">·</span>
                      <span>{month}월 {examType}</span>
                    </div>

                    {/* 2행: 난이도 * 점수 * 정답률 */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      {problem.difficulty && <span>{problem.difficulty}</span>}
                      {problem.difficulty && problem.score && <span className="text-gray-300">·</span>}
                      {problem.score && <span>{problem.score}점</span>}
                      {(problem.difficulty || problem.score) && problem.accuracyRate !== null && <span className="text-gray-300">·</span>}
                      {problem.accuracyRate !== null && <span>정답률 {problem.accuracyRate}%</span>}
                    </div>

                    {/* 3행: 단원 */}
                    {problem.tags && problem.tags.length > 0 && (
                      <div className="text-xs text-gray-400">
                        {problem.tags.join(' > ')}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 5지선다 */}
              {!showResult ? (
                <>
                  {/* 문제 이미지 */}
                  <div className="bg-gray-50 rounded-lg mb-4 overflow-hidden">
                    <img
                      src={problem.imageUrl}
                      alt="문제 이미지"
                      className="w-full h-auto"
                    />
                  </div>

                  <div className="flex gap-3 justify-center">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => setSelectedAnswer(num)}
                        className={`
                          w-10 h-10 rounded-full border text-sm font-medium transition-colors flex items-center justify-center
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

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={handleSubmit}
                      disabled={selectedAnswer === null}
                      className={`
                        px-4 py-2 text-sm font-medium rounded-lg transition-colors
                        ${selectedAnswer !== null
                          ? 'text-white bg-[#FF00A1] hover:bg-[#E0008E]'
                          : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        }
                      `}
                    >
                      제출
                    </button>
                  </div>
                </>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* 해설 이미지 */}
                  <div className="bg-gray-50 rounded-lg mb-4 overflow-hidden">
                    <img
                      src={problem.explanationImageUrl}
                      alt="해설 이미지"
                      className="w-full h-auto"
                    />
                  </div>

                  {/* 결과 표시 */}
                  <div className={`p-3 rounded-lg text-center ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className={`text-base font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {isCorrect ? '정답입니다!' : '오답입니다'}
                      {!isCorrect && (
                        <span className="font-normal text-gray-600 ml-2">
                          정답: {problem.correctAnswer}번
                        </span>
                      )}
                    </p>
                  </div>

                  {/* 안내 메시지 */}
                  <p className="text-xs text-gray-400 text-center mt-3">
                    내 학습기록에 저장되었습니다.
                  </p>

                  {/* 다음 문제 버튼 */}
                  <button
                    onClick={handleNextProblem}
                    className="w-full mt-4 py-2.5 text-sm font-medium text-white bg-[#FF00A1] rounded-lg hover:bg-[#E0008E] transition-colors"
                  >
                    다음문제 풀기
                  </button>
                </div>
              )}

              {/* 하단 영역 - 항상 표시 */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={hideToday}
                    onCheckedChange={(checked) => setHideToday(checked === true)}
                    className="border-gray-300"
                  />
                  <span className="text-sm text-gray-500">오늘 하루 보지 않기</span>
                </label>
                <button
                  onClick={handleConfirm}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  확인
                </button>
              </div>
            </>
          ) : null}
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
