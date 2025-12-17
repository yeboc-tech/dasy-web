'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Loader, Trash2 } from "lucide-react";
import type { ProblemMetadata } from '@/lib/types/problems';
import { getProblemImageUrl, getAnswerImageUrl } from '@/lib/utils/s3Utils';
import { getTaggedDifficultyFromCorrectRate } from '@/lib/utils/taggedDifficultySync';
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

interface TaggedProblemsPanelProps {
  filteredProblems: ProblemMetadata[];
  problemsLoading: boolean;
  problemsError: string | null;
  onDeleteProblem?: (problemId: string) => void;
  showAnswers?: boolean;
  editedContentsMap?: Map<string, string> | null;
  emptyMessage?: string;
  addedProblemIds?: Set<string>;
  isManualSortMode?: boolean;
  onReorder?: (problems: ProblemMetadata[]) => void;
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

export default function TaggedProblemsPanel({
  filteredProblems,
  problemsLoading,
  problemsError,
  onDeleteProblem,
  showAnswers = false,
  editedContentsMap,
  emptyMessage = '선택한 조건에 맞는 문제가 없습니다.',
  addedProblemIds,
  isManualSortMode = false,
  onReorder
}: TaggedProblemsPanelProps) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
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

  // Helper to render problem content (shared between both modes)
  const renderProblemContent = (problem: ProblemMetadata, index: number) => (
    <>
      <div className="absolute inset-0 bg-gray-500 opacity-0 group-hover:opacity-5 pointer-events-none z-[1] transition-opacity" />
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
        <div className="text-sm font-bold mb-2 relative z-[2]">{index + 1}.</div>
        <div className="flex flex-wrap gap-1.5 mb-3 relative z-[2]">
          {problem.tags?.map((tag, tagIndex) => (
            <span key={tagIndex} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
              {tag}
            </span>
          ))}
          {problem.correct_rate !== null && problem.correct_rate !== undefined && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
              {getTaggedDifficultyFromCorrectRate(problem.correct_rate)}
            </span>
          )}
          {problem.problem_type && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
              {problem.problem_type}
            </span>
          )}
          {problem.isMissing && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
              DB 없음
            </span>
          )}
        </div>
        <div className="relative" id={`problem-img-${problem.id}`}>
          {(() => {
            if (editedContentsMap === null) {
              return <div className="flex items-center justify-center p-8"><Loader className="animate-spin w-4 h-4 text-gray-400" /></div>;
            }
            const editedUrl = editedContentsMap?.get(problem.id);
            const hasFailed = failedUrls.has(problem.id);

            if (hasFailed) {
              return (
                <div className="flex items-center justify-center p-8 bg-red-50 border-2 border-dashed border-red-300 rounded-lg">
                  <div className="text-center text-red-600">
                    <div className="text-sm font-medium mb-1">이미지 로드 실패</div>
                    <div className="text-xs">이미지를 불러올 수 없습니다</div>
                    <div className="text-xs text-red-400 mt-1 font-mono">{problem.id}</div>
                  </div>
                </div>
              );
            }
            const imageUrl = editedUrl || getProblemImageUrl(problem.id);
            return (
              <Image
                src={imageUrl}
                alt={problem.problem_filename || problem.id}
                width={800}
                height={600}
                className="w-full h-auto object-contain"
                onError={() => setFailedUrls(prev => new Set(prev).add(problem.id))}
              />
            );
          })()}
        </div>
        {showAnswers && problem.answer_filename && (() => {
          const answerId = problem.id.replace('_문제', '_해설');
          return (
            <div className="relative mt-4" id={`answer-img-${answerId}`}>
              <div className="text-xs font-semibold text-gray-600 mb-2">해설</div>
              {(() => {
                if (editedContentsMap === null) {
                  return <div className="flex items-center justify-center p-8"><Loader className="animate-spin w-4 h-4 text-gray-400" /></div>;
                }
                const editedUrl = editedContentsMap?.get(answerId);
                const answerHasFailed = failedUrls.has(answerId);
                if (answerHasFailed) {
                  return (
                    <div className="flex items-center justify-center p-8 bg-red-50 border-2 border-dashed border-red-300 rounded-lg">
                      <div className="text-center text-red-600">
                        <div className="text-sm font-medium mb-1">해설 이미지 로드 실패</div>
                        <div className="text-xs">ID: {answerId}</div>
                      </div>
                    </div>
                  );
                }
                const imageUrl = editedUrl || getAnswerImageUrl(problem.id);
                return (
                  <Image
                    src={imageUrl}
                    alt={problem.answer_filename}
                    width={800}
                    height={600}
                    className="w-full h-auto object-contain"
                    onError={() => setFailedUrls(prev => new Set(prev).add(answerId))}
                  />
                );
              })()}
            </div>
          );
        })()}
      </div>
    </>
  );

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {problemsLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white bg-opacity-70">
          <Loader className="animate-spin w-4 h-4" />
        </div>
      )}
      {problemsError && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
          <div className="text-center text-gray-600">문제 데이터를 불러오는 중 오류가 발생했습니다.</div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {filteredProblems.length === 0 ? (
          <div className="flex items-center justify-center min-h-full text-gray-500 text-sm">{emptyMessage}</div>
        ) : isManualSortMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredProblems.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div>
                {filteredProblems.map((problem, index) => (
                  <SortableWrapper key={problem.id} id={problem.id} isLast={index === filteredProblems.length - 1}>
                    {renderProblemContent(problem, index)}
                  </SortableWrapper>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div>
            {filteredProblems.map((problem, index) => (
              <div
                key={problem.id}
                className={`relative w-full p-4 pb-6 transition-all group ${
                  index !== filteredProblems.length - 1 ? 'border-b border-gray-200' : 'rounded-br-xl'
                }`}
              >
                {renderProblemContent(problem, index)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
