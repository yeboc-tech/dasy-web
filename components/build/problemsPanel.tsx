'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { Loader, Trash2 } from "lucide-react";
import type { ProblemMetadata } from '@/lib/types/problems';
import type { ChapterTreeItem } from '@/lib/types';
import { getProblemImageUrl, getAnswerImageUrl } from '@/lib/utils/s3Utils';
import { getDifficultyFromCorrectRate } from '@/lib/utils/difficultyCorrectRateSync';
import { getSubjectFromProblemId } from '@/lib/supabase/services/taggedWorksheetService';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProblemsPanelProps {
  filteredProblems: ProblemMetadata[];
  problemsLoading: boolean;
  problemsError: string | null;
  contentTree: ChapterTreeItem[];
  onDeleteProblem?: (problemId: string) => void;
  showAnswers?: boolean;
  editedContentsMap?: Map<string, string> | null; // Now contains CDN URLs instead of base64
  emptyMessage?: string;
  addedProblemIds?: Set<string>; // IDs of problems already added to worksheet
  isManualSortMode?: boolean; // Enable drag & drop when true
  onReorder?: (problems: ProblemMetadata[]) => void; // Called when problems are reordered
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

// Sortable wrapper for drag & drop mode
interface SortableWrapperProps {
  id: string;
  children: React.ReactNode;
  isLast: boolean;
}

function SortableWrapper({ id, children, isLast }: SortableWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative w-full p-4 pb-6 transition-all group bg-white cursor-grab active:cursor-grabbing ${
        !isLast ? 'border-b border-gray-200' : 'rounded-br-xl'
      }`}
    >
      {children}
    </div>
  );
}

export default function ProblemsPanel({
  filteredProblems,
  problemsLoading,
  problemsError,
  contentTree,
  onDeleteProblem,
  showAnswers = false,
  editedContentsMap,
  emptyMessage = '선택한 조건에 맞는 문제가 없습니다.',
  addedProblemIds,
  isManualSortMode = false,
  onReorder
}: ProblemsPanelProps) {
  // Create chapter lookup map once when contentTree changes
  const chapterLookupMap = useMemo(() => {
    return createChapterLookupMap(contentTree);
  }, [contentTree]);

  // Track which CDN URLs have failed to load
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  // dnd-kit sensors for drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag before activating
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onReorder) {
      const oldIndex = filteredProblems.findIndex(p => p.id === active.id);
      const newIndex = filteredProblems.findIndex(p => p.id === over.id);
      const reordered = arrayMove(filteredProblems, oldIndex, newIndex);
      onReorder(reordered);
    }
  };

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
            {emptyMessage}
          </div>
        ) : isManualSortMode ? (
          /* Drag & drop mode */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filteredProblems.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div>
                {filteredProblems.map((problem: ProblemMetadata, index: number) => {
                  const isLast = index === filteredProblems.length - 1;

                  return (
                    <SortableWrapper key={problem.id} id={problem.id} isLast={isLast}>
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

                        {/* Difficulty badge - calculated from correct_rate */}
                        {problem.correct_rate !== null && problem.correct_rate !== undefined && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                            {getDifficultyFromCorrectRate(problem.correct_rate)}
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
                        {process.env.NODE_ENV === 'development' && editedContentsMap?.get(problem.id) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 border border-green-300">
                            📝 DB
                          </span>
                        )}
                      </div>
                      <div className="relative" id={`problem-img-${problem.id}`}>
                        {(() => {
                          const editedUrl = editedContentsMap?.get(problem.id);
                          const hasFailed = failedUrls.has(problem.id);

                          if (hasFailed) {
                            return (
                              <div className="flex items-center justify-center p-8 bg-red-50 border-2 border-dashed border-red-300 rounded-lg">
                                <div className="text-center text-red-600">
                                  <div className="text-sm font-medium mb-1">이미지 로드 실패</div>
                                  <div className="text-xs">이미지를 불러올 수 없습니다</div>
                                  <div className="text-xs text-red-400 mt-1">ID: {problem.id}</div>
                                </div>
                              </div>
                            );
                          }

                          const imageUrl = editedUrl || getProblemImageUrl(problem.id);

                          return (
                            <Image
                              src={imageUrl}
                              alt={problem.problem_filename}
                              width={800}
                              height={600}
                              className="w-full h-auto object-contain"
                              onError={() => {
                                setFailedUrls(prev => new Set(prev).add(problem.id));
                              }}
                            />
                          );
                        })()}
                      </div>

                      {/* Answer image (conditional) */}
                      {showAnswers && problem.answer_filename && (() => {
                        const isTaggedSubject = getSubjectFromProblemId(problem.id) !== null;
                        const answerId = isTaggedSubject
                          ? problem.id.replace('_문제', '_해설')
                          : problem.id;

                        return (
                          <div className="relative mt-4" id={`answer-img-${answerId}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-xs font-semibold text-gray-600">해설</div>
                              {process.env.NODE_ENV === 'development' && editedContentsMap?.get(answerId) && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 border border-green-300">
                                  📝 DB
                                </span>
                              )}
                            </div>
                            {(() => {
                              const editedUrl = editedContentsMap?.get(answerId);
                              const answerHasFailed = failedUrls.has(answerId);

                              if (answerHasFailed) {
                                return (
                                  <div className="flex items-center justify-center p-8 bg-red-50 border-2 border-dashed border-red-300 rounded-lg">
                                    <div className="text-center text-red-600">
                                      <div className="text-sm font-medium mb-1">해설 이미지 로드 실패</div>
                                      <div className="text-xs">이미지를 불러올 수 없습니다</div>
                                      <div className="text-xs text-red-400 mt-1">ID: {answerId}</div>
                                    </div>
                                  </div>
                                );
                              }

                              const imageUrl = editedUrl || getAnswerImageUrl(problem.id);

                              return (
                                <Image
                                  key={answerId}
                                  src={imageUrl}
                                  alt={problem.answer_filename}
                                  width={800}
                                  height={600}
                                  className="w-full h-auto object-contain"
                                  onError={() => {
                                    setFailedUrls(prev => new Set(prev).add(answerId));
                                  }}
                                />
                              );
                            })()}
                          </div>
                        );
                      })()}
                      </div>
                    </SortableWrapper>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          /* Normal mode (no drag & drop) */
          <div>
            {filteredProblems.map((problem: ProblemMetadata, index: number) => {
              const isLast = index === filteredProblems.length - 1;
              const isAlreadyAdded = addedProblemIds?.has(problem.id);

              return (
                <div
                  key={problem.id}
                  className={`relative w-full p-4 pb-6 transition-all group ${
                    !isLast ? 'border-b border-gray-200' : 'rounded-br-xl'
                  }`}
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

                    {/* Difficulty badge - calculated from correct_rate */}
                    {problem.correct_rate !== null && problem.correct_rate !== undefined && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {getDifficultyFromCorrectRate(problem.correct_rate)}
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
                    {process.env.NODE_ENV === 'development' && editedContentsMap?.get(problem.id) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 border border-green-300">
                        📝 DB
                      </span>
                    )}
                  </div>
                  <div className="relative" id={`problem-img-${problem.id}`}>
                    {(() => {
                      // Check if there's an edited content URL for this problem
                      const editedUrl = editedContentsMap?.get(problem.id);
                      const hasFailed = failedUrls.has(problem.id);

                      // If URL failed, show error card
                      if (hasFailed) {
                        return (
                          <div className="flex items-center justify-center p-8 bg-red-50 border-2 border-dashed border-red-300 rounded-lg">
                            <div className="text-center text-red-600">
                              <div className="text-sm font-medium mb-1">이미지 로드 실패</div>
                              <div className="text-xs">이미지를 불러올 수 없습니다</div>
                              <div className="text-xs text-red-400 mt-1">ID: {problem.id}</div>
                            </div>
                          </div>
                        );
                      }

                      // Use edited content URL from CDN if available, otherwise original CDN URL
                      const imageUrl = editedUrl || getProblemImageUrl(problem.id);

                      return (
                        <Image
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
                    // For tagged subject problems, answer ID replaces _문제 with _해설
                    const isTaggedSubject = getSubjectFromProblemId(problem.id) !== null;
                    const answerId = isTaggedSubject
                      ? problem.id.replace('_문제', '_해설')
                      : problem.id;

                    return (
                      <div className="relative mt-4" id={`answer-img-${answerId}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-xs font-semibold text-gray-600">해설</div>
                          {/* Dev-only: Show if answer image is from edited_contents DB */}
                          {process.env.NODE_ENV === 'development' && editedContentsMap?.get(answerId) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 border border-green-300">
                              📝 DB
                            </span>
                          )}
                        </div>
                        {(() => {
                          // Check if there's an edited content URL for this answer
                          const editedUrl = editedContentsMap?.get(answerId);
                          const answerHasFailed = failedUrls.has(answerId);

                          // If URL failed, show error card
                          if (answerHasFailed) {
                            return (
                              <div className="flex items-center justify-center p-8 bg-red-50 border-2 border-dashed border-red-300 rounded-lg">
                                <div className="text-center text-red-600">
                                  <div className="text-sm font-medium mb-1">해설 이미지 로드 실패</div>
                                  <div className="text-xs">이미지를 불러올 수 없습니다</div>
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
