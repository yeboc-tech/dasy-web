'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface OMRSheetProps {
  problemCount: number;
  answers: {[problemNumber: number]: number};
  onAnswerChange: (problemNumber: number, answer: number) => void;
  onAutoGrade?: () => void;
  gradingResults?: {[problemNumber: number]: { isCorrect: boolean; correctAnswer: number }} | null;
}

export function OMRSheet({ problemCount, answers, onAnswerChange, onAutoGrade, gradingResults }: OMRSheetProps) {
  const handleAnswerSelect = (problemNumber: number, answer: number) => {
    onAnswerChange(problemNumber, answer);
  };

  return (
    <div className="h-full bg-[#f5f1e8] flex flex-col">
      {/* Auto Grade Button at Top - Static */}
      {onAutoGrade && (
        <div className="h-9 bg-[#FF00A1] flex items-center">
          <Button
            onClick={onAutoGrade}
            className="w-full h-full m-0 text-white border-0 rounded-none"
            style={{ backgroundColor: '#FF00A1' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E6009A'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF00A1'}
            size="sm"
          >
            자동 채점
          </Button>
        </div>
      )}

      {/* Dividing Line */}
      <div className="border-t-2 border-black"></div>

      {/* OMR Card Header - Sticky */}
      <div className="sticky top-0 z-10 bg-[#f5f1e8]">
        <div className="border-2 border-black border-t-0" style={{ gridTemplateColumns: '50px 1fr' }}>
          <div className="grid" style={{ gridTemplateColumns: '50px 1fr' }}>
            <div className="bg-[#e8dcc0] border-r-2 border-black px-2 py-3 text-center text-sm text-black">
              문번
            </div>
            <div className="bg-[#e8dcc0] px-2 py-3 text-center text-sm text-black">
              답란
            </div>
          </div>
        </div>
      </div>

      {/* OMR Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="border-l-2 border-r-2 border-b-2 border-black border-t-0">
          {Array.from({ length: problemCount }, (_, i) => {
            const problemNumber = i + 1;
            const selectedAnswer = answers[problemNumber];
            const gradingResult = gradingResults?.[problemNumber];
            const isWrongAnswer = gradingResult && !gradingResult.isCorrect;

            // Add horizontal lines every 5 problems
            const showHorizontalLine = problemNumber % 5 === 0 && problemNumber !== problemCount;

            return (
              <div key={problemNumber}>
                <div
                  className={`grid min-h-[40px] ${isWrongAnswer ? 'bg-red-50' : ''}`}
                  style={{ gridTemplateColumns: '50px 1fr' }}
                >
                  {/* Problem Number */}
                  <div className={`${isWrongAnswer ? 'bg-red-100' : 'bg-[#e8dcc0]'} border-r-2 border-black px-2 py-2 text-center text-sm text-black flex items-center justify-center`}>
                    {problemNumber}
                  </div>

                  {/* Answer Options */}
                  <div className={`${isWrongAnswer ? 'bg-red-50' : 'bg-[#f5f1e8]'} px-2 py-2 flex items-center justify-center`}>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((option) => {
                        const isCorrectAnswer = gradingResult && option === gradingResult.correctAnswer;
                        const isSelectedAnswer = selectedAnswer === option;

                        return (
                          <button
                            key={option}
                            onClick={() => handleAnswerSelect(problemNumber, option)}
                            className={`
                              w-5 h-8 border-2 rounded-full flex items-center justify-center text-xs cursor-pointer
                              ${isSelectedAnswer
                                ? 'bg-black text-white border-black'
                                : isCorrectAnswer && isWrongAnswer
                                ? 'bg-red-100 text-red-600 border-red-400'
                                : 'bg-[#f5f1e8] text-[#ff69b4] border-[#ff69b4]'
                              }
                            `}
                            title={`문제 ${problemNumber}번 - ${option}번 선택`}
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
                  <div className="border-t-2 border-black"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}