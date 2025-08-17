'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Loader } from "lucide-react";
import type { ProblemMetadata } from '@/lib/types/problems';
import type { ChapterTreeItem } from '@/lib/types';
import { getProblemImageUrl } from '@/lib/utils/s3Utils';

interface ProblemsPanelProps {
  filteredProblems: ProblemMetadata[];
  problemsLoading: boolean;
  problemsError: string | null;
  contentTree: ChapterTreeItem[];
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
  contentTree 
}: ProblemsPanelProps) {
  // Create chapter lookup map once when contentTree changes
  const chapterLookupMap = useMemo(() => {
    return createChapterLookupMap(contentTree);
  }, [contentTree]);
  return (
    <div className="w-1/2 flex flex-col min-h-0 overflow-y-scroll">
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
      
      <div className="flex-1 min-h-0">
        {filteredProblems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            선택한 조건에 맞는 문제가 없습니다.
          </div>
        ) : (
          <div className="">
            {filteredProblems.map((problem: ProblemMetadata) => (
              <div key={problem.id} className="w-full p-4 pb-6 border-b border-gray-200">
                <div className="text-xs mb-1">
                  <span className="font-medium">{getChapterName(problem.chapter_id, chapterLookupMap)}</span> • {problem.difficulty} • {problem.problem_type}
                </div>
                <div className="relative">
                  <Image 
                    src={getProblemImageUrl(problem.id)} 
                    alt={problem.filename}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
