'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader, Trash2 } from "lucide-react";
import type { ProblemMetadata } from '@/lib/types/problems';
import { getProblemImageUrl, getAnswerImageUrl } from '@/lib/utils/s3Utils';

interface EconomyProblemsPanelProps {
  filteredProblems: ProblemMetadata[];
  problemsLoading: boolean;
  problemsError: string | null;
  onDeleteProblem?: (problemId: string) => void;
  showAnswers?: boolean;
  editedContentsMap?: Map<string, string>;
}

export default function EconomyProblemsPanel({
  filteredProblems,
  problemsLoading,
  problemsError,
  onDeleteProblem,
  showAnswers = false,
  editedContentsMap
}: EconomyProblemsPanelProps) {
  // State to hold blob URLs for edited content
  const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());
  // Track which blob URLs have failed (so we show error instead of retrying)
  const [failedBlobUrls, setFailedBlobUrls] = useState<Set<string>>(new Set());

  // Create blob URLs from edited content when editedContentsMap changes
  useEffect(() => {
    console.log(`[EconomyProblemsPanel] editedContentsMap changed, size: ${editedContentsMap?.size || 0}`);

    if (!editedContentsMap || editedContentsMap.size === 0) {
      console.log('[EconomyProblemsPanel] No edited content available');
      setBlobUrls(new Map());
      return;
    }

    const newBlobUrls = new Map<string, string>();

    editedContentsMap.forEach((base64Data, resourceId) => {
      try {
        // Convert base64 to blob
        const base64String = base64Data.startsWith('data:')
          ? base64Data.split(',')[1]
          : base64Data;

        console.log(`[Preview Edited Content] Processing ${resourceId}, base64 length: ${base64String.length}`);

        const byteCharacters = atob(base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        const blobUrl = URL.createObjectURL(blob);

        newBlobUrls.set(resourceId, blobUrl);
        console.log(`[Preview Edited Content] ✅ Created blob URL for ${resourceId}: ${blobUrl}, blob size: ${blob.size} bytes`);
      } catch (error) {
        console.error(`[Preview Edited Content] ❌ Failed to create blob URL for ${resourceId}:`, error);
      }
    });

    console.log(`[EconomyProblemsPanel] Created ${newBlobUrls.size} blob URLs`);
    setBlobUrls(newBlobUrls);

    // Cleanup function to revoke blob URLs
    return () => {
      newBlobUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [editedContentsMap]);

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

                    {/* Difficulty badge */}
                    {problem.difficulty && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {problem.difficulty}
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
                      const blobUrl = blobUrls.get(problem.id);
                      const hasFailed = failedBlobUrls.has(problem.id);
                      const usingBlob = !!blobUrl;
                      console.log(`[Image Render] ${problem.id}: using ${usingBlob ? 'BLOB' : 'CDN'}, failed=${hasFailed}`);

                      // If blob URL failed, show error card instead of image
                      if (hasFailed && usingBlob) {
                        return (
                          <div className="flex items-center justify-center p-8 bg-red-50 border-2 border-dashed border-red-300 rounded-lg">
                            <div className="text-center text-red-600">
                              <div className="text-sm font-medium mb-1">데이터베이스 이미지 로드 실패</div>
                              <div className="text-xs">편집된 콘텐츠에 문제가 있습니다</div>
                              <div className="text-xs text-red-400 mt-1">ID: {problem.id}</div>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })()}
                    {!failedBlobUrls.has(problem.id) && (
                      <Image
                        key={blobUrls.get(problem.id) || getProblemImageUrl(problem.id)}
                        src={blobUrls.get(problem.id) || getProblemImageUrl(problem.id)}
                        alt={problem.problem_filename}
                        width={800}
                        height={600}
                        className="w-full h-auto object-contain"
                        unoptimized={!!blobUrls.get(problem.id)}
                        onLoad={() => {
                          // Clear any old error messages when image loads successfully
                          const container = document.getElementById(`problem-img-${problem.id}`);
                          if (container) {
                            const errorDivs = container.querySelectorAll('.image-error-message');
                            errorDivs.forEach(div => div.remove());
                          }
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const imgSrc = target.src;
                          const isBlob = imgSrc.startsWith('blob:');

                          console.error(`[Image Load Error] Failed to load image for ${problem.id}`);
                          console.error(`[Image Load Error] Source: ${isBlob ? 'DATABASE (blob)' : 'CDN'}`);
                          console.error(`[Image Load Error] URL: ${imgSrc.substring(0, 100)}`);

                          // If this was a blob URL, mark it as failed (don't retry with CDN)
                          if (isBlob) {
                            // Hide the image immediately
                            target.style.display = 'none';
                            // Clear any old CDN error messages
                            const container = document.getElementById(`problem-img-${problem.id}`);
                            if (container) {
                              const errorDivs = container.querySelectorAll('.image-error-message');
                              errorDivs.forEach(div => div.remove());
                            }
                            // Mark as failed and let React render the error card
                            setFailedBlobUrls(prev => new Set(prev).add(problem.id));
                            return;
                          }

                          // For CDN failures, show error message
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            // Remove any existing error messages first
                            const existingErrors = parent.querySelectorAll('.image-error-message');
                            existingErrors.forEach(div => div.remove());

                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'image-error-message flex items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg';
                            errorDiv.innerHTML = `
                              <div class="text-center text-gray-500">
                                <div class="text-sm font-medium mb-1">CDN 이미지를 불러올 수 없습니다</div>
                                <div class="text-xs">네트워크 또는 CDN 설정을 확인하세요</div>
                                <div class="text-xs text-gray-400 mt-1">ID: ${problem.id}</div>
                              </div>
                            `;
                            parent.appendChild(errorDiv);
                          }
                        }}
                      />
                    )}
                  </div>

                  {/* Answer image (conditional) */}
                  {showAnswers && problem.answer_filename && (() => {
                    // For economy problems, answer ID replaces _문제 with _해설
                    const answerId = problem.id.replace('_문제', '_해설');
                    const answerBlobUrl = blobUrls.get(answerId);
                    const answerHasFailed = failedBlobUrls.has(answerId);
                    const usingAnswerBlob = !!answerBlobUrl;

                    return (
                      <div className="relative mt-4" id={`answer-img-${answerId}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-xs font-semibold text-gray-600">해설</div>
                        </div>
                        {answerHasFailed && usingAnswerBlob ? (
                          <div className="flex items-center justify-center p-8 bg-red-50 border-2 border-dashed border-red-300 rounded-lg">
                            <div className="text-center text-red-600">
                              <div className="text-sm font-medium mb-1">데이터베이스 해설 이미지 로드 실패</div>
                              <div className="text-xs">편집된 콘텐츠에 문제가 있습니다</div>
                              <div className="text-xs text-red-400 mt-1">ID: {answerId}</div>
                            </div>
                          </div>
                        ) : (
                          <Image
                            key={answerBlobUrl || getAnswerImageUrl(problem.id)}
                            src={answerBlobUrl || getAnswerImageUrl(problem.id)}
                            alt={problem.answer_filename}
                            width={800}
                            height={600}
                            className="w-full h-auto object-contain"
                            unoptimized={!!answerBlobUrl}
                            onLoad={() => {
                              // Clear any old error messages when image loads successfully
                              const container = document.getElementById(`answer-img-${answerId}`);
                              if (container) {
                                const errorDivs = container.querySelectorAll('.answer-error-message');
                                errorDivs.forEach(div => div.remove());
                              }
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const imgSrc = target.src;
                              const isBlob = imgSrc.startsWith('blob:');

                              console.error(`[Answer Image Load Error] Failed to load answer for ${answerId}`);
                              console.error(`[Answer Image Load Error] Source: ${isBlob ? 'DATABASE (blob)' : 'CDN'}`);

                              // If this was a blob URL, mark it as failed
                              if (isBlob) {
                                // Hide the image immediately
                                target.style.display = 'none';
                                // Clear any old CDN error messages
                                const container = document.getElementById(`answer-img-${answerId}`);
                                if (container) {
                                  const errorDivs = container.querySelectorAll('.answer-error-message');
                                  errorDivs.forEach(div => div.remove());
                                }
                                // Mark as failed and let React render the error card
                                setFailedBlobUrls(prev => new Set(prev).add(answerId));
                                return;
                              }

                              // For CDN failures, show error message
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                // Remove any existing error messages first
                                const existingErrors = parent.querySelectorAll('.answer-error-message');
                                existingErrors.forEach(div => div.remove());

                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'answer-error-message flex items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg';
                                errorDiv.innerHTML = `
                                  <div class="text-center text-gray-500">
                                    <div class="text-sm font-medium mb-1">CDN 해설 이미지를 불러올 수 없습니다</div>
                                    <div class="text-xs">네트워크 또는 CDN 설정을 확인하세요</div>
                                  </div>
                                `;
                                parent.appendChild(errorDiv);
                              }
                            }}
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
