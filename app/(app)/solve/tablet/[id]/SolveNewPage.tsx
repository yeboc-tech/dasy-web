'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
/* eslint-disable @next/next/no-img-element */
import { ChevronLeft, ChevronRight, Loader, Clock, ListOrdered, Check } from 'lucide-react';
import { OMRSheet } from '@/components/solve/OMRSheet';
import { ExamTimer } from '@/components/solve/ExamTimer';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CustomButton } from '@/components/custom-button';
import { createClient } from '@/lib/supabase/client';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';
import { TimeLimitCalculator } from '@/lib/entity/TimeLimitCalculator';
import { getProblemImageUrl } from '@/lib/utils/s3Utils';
import { getEditedContents } from '@/lib/supabase/services/clientServices';
import { toast } from 'sonner';

interface WorksheetData {
  id: string;
  title: string;
  author: string;
  selected_problem_ids: string[];
  created_at: string;
  custom_time_limit_s?: number | null;
}

export function SolveNewPage() {
  const params = useParams();
  const router = useRouter();
  const worksheetId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [worksheet, setWorksheet] = useState<WorksheetData | null>(null);
  const [answers, setAnswers] = useState<{[problemNumber: number]: number}>({});
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Solve mode states
  const [solveMode, setSolveMode] = useState<'all' | 'partial'>('all');
  const [selectedProblemIndices, setSelectedProblemIndices] = useState<Set<number>>(new Set());

  // Timer states
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [isExamStarted, setIsExamStarted] = useState(false);

  // Session states
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [maxScore, setMaxScore] = useState<number>(0);
  const [problemIdsToSolve, setProblemIdsToSolve] = useState<string[]>([]);
  const [sortedSelectedIndices, setSortedSelectedIndices] = useState<number[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const sessionCreatingRef = useRef(false);

  // OMR position from store
  const { omrPosition, setOmrPosition, fetchSettings } = useUserAppSettingStore();

  // Previously solved problems
  const [solvedProblemIds, setSolvedProblemIds] = useState<Set<string>>(new Set());

  // Edited content CDN URLs (problem_id -> edited CDN URL)
  const [editedContentMap, setEditedContentMap] = useState<Map<string, string>>(new Map());

  // Load worksheet data and user settings
  useEffect(() => {
    const loadWorksheet = async () => {
      try {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          fetchSettings(user.id);

          const { data: solvedRecords } = await supabase
            .from('user_problem_solve_record')
            .select('problem_id')
            .eq('user_id', user.id);

          if (solvedRecords) {
            setSolvedProblemIds(new Set(solvedRecords.map(r => r.problem_id)));
          }
        }

        const { data, error } = await supabase
          .from('worksheets')
          .select('id, title, author, selected_problem_ids, created_at, custom_time_limit_s')
          .eq('id', worksheetId)
          .single();

        if (error || !data) {
          console.error('Error loading worksheet:', error);
          setLoading(false);
          return;
        }

        setWorksheet(data);
        setSelectedProblemIndices(new Set(data.selected_problem_ids.map((_: string, i: number) => i)));

        // Fetch edited content URLs, then preload all images
        try {
          const editedMap = await getEditedContents(data.selected_problem_ids);
          setEditedContentMap(editedMap);

          // Preload all problem images
          data.selected_problem_ids.forEach((pid: string) => {
            const img = new window.Image();
            img.src = editedMap.get(pid) || getProblemImageUrl(pid);
          });
        } catch (err) {
          console.error('Error fetching edited contents:', err);

          // Still preload originals
          data.selected_problem_ids.forEach((pid: string) => {
            const img = new window.Image();
            img.src = getProblemImageUrl(pid);
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
      }
    };

    if (worksheetId) {
      loadWorksheet();
    }
  }, [worksheetId]);

  const handleAnswerChange = (problemNumber: number, answer: number) => {
    setAnswers(prev => ({ ...prev, [problemNumber]: answer }));
  };

  const handleBack = () => {
    router.back();
  };

  const handleStartExam = async () => {
    if (sessionCreatingRef.current) return;
    sessionCreatingRef.current = true;
    setIsStarting(true);

    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('로그인이 필요합니다.');
        sessionCreatingRef.current = false;
        setIsStarting(false);
        return;
      }

      const allProblemIds = worksheet?.selected_problem_ids ?? [];
      const sortedIndices = Array.from(selectedProblemIndices).sort((a, b) => a - b);
      const selectedProblemIds = sortedIndices.map(index => allProblemIds[index]).filter(Boolean);

      const newSessionId = crypto.randomUUID();

      const { data: accuracyData, error: accuracyError } = await supabase
        .from('accuracy_rate')
        .select('problem_id, score')
        .in('problem_id', selectedProblemIds);

      if (accuracyError) console.error('Error fetching accuracy data:', accuracyError);

      const scoreMap = new Map<string, number>();
      if (accuracyData) {
        for (const item of accuracyData) scoreMap.set(item.problem_id, item.score ?? 2);
      }

      const calculatedMaxScore = selectedProblemIds.reduce((sum, pid) => sum + (scoreMap.get(pid) ?? 2), 0);

      const { error: insertError } = await supabase
        .from('solve_session_result')
        .insert({
          session_id: newSessionId,
          user_id: user.id,
          worksheet_id: worksheetId,
          max_score: calculatedMaxScore,
          total_problem_count: selectedProblemIds.length,
          total_problem_ids: selectedProblemIds,
        });

      if (insertError) {
        console.error('Error creating session:', insertError);
        toast.error('시험 세션 생성에 실패했습니다.');
        sessionCreatingRef.current = false;
        setIsStarting(false);
        return;
      }

      setSessionId(newSessionId);
      setMaxScore(calculatedMaxScore);
      setProblemIdsToSolve(selectedProblemIds);
      setSortedSelectedIndices(sortedIndices);
      setShowInstructionsDialog(false);
      setIsExamStarted(true);
      setCurrentPage(0);
    } catch (err) {
      console.error('Error starting exam:', err);
      toast.error('시험 시작 중 오류가 발생했습니다.');
    } finally {
      sessionCreatingRef.current = false;
      setIsStarting(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const handleTimeUp = () => {
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (!sessionId || !problemIdsToSolve.length) {
      toast.error('세션 정보가 없습니다.');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowSubmitDialog(false);

    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('로그인이 필요합니다.');
        setIsSubmitting(false);
        return;
      }

      const { data: accuracyData, error: accuracyError } = await supabase
        .from('accuracy_rate')
        .select('problem_id, correct_answer, score')
        .in('problem_id', problemIdsToSolve);

      if (accuracyError) console.error('Error fetching accuracy data:', accuracyError);

      const correctAnswerMap = new Map<string, number>();
      const scoreMap = new Map<string, number>();
      if (accuracyData) {
        for (const item of accuracyData) {
          correctAnswerMap.set(item.problem_id, parseInt(item.correct_answer) || 0);
          scoreMap.set(item.problem_id, item.score ?? 2);
        }
      }

      let totalScore = 0;
      let correctCount = 0;
      const records = problemIdsToSolve.map((problemId, index) => {
        const problemNumber = sortedSelectedIndices[index] + 1;
        const userAnswer = answers[problemNumber] ?? null;
        const correctAnswer = correctAnswerMap.get(problemId) ?? 0;
        const problemScore = scoreMap.get(problemId) ?? 2;
        const isCorrect = userAnswer !== null && userAnswer === correctAnswer;

        if (isCorrect) {
          correctCount++;
          totalScore += problemScore;
        }

        return {
          session_id: sessionId,
          session_index: index,
          user_id: user.id,
          problem_id: problemId,
          submit_answer: userAnswer,
        };
      });

      const { error: recordError } = await supabase
        .from('user_problem_solve_record')
        .insert(records);

      if (recordError) {
        console.error('Error inserting records:', recordError);
        toast.error('답안 저장에 실패했습니다.');
        setIsSubmitting(false);
        return;
      }

      const { error: resultError } = await supabase
        .from('solve_session_result')
        .update({ score: totalScore, correct_answer_count: correctCount })
        .eq('session_id', sessionId);

      if (resultError) {
        console.error('Error updating result:', resultError);
        toast.error('결과 저장에 실패했습니다.');
        setIsSubmitting(false);
        return;
      }

      router.push(`/solve/${worksheetId}/result?session=${sessionId}`);
    } catch (err) {
      console.error('Error submitting:', err);
      toast.error('제출 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  const getUnansweredCount = () => {
    let count = 0;
    for (const index of sortedSelectedIndices) {
      if (!answers[index + 1]) count++;
    }
    return count;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs.toString().padStart(2, '0')}초`;
  };

  const problemCount = worksheet?.selected_problem_ids?.length ?? 0;
  const actualProblemCount = selectedProblemIndices.size;
  const customTimeLimit = worksheet?.custom_time_limit_s;
  const totalTimeSeconds = TimeLimitCalculator.calculate(actualProblemCount, customTimeLimit);

  // Pagination: 2 problems per page
  const totalPages = Math.ceil(problemCount / 2);

  const leftProblemIndex = currentPage * 2;
  const rightProblemIndex = currentPage * 2 + 1;
  const leftProblemId = worksheet?.selected_problem_ids?.[leftProblemIndex];
  const rightProblemId = rightProblemIndex < problemCount ? worksheet?.selected_problem_ids?.[rightProblemIndex] : null;

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <Loader className="animate-spin w-6 h-6 text-gray-600" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-lg font-semibold text-center">제출 확인</DialogTitle>
          <div className="py-4 text-center">
            {getUnansweredCount() > 0 ? (
              <p className="text-sm text-gray-700">
                <span className="text-red-500 font-semibold">{getUnansweredCount()}개</span>의
                문제를 풀지 않았습니다.<br />
                안 푼 문제는 <span className="text-red-500 font-semibold">오답 처리</span>됩니다.
              </p>
            ) : (
              <p className="text-sm text-gray-700">모든 문제를 풀었습니다.</p>
            )}
            <p className="text-sm text-gray-500 mt-3">정말 제출하시겠습니까?</p>
          </div>
          <div className="flex gap-2">
            <CustomButton variant="outline" size="sm" className="flex-1" onClick={() => setShowSubmitDialog(false)}>
              취소
            </CustomButton>
            <CustomButton variant="primary" size="sm" className="flex-1" onClick={handleSubmit}>
              제출하기
            </CustomButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instructions Dialog */}
      <Dialog open={showInstructionsDialog} onOpenChange={setShowInstructionsDialog}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogTitle className="text-lg font-semibold text-center">시험 유의사항</DialogTitle>
          <div className="py-4">
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="text-[#FF00A1] font-medium">1.</span>
                <span>문제를 꼼꼼히 읽고 정답을 선택하세요.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#FF00A1] font-medium">2.</span>
                <span>문제 이미지 아래의 OMR에서 답안을 마킹하세요.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#FF00A1] font-medium">3.</span>
                <span>모든 문제를 풀고 나면 제출 버튼을 눌러주세요.</span>
              </li>
            </ul>

            {/* Problem Count Selection */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <ListOrdered className="w-4 h-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-700">문제 수 선택</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setSolveMode('all');
                    if (worksheet?.selected_problem_ids) {
                      setSelectedProblemIndices(new Set(worksheet.selected_problem_ids.map((_, i) => i)));
                    }
                  }}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors text-center ${
                    solveMode === 'all'
                      ? 'border-[#FF00A1] bg-[#FFF0F7] text-[#FF00A1]'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  전체문제 풀기
                  <span className="block text-xs font-normal mt-0.5 opacity-70">{problemCount}문제</span>
                </button>
                <button
                  onClick={() => {
                    setSolveMode('partial');
                    if (worksheet?.selected_problem_ids) {
                      const unsolvedIndices = new Set<number>();
                      worksheet.selected_problem_ids.forEach((problemId, i) => {
                        if (!solvedProblemIds.has(problemId)) unsolvedIndices.add(i);
                      });
                      setSelectedProblemIndices(unsolvedIndices);
                    }
                  }}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors text-center ${
                    solveMode === 'partial'
                      ? 'border-[#FF00A1] bg-[#FFF0F7] text-[#FF00A1]'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  일부문제 풀기
                  <span className="block text-xs font-normal mt-0.5 opacity-70">안 푼 문제만</span>
                </button>
              </div>

              {solveMode === 'partial' && (
                <div className="mt-3 flex gap-2">
                  {[1, 2, 3, 4, 5].map(num => {
                    const unsolvedCount = worksheet?.selected_problem_ids?.filter(id => !solvedProblemIds.has(id)).length ?? 0;
                    return (
                      <button
                        key={num}
                        onClick={() => {
                          if (worksheet?.selected_problem_ids) {
                            const unsolvedIndices: number[] = [];
                            worksheet.selected_problem_ids.forEach((problemId, i) => {
                              if (!solvedProblemIds.has(problemId)) unsolvedIndices.push(i);
                            });
                            setSelectedProblemIndices(new Set(unsolvedIndices.slice(0, num)));
                          }
                        }}
                        disabled={num > unsolvedCount}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          num > unsolvedCount
                            ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                            : selectedProblemIndices.size === num
                              ? 'border-[#FF00A1] bg-[#FF00A1] text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              )}

              {worksheet?.selected_problem_ids && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex flex-wrap gap-1.5">
                    {worksheet.selected_problem_ids.map((problemId, index) => {
                      const isSolved = solvedProblemIds.has(problemId);
                      const isSelected = selectedProblemIndices.has(index);
                      const toggleSelection = () => {
                        const newSet = new Set(selectedProblemIndices);
                        if (newSet.has(index)) newSet.delete(index);
                        else newSet.add(index);
                        setSelectedProblemIndices(newSet);
                      };
                      return (
                        <div
                          key={problemId}
                          onClick={toggleSelection}
                          className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            border: isSelected ? '1px solid #60A5FA' : '1px solid transparent',
                            backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                          }}
                        >
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: isSolved ? '#FFF0F7' : isSelected ? '#EFF6FF' : '#FFFFFF',
                              border: isSolved ? '1.5px solid #FF00A1' : isSelected ? 'none' : '1.5px solid #D1D5DB',
                            }}
                          >
                            {isSolved ? (
                              <Check className="w-2.5 h-2.5" style={{ color: '#FF00A1' }} />
                            ) : (
                              <span className="text-[9px] text-gray-400">{index + 1}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <span className="text-[#FF00A1]">●</span> 풀었던 문제 <span className="text-blue-400 ml-2">●</span> 풀 문제 · 클릭하여 선택/해제
                  </p>
                </div>
              )}
            </div>

            {/* Timer Toggle */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="timer-toggle" className="text-sm font-medium text-gray-700">타이머 사용</Label>
                </div>
                <Switch id="timer-toggle" checked={timerEnabled} onCheckedChange={setTimerEnabled} />
              </div>
              {timerEnabled && actualProblemCount > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  제한 시간: {formatTime(totalTimeSeconds)}{!customTimeLimit && ` (${actualProblemCount}문제 × 90초)`}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <CustomButton variant="outline" size="sm" className="flex-1" onClick={handleBack}>
              돌아가기
            </CustomButton>
            <CustomButton variant="primary" size="sm" className="flex-1" onClick={handleStartExam} disabled={isStarting}>
              {isStarting ? (
                <span className="flex items-center gap-2">
                  <Loader className="animate-spin w-4 h-4" />
                  준비 중...
                </span>
              ) : '시험 시작하기'}
            </CustomButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--gray-100)] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">풀기</h1>
          <span className="text-xs text-[var(--gray-500)]">{actualProblemCount}문제</span>
        </div>
        <div className="flex items-center gap-2">
          <ExamTimer
            totalSeconds={totalTimeSeconds}
            enabled={timerEnabled}
            isRunning={isExamStarted}
            onTimeUp={handleTimeUp}
          />
          <CustomButton
            variant="primary"
            size="sm"
            onClick={() => setShowSubmitDialog(true)}
            disabled={!isExamStarted || isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader className="animate-spin w-4 h-4" />
                제출 중...
              </span>
            ) : '제출하기'}
          </CustomButton>
        </div>
      </div>

      {/* Content - Two problems side by side */}
      <div className="flex-1 overflow-hidden bg-gray-100 flex flex-col">
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          {/* Left problem */}
          <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
            {leftProblemId ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
                  <span className="text-sm font-medium text-gray-700">{leftProblemIndex + 1}번</span>
                  <InlineOMR
                    problemNumber={leftProblemIndex + 1}
                    selectedAnswer={answers[leftProblemIndex + 1]}
                    onAnswerChange={handleAnswerChange}
                    disabled={!isExamStarted || (selectedProblemIndices.size > 0 && !selectedProblemIndices.has(leftProblemIndex))}
                  />
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex justify-center">
                  <ProblemImage problemId={leftProblemId} editedUrl={editedContentMap.get(leftProblemId)} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">문제 없음</div>
            )}
          </div>

          {/* Right problem */}
          <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
            {rightProblemId ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
                  <span className="text-sm font-medium text-gray-700">{rightProblemIndex + 1}번</span>
                  <InlineOMR
                    problemNumber={rightProblemIndex + 1}
                    selectedAnswer={answers[rightProblemIndex + 1]}
                    onAnswerChange={handleAnswerChange}
                    disabled={!isExamStarted || (selectedProblemIndices.size > 0 && !selectedProblemIndices.has(rightProblemIndex))}
                  />
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex justify-center">
                  <ProblemImage problemId={rightProblemId} editedUrl={editedContentMap.get(rightProblemId)} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                {problemCount % 2 === 1 && currentPage === totalPages - 1 ? '' : '문제 없음'}
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="shrink-0 flex items-center justify-center gap-1 px-4 py-3 bg-white border-t border-gray-200">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1 overflow-x-auto px-1">
            {Array.from({ length: totalPages }, (_, i) => {
              // Show which problems are on this page
              const pageLeftIdx = i * 2;
              const pageRightIdx = i * 2 + 1;
              const leftAnswered = !!answers[pageLeftIdx + 1];
              const rightAnswered = pageRightIdx < problemCount ? !!answers[pageRightIdx + 1] : true;
              const allAnswered = leftAnswered && rightAnswered;

              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`min-w-[32px] h-8 px-1 rounded-md text-sm font-medium transition-colors ${
                    currentPage === i
                      ? 'bg-[#FF00A1] text-white'
                      : allAnswered
                        ? 'bg-pink-50 text-[#FF00A1] hover:bg-pink-100'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Inline OMR - horizontal 5-choice selector */
function InlineOMR({
  problemNumber,
  selectedAnswer,
  onAnswerChange,
  disabled,
}: {
  problemNumber: number;
  selectedAnswer?: number;
  onAnswerChange: (problemNumber: number, answer: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((option) => (
        <button
          key={option}
          onClick={() => !disabled && onAnswerChange(problemNumber, option)}
          disabled={disabled}
          className={`w-7 h-7 rounded-full border text-xs font-medium transition-colors ${
            disabled
              ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
              : selectedAnswer === option
                ? 'bg-[#FF00A1] text-white border-[#FF00A1]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-[#FF00A1] cursor-pointer'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/** Problem image component with loading state */
function ProblemImage({ problemId, editedUrl }: { problemId: string; editedUrl?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imageUrl = editedUrl || getProblemImageUrl(problemId);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        이미지를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md">
      {!loaded && (
        <div className="flex items-center justify-center h-64">
          <Loader className="animate-spin w-4 h-4 text-gray-400" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={problemId}
        className={`w-full h-auto ${loaded ? '' : 'hidden'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
