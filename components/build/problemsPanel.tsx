'use client';

import React, { useMemo, useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader, Trash2 } from "lucide-react";
import type { ProblemMetadata } from '@/lib/types/problems';
import type { ChapterTreeItem } from '@/lib/types';
import { getProblemImageUrl, getAnswerImageUrl } from '@/lib/utils/s3Utils';

interface ProblemsPanelProps {
  filteredProblems: ProblemMetadata[];
  problemsLoading: boolean;
  problemsError: string | null;
  contentTree: ChapterTreeItem[];
  onDeleteProblem?: (problemId: string) => void;
  showAnswers?: boolean;
  editedContentsMap?: Map<string, string> | null;
}

// Create a lookup map for chapter data (label and parent)
interface ChapterData {
  label: string;
  parentId: string | null;
}

function createChapterLookupMap(contentTree: ChapterTreeItem[]): Map<string, ChapterData> {
  const lookupMap = new Map<string, ChapterData>();

  const traverse = (items: ChapterTreeItem[], parentId: string | null = null) => {
    for (const item of items) {
      // Keep numbering pattern like "01. ", "02. "
      lookupMap.set(item.id, {
        label: item.label,
        parentId
      });

      if (item.children) {
        traverse(item.children, item.id);
      }
    }
  };

  traverse(contentTree);
  return lookupMap;
}

// Get full chapter path from root to current chapter
function getChapterPath(chapterId: string | null, chapterMap: Map<string, ChapterData>): string[] {
  if (!chapterId) return [];

  const path: string[] = [];
  let currentId: string | null = chapterId;

  while (currentId) {
    const chapterData = chapterMap.get(currentId);
    if (!chapterData) break;

    path.unshift(chapterData.label); // Add to beginning to maintain order
    currentId = chapterData.parentId;
  }

  return path;
}

export default function ProblemsPanel({
  filteredProblems,
  problemsLoading,
  problemsError,
  contentTree,
  onDeleteProblem,
  showAnswers = false,
  editedContentsMap
}: ProblemsPanelProps) {
  // Create chapter lookup map once when contentTree changes
  const chapterLookupMap = useMemo(() => {
    return createChapterLookupMap(contentTree);
  }, [contentTree]);

  // State to hold blob URLs for edited content
  const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());

  // Create blob URLs from edited content when editedContentsMap changes
  useEffect(() => {
    console.log(`[ProblemsPanel] editedContentsMap changed, size: ${editedContentsMap?.size || 0}`);

    if (!editedContentsMap || editedContentsMap.size === 0) {
      console.log('[ProblemsPanel] No edited content available');
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
        console.error(`[Preview Edited Content] ❌ Error details:`, error instanceof Error ? error.message : String(error));
      }
    });

    console.log(`[ProblemsPanel] Created ${newBlobUrls.size} blob URLs`);
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

                  {/* Problem metadata as badges (통합사회) */}
                  <div className="flex flex-wrap gap-1.5 mb-3 relative z-[2]">
                    {/* Chapter path badges (all layers with numbering) */}
                    {getChapterPath(problem.chapter_id, chapterLookupMap).map((chapterLabel, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {chapterLabel}
                      </span>
                    ))}

                    {/* Difficulty badge */}
                    {problem.difficulty && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {problem.difficulty}
                      </span>
                    )}

                    {/* Problem type badge */}
                    {problem.problem_type && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {problem.problem_type}
                      </span>
                    )}

                    {/* Related subjects badges */}
                    {problem.related_subjects && problem.related_subjects.map((subject, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {subject}
                      </span>
                    ))}

                    {/* Correct rate badge (if available) */}
                    {problem.correct_rate !== undefined && problem.correct_rate !== null && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        정답률 {problem.correct_rate}%
                      </span>
                    )}

                    {/* Exam year badge (if available) */}
                    {problem.exam_year && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {problem.exam_year}년
                      </span>
                    )}

                    {/* Tags badges (topic-level descriptors) */}
                    {problem.tags && problem.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}

                    {/* Dev-only: Show if image is from edited_contents DB */}
                    {process.env.NODE_ENV === 'development' && blobUrls.get(problem.id) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 border border-green-300">
                        📝 DB
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Image
                      src={blobUrls.get(problem.id) || getProblemImageUrl(problem.id)}
                      alt={problem.problem_filename}
                      width={800}
                      height={600}
                      className="w-full h-auto object-contain"
                      unoptimized={!!blobUrls.get(problem.id)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        // Show error message (only once)
                        const parent = target.parentElement;
                        if (parent) {
                          // Check if error message already exists
                          const existingError = parent.querySelector('.image-error-message');
                          if (existingError) {
                            return; // Don't create duplicate error messages
                          }

                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'image-error-message flex items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg';
                          errorDiv.innerHTML = `
                            <div class="text-center text-gray-500">
                              <div class="text-sm font-medium mb-1">이미지를 불러올 수 없습니다</div>
                              <div class="text-xs">S3 설정을 확인하세요</div>
                              <div class="text-xs text-gray-400 mt-1">ID: ${problem.id}</div>
                            </div>
                          `;
                          parent.appendChild(errorDiv);
                        }
                      }}
                    />
                  </div>

                  {/* Answer image (conditional) */}
                  {showAnswers && problem.answer_filename && (
                    <div className="relative mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-xs font-semibold text-gray-600">해설</div>
                        {/* Dev-only: Show if answer image is from edited_contents DB */}
                        {(() => {
                          // Get answer resource ID (for economy: replace _문제 with _해설)
                          const answerId = problem.id.startsWith('경제_')
                            ? problem.id.replace('_문제', '_해설')
                            : problem.id;
                          const hasEditedAnswer = blobUrls.get(answerId);

                          return process.env.NODE_ENV === 'development' && hasEditedAnswer && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 border border-green-300">
                              📝 DB
                            </span>
                          );
                        })()}
                      </div>
                      <Image
                        src={(() => {
                          // Get answer resource ID (for economy: replace _문제 with _해설)
                          const answerId = problem.id.startsWith('경제_')
                            ? problem.id.replace('_문제', '_해설')
                            : problem.id;
                          return blobUrls.get(answerId) || getAnswerImageUrl(problem.id);
                        })()}
                        alt={problem.answer_filename}
                        width={800}
                        height={600}
                        className="w-full h-auto object-contain"
                        unoptimized={(() => {
                          const answerId = problem.id.startsWith('경제_')
                            ? problem.id.replace('_문제', '_해설')
                            : problem.id;
                          return !!blobUrls.get(answerId);
                        })()}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const existingError = parent.querySelector('.answer-error-message');
                            if (existingError) {
                              return;
                            }

                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'answer-error-message flex items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg';
                            errorDiv.innerHTML = `
                              <div class="text-center text-gray-500">
                                <div class="text-sm font-medium mb-1">해설 이미지를 불러올 수 없습니다</div>
                                <div class="text-xs">S3 설정을 확인하세요</div>
                              </div>
                            `;
                            parent.appendChild(errorDiv);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
