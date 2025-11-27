'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Loader, Trash2 } from "lucide-react";
import type { ProblemMetadata } from '@/lib/types/problems';
import { getProblemImageUrl, getAnswerImageUrl } from '@/lib/utils/s3Utils';
import { getEconomyDifficultyFromCorrectRate } from '@/lib/utils/economyDifficultySync';

interface EconomyProblemsPanelProps {
  filteredProblems: ProblemMetadata[];
  problemsLoading: boolean;
  problemsError: string | null;
  onDeleteProblem?: (problemId: string) => void;
  showAnswers?: boolean;
  editedContentsMap?: Map<string, string> | null; // Now contains CDN URLs instead of base64
}

export default function EconomyProblemsPanel({
  filteredProblems,
  problemsLoading,
  problemsError,
  onDeleteProblem,
  showAnswers = false,
  editedContentsMap
}: EconomyProblemsPanelProps) {
  // Track which CDN URLs have failed
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Loading overlay for problems */}
      {problemsLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white bg-opacity-70">
          <Loader className="animate-spin w-4 h-4" />
        </div>
      )}

      {/* Error overlay for problems */}
      {problemsError && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
          <div className="text-center text-gray-600">
            문제 데이터를 불러오는 중 오류가 발생했습니다.
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {filteredProblems.length === 0 ? (
          <div className="flex items-center justify-center min-h-full text-gray-500 text-sm">
            선택한 조건에 맞는 문제가 없습니다.
          </div>
        ) : (
          <div>
            {filteredProblems.map((problem: ProblemMetadata, index: number) => {
              const isFirst = index === 0;

              return (
                <div
                  key={problem.id}
                  className={`relative w-full p-4 pb-6 transition-all group ${
                    index < filteredProblems.length - 1 ? 'border-b border-gray-200' : ''
                  } ${isFirst ? 'rounded-tr-xl' : ''}`}
                >
                  {/* Hover overlay - covers whole section */}
                  <div className="absolute inset-0 bg-gray-500 opacity-0 group-hover:opacity-5 pointer-events-none z-[1] transition-opacity" />

                  {/* Max-width wrapper for content */}
                  <div className="max-w-[400px] mx-auto">
                    {onDeleteProblem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProblem(problem.id);
                      }}
                      className="absolute top-2 right-2 z-10 text-gray-400 hover:text-red-500 rounded-md p-1.5 transition-colors cursor-pointer"
                      title="문제 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  {/* Problem number */}
                  <div className="text-sm font-bold mb-2 relative z-[2]">
                    {index + 1}.
                  </div>

                  {/* Tags and metadata as badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3 relative z-[2]">
                    {/* Chapter tags */}
                    {problem.tags && problem.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}

                    {/* Difficulty badge - calculated from correct_rate */}
                    {problem.correct_rate !== null && problem.correct_rate !== undefined && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {getEconomyDifficultyFromCorrectRate(problem.correct_rate)}
                      </span>
                    )}

                    {/* Exam info badge (e.g., "학평 2024년 3월") */}
                    {problem.problem_type && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {problem.problem_type}
                      </span>
                    )}
                  </div>

                  {/* Problem image */}
                  <div className="relative" id={`problem-img-${problem.id}`}>
                    {(() => {
                      // Wait for editedContentsMap to be loaded (not null)
                      if (editedContentsMap === null) {
                        return (
                          <div className="flex items-center justify-center p-8">
                            <Loader className="animate-spin w-4 h-4 text-gray-400" />
                          </div>
                        );
                      }

                      // Check if there's an edited content URL for this problem
                      const editedUrl = editedContentsMap?.get(problem.id);
                      const hasFailed = failedUrls.has(problem.id);

                      // If URL failed, show error card
                      if (hasFailed) {
                        return (
                          <div className="flex items-center justify-center p-8 bg-red-50 border-2 border-dashed border-red-300 rounded-lg">
                            <div className="text-center text-red-600">
                              <div className="text-sm font-medium mb-1">이미지 로드 실패</div>
                              <div className="text-xs">편집된 콘텐츠에 문제가 있습니다</div>
                              <div className="text-xs text-red-400 mt-1">ID: {problem.id}</div>
                            </div>
                          </div>
                        );
                      }

                      // Use edited content URL from CDN if available, otherwise original CDN URL
                      const imageUrl = editedUrl || getProblemImageUrl(problem.id);

                      return (
                        <Image
                          key={problem.id}
                          src={imageUrl}
                          alt={problem.problem_filename}
                          width={800}
                          height={600}
                          className="w-full h-auto object-contain"
                          onError={(e) => {
                            console.error(`[Image Load Error] Failed to load image for ${problem.id}: ${imageUrl}`);
                            setFailedUrls(prev => new Set(prev).add(problem.id));
                          }}
                        />
                      );
                    })()}
                  </div>

                  {/* Answer image (conditional) */}
                  {showAnswers && problem.answer_filename && (() => {
                    // For economy problems, answer ID replaces _문제 with _해설
                    const answerId = problem.id.replace('_문제', '_해설');

                    return (
                      <div className="relative mt-4" id={`answer-img-${answerId}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-xs font-semibold text-gray-600">해설</div>
                        </div>
                        {(() => {
                          // Wait for editedContentsMap to be loaded (not null)
                          if (editedContentsMap === null) {
                            return (
                              <div className="flex items-center justify-center p-8">
                                <Loader className="animate-spin w-4 h-4 text-gray-400" />
                              </div>
                            );
                          }

                          // Check if there's an edited content URL for this answer
                          const editedUrl = editedContentsMap?.get(answerId);
                          const answerHasFailed = failedUrls.has(answerId);

                          // If URL failed, show error card
                          if (answerHasFailed) {
                            return (
                              <div className="flex items-center justify-center p-8 bg-red-50 border-2 border-dashed border-red-300 rounded-lg">
                                <div className="text-center text-red-600">
                                  <div className="text-sm font-medium mb-1">해설 이미지 로드 실패</div>
                                  <div className="text-xs">편집된 콘텐츠에 문제가 있습니다</div>
                                  <div className="text-xs text-red-400 mt-1">ID: {answerId}</div>
                                </div>
                              </div>
                            );
                          }

                          // Use edited content URL from CDN if available, otherwise original CDN URL
                          const imageUrl = editedUrl || getAnswerImageUrl(problem.id);

                          return (
                            <Image
                              key={answerId}
                              src={imageUrl}
                              alt={problem.answer_filename}
                              width={800}
                              height={600}
                              className="w-full h-auto object-contain"
                              onError={(e) => {
                                console.error(`[Answer Image Load Error] Failed to load answer for ${answerId}: ${imageUrl}`);
                                setFailedUrls(prev => new Set(prev).add(answerId));
                              }}
                            />
                          );
                        })()}
                      </div>
                    );
                  })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
