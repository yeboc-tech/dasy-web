'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { GradingAnimation } from '@/components/GradingAnimation';
import { useAuth } from '@/lib/contexts/auth-context';
import { TodayProblem } from '@/lib/api/SupabaseRpc';
import { createClient } from '@/lib/supabase/client';

export type ProblemMode = 'today' | 'review' | 'resolve';

interface ProblemSolverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ProblemMode;
  title: string;
  // 문제 로딩 함수 (과목 필터 옵션 지원)
  fetchProblem: (subjectFilter?: string) => Promise<{
    data: TodayProblem | null;
    error: Error | null;
  }>;
  // 오늘 하루 보지 않기 옵션 표시 여부
  showHideToday?: boolean;
  hideLocalStorageKey?: string;
  // 세션 ID 생성 함수
  getSessionId: () => string;
}

export function ProblemSolverDialog({
  open,
  onOpenChange,
  mode,
  title,
  fetchProblem,
  showHideToday = false,
  hideLocalStorageKey,
  getSessionId,
}: ProblemSolverDialogProps) {
  const { user } = useAuth();

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hideToday, setHideToday] = useState(false);
  const [problem, setProblem] = useState<TodayProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showGrading, setShowGrading] = useState(false);
  const [gradingDone, setGradingDone] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [explanationImageLoaded, setExplanationImageLoaded] = useState(false);
  const [preloadExplanation, setPreloadExplanation] = useState(false);
  const [showProblemInResult, setShowProblemInResult] = useState(false);

  // 문제 로드
  const loadProblem = useCallback(async (subjectFilter?: string) => {
    setLoading(true);
    setError(null);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowGrading(false);
    setGradingDone(false);
    setProblem(null);
    setImageLoaded(false);
    setExplanationImageLoaded(false);
    setPreloadExplanation(false);
    setShowProblemInResult(false);

    const { data, error: fetchError } = await fetchProblem(subjectFilter);

    if (fetchError) {
      setError(fetchError.message);
      setProblem(null);
    } else {
      setProblem(data);
    }
    setLoading(false);
  }, [fetchProblem]);

  // 다이얼로그 열릴 때 문제 로드
  useEffect(() => {
    if (open) {
      loadProblem();
    }
  }, [open, loadProblem]);

  const handleSubmit = async () => {
    if (selectedAnswer === null || !problem || !user) return;

    // 풀이 기록 저장
    const supabase = createClient();
    const sessionId = getSessionId();

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

    // 채점 애니메이션 + 해설 이미지 동시 로딩 시작
    setShowGrading(true);
    setPreloadExplanation(true);
  };

  const handleGradingComplete = useCallback(() => {
    setGradingDone(true);
  }, []);

  // 채점 애니메이션 완료 + 해설 이미지 로드 완료 시 결과 표시
  useEffect(() => {
    if (gradingDone && explanationImageLoaded) {
      setShowGrading(false);
      setShowResult(true);
    }
  }, [gradingDone, explanationImageLoaded]);

  const handleConfirm = () => {
    if (hideToday && showHideToday && hideLocalStorageKey) {
      localStorage.setItem(hideLocalStorageKey, new Date().toDateString());
    }
    onOpenChange(false);
  };

  const handleNextProblem = async () => {
    // 현재 과목 유지
    const currentSubject = problem?.subject;
    await loadProblem(currentSubject);
  };

  const isCorrect = problem && selectedAnswer !== null &&
    String(selectedAnswer) === problem.correctAnswer;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <div className="flex items-center justify-between">
          <DialogTitle>
            <span className="font-light">{title}</span>{problem ? ` - ${problem.subject}` : ''}
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

        <div className="mt-2 min-h-[400px] relative">
          {/* 채점 애니메이션 */}
          {/* 이미지 프리로드 (숨김) */}
          {problem && !showResult && !imageLoaded && (
            <img
              src={problem.imageUrl}
              alt=""
              className="hidden"
              onLoad={() => setImageLoaded(true)}
            />
          )}
          {problem && (preloadExplanation || showResult) && !explanationImageLoaded && (
            <img
              src={problem.explanationImageUrl}
              alt=""
              className="hidden"
              onLoad={() => setExplanationImageLoaded(true)}
            />
          )}

          {/* 로딩 상태: API 로딩 또는 이미지 로딩 (채점 중에는 표시 안함) */}
          {!showGrading && (loading || (problem && !showResult && !imageLoaded) || (problem && showResult && !explanationImageLoaded)) ? (
            <div className="flex flex-col items-center justify-center h-[380px]">
              <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#FF00A1] rounded-full animate-progress" />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {showResult ? '채점 중입니다...' : '문제를 불러오는 중...'}
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[380px]">
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
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
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

                        {/* 문제/해설 토글 스위치 (결과 뷰에서만) */}
                        {showResult && (
                          <button
                            onClick={() => setShowProblemInResult(prev => !prev)}
                            className="flex items-center gap-1.5 text-xs shrink-0 ml-3"
                          >
                            <span className={showProblemInResult ? 'text-gray-900 font-medium' : 'text-gray-400'}>문제</span>
                            <div className="relative w-8 h-[18px] rounded-full bg-gray-200 transition-colors">
                              <div
                                className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all ${
                                  showProblemInResult ? 'left-[2px]' : 'left-[14px]'
                                }`}
                              />
                            </div>
                            <span className={!showProblemInResult ? 'text-gray-900 font-medium' : 'text-gray-400'}>해설</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* 5지선다 */}
                  {!showResult ? (
                    <>
                      {/* 문제 이미지 */}
                      <div className="relative mb-4">
                        {/* 채점 애니메이션 */}
                        {showGrading && (
                          <GradingAnimation
                            isCorrect={String(selectedAnswer) === problem.correctAnswer}
                            onComplete={handleGradingComplete}
                          />
                        )}
                        <div className="bg-gray-50 rounded-lg overflow-hidden">
                          <img
                            src={problem.imageUrl}
                            alt="문제 이미지"
                            className="w-full h-auto"
                          />
                        </div>
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
                      {/* 해설/문제 이미지 */}
                      <div className="bg-gray-50 rounded-lg mb-4 overflow-hidden">
                        <img
                          src={showProblemInResult ? problem.imageUrl : problem.explanationImageUrl}
                          alt={showProblemInResult ? '문제 이미지' : '해설 이미지'}
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

                      {/* 다음 문제 버튼 (resolve 모드에서는 숨김) */}
                      {mode !== 'resolve' && (
                        <button
                          onClick={handleNextProblem}
                          className="w-full mt-4 py-2.5 text-sm font-medium text-white bg-[#FF00A1] rounded-lg hover:bg-[#E0008E] transition-colors"
                        >
                          다음문제 풀기
                        </button>
                      )}
                    </div>
                  )}

                  {/* 하단 영역 */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    {showHideToday ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={hideToday}
                          onCheckedChange={(checked) => setHideToday(checked === true)}
                          className="border-gray-300"
                        />
                        <span className="text-sm text-gray-500">오늘 하루 보지 않기</span>
                      </label>
                    ) : (
                      <div />
                    )}
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
