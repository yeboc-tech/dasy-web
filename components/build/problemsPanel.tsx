'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Loader, Trash2 } from "lucide-react";
import type { ProblemMetadata } from '@/lib/types/problems';
import type { ChapterTreeItem } from '@/lib/types';
import { getProblemImageUrl } from '@/lib/utils/s3Utils';

interface ProblemsPanelProps {
  filteredProblems: ProblemMetadata[];
  problemsLoading: boolean;
  problemsError: string | null;
  contentTree: ChapterTreeItem[];
  onDeleteProblem?: (problemId: string) => void;
}

// Create a fast lookup map for chapter names
function createChapterLookupMap(contentTree: ChapterTreeItem[]): Map<string, string> {
  const lookupMap = new Map<string, string>();
  
  const traverse = (items: ChapterTreeItem[]) => {
    for (const item of items) {
      // Remove numbering pattern like "01. ", "02. ", etc.
      const cleanLabel = item.label.replace(/^\d+\.\s*/, '');
      lookupMap.set(item.id, cleanLabel);
      
      if (item.children) {
        traverse(item.children);
      }
    }
  };
  
  traverse(contentTree);
  return lookupMap;
}

// Fast chapter name lookup using pre-built map
function getChapterName(chapterId: string | null, chapterMap: Map<string, string>): string {
  if (!chapterId) return 'Unknown';
  return chapterMap.get(chapterId) || 'Unknown';
}

export default function ProblemsPanel({
  filteredProblems,
  problemsLoading,
  problemsError,
  contentTree,
  onDeleteProblem
}: ProblemsPanelProps) {
  // Create chapter lookup map once when contentTree changes
  const chapterLookupMap = useMemo(() => {
    return createChapterLookupMap(contentTree);
  }, [contentTree]);

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
                  <div className="text-sm font-bold mb-2 relative z-[2]">
                    {index + 1}.
                  </div>
                  <div className="text-xs mb-1 relative z-[2]">
                    <span className="font-medium">{getChapterName(problem.chapter_id, chapterLookupMap)}</span> • {problem.difficulty} • {problem.problem_type}
                  </div>
                  {problem.tags && problem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2 relative z-[2]">
                      {problem.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Image
                      src={getProblemImageUrl(problem.id)}
                      alt={problem.problem_filename}
                      width={800}
                      height={600}
                      className="w-full h-auto object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        // Show error message
                        const parent = target.parentElement;
                        if (parent) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'flex items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg';
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
