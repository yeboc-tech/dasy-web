'use client';

interface OMRSheetProps {
  problemCount: number;
  answers: {[problemNumber: number]: number};
  onAnswerChange: (problemNumber: number, answer: number) => void;
  gradingResults?: {[problemNumber: number]: { isCorrect: boolean; correctAnswer: number }} | null;
  problemsWithoutAnswers?: Set<number>; // Problems that can't be graded (no answer in DB)
  selectedProblemIndices?: Set<number>; // Which problems (0-indexed) are selected to solve
}

export function OMRSheet({ problemCount, answers, onAnswerChange, gradingResults, problemsWithoutAnswers, selectedProblemIndices }: OMRSheetProps) {
  const handleAnswerSelect = (problemNumber: number, answer: number) => {
    // If selectedProblemIndices is provided and this problem is not selected, do nothing
    if (selectedProblemIndices && !selectedProblemIndices.has(problemNumber - 1)) {
      return;
    }
    onAnswerChange(problemNumber, answer);
  };

  const SPACING = 12; // Consistent spacing in pixels
  const hasProblemsWithoutAnswers = problemsWithoutAnswers && problemsWithoutAnswers.size > 0;

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-300 overflow-hidden shadow-lg">
      {/* Warning banner for problems without answers */}
      {hasProblemsWithoutAnswers && (
        <div className="bg-amber-50 border-b border-amber-200 px-2 py-1.5 text-[10px] text-amber-700">
          <span className="font-medium">⚠</span> 노란색 문제는 채점 불가
        </div>
      )}

      {/* OMR Card Header - Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-300">
        <div className="grid" style={{ gridTemplateColumns: '48px 1fr' }}>
          <div className="bg-[#FFF0F7] border-r border-gray-300 px-2 py-2 text-center text-xs font-medium text-[#FF00A1]">
            문번
          </div>
          <div className="bg-[#FFF0F7] px-2 py-2 text-center text-xs font-medium text-[#FF00A1]">
            답란
          </div>
        </div>
      </div>

      {/* OMR Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {Array.from({ length: problemCount }, (_, i) => {
          const problemNumber = i + 1;
          const selectedAnswer = answers[problemNumber];
          const gradingResult = gradingResults?.[problemNumber];
          const isWrongAnswer = gradingResult && !gradingResult.isCorrect;
          const hasNoAnswer = problemsWithoutAnswers?.has(problemNumber);
          const showHorizontalLine = problemNumber % 5 === 0 && problemNumber !== problemCount;
          const isFirstRow = problemNumber === 1;
          const isLastRow = problemNumber === problemCount;

          // Check if this problem is disabled (not selected to solve)
          const isDisabled = selectedProblemIndices !== undefined && !selectedProblemIndices.has(i);

          // Determine background colors based on state
          const getNumberCellBg = () => {
            if (isDisabled) return 'bg-gray-100';
            if (hasNoAnswer) return 'bg-amber-100';
            if (isWrongAnswer) return 'bg-red-100';
            return 'bg-[#FFF0F7]';
          };
          const getAnswerCellBg = () => {
            if (isDisabled) return 'bg-gray-50';
            if (hasNoAnswer) return 'bg-amber-50';
            if (isWrongAnswer) return 'bg-red-50';
            return 'bg-white';
          };

          return (
            <div key={problemNumber}>
              <div className="grid" style={{ gridTemplateColumns: '48px 1fr' }}>
                {/* Problem Number */}
                <div className={`${getNumberCellBg()} border-r border-gray-300 flex items-center justify-center text-xs font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                  {problemNumber}
                </div>

                {/* Answer Options - Consistent spacing */}
                <div
                  className={`${getAnswerCellBg()} flex items-center`}
                  style={{
                    paddingLeft: SPACING,
                    paddingRight: SPACING,
                    paddingTop: isFirstRow ? SPACING : SPACING / 2,
                    paddingBottom: isLastRow ? SPACING : SPACING / 2,
                  }}
                >
                  <div className="flex flex-1 items-center justify-center" style={{ gap: SPACING }}>
                    {[1, 2, 3, 4, 5].map((option) => {
                      const isCorrectAnswer = gradingResult && option === gradingResult.correctAnswer;
                      const isSelectedAnswer = selectedAnswer === option;

                      return (
                        <button
                          key={option}
                          onClick={() => handleAnswerSelect(problemNumber, option)}
                          disabled={isDisabled}
                          className={`
                            w-[14px] aspect-[1/2] border rounded-full flex items-center justify-center text-[10px] transition-colors
                            ${isDisabled
                              ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                              : isSelectedAnswer
                              ? 'bg-[#FF00A1] text-white border-[#FF00A1] cursor-pointer'
                              : isCorrectAnswer && isWrongAnswer
                              ? 'bg-red-100 text-red-600 border-red-400 cursor-pointer'
                              : 'bg-white text-[#FF00A1] border-gray-300 hover:border-[#FF00A1] cursor-pointer'
                            }
                          `}
                          title={isDisabled ? `문제 ${problemNumber}번 - 비활성화됨` : `문제 ${problemNumber}번 - ${option}번 선택`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Horizontal line every 5 problems */}
              {showHorizontalLine && (
                <div className="border-t border-gray-300" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
