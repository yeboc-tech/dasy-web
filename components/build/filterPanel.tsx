'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import type { ChapterTreeItem } from '@/lib/types';
import { Loader } from 'lucide-react';
import TonghapsahoeFilters from './filters/TonghapsahoeFilters';
import EconomyFilters from './filters/EconomyFilters';

interface FilterPanelProps {
  contentTree: ChapterTreeItem[];
  selectedMainSubjects: string[];
  onMainSubjectToggle: (subject: string) => void;
  loading?: boolean;
  error?: string | null;
  isDialog?: boolean; // To hide 경제 button in dialog mode
}

export default function FilterPanel({
  contentTree,
  selectedMainSubjects,
  onMainSubjectToggle,
  loading = false,
  error = null,
  isDialog = false
}: FilterPanelProps) {
  // Determine if economy mode is selected
  const isEconomyMode = selectedMainSubjects.includes('economy');

  // Handle loading and error states (only for 통합사회 mode)
  if (!isEconomyMode && loading) {
    return (
      <div className="w-1/2 flex flex-col min-h-0 overflow-y-scroll border-r border-gray-200">
        <div className="flex items-center justify-center h-full">
          <Loader className="animate-spin w-4 h-4" />
        </div>
      </div>
    );
  }

  if (!isEconomyMode && error) {
    return (
      <div className="w-1/2 flex flex-col min-h-0 overflow-y-scroll border-r border-gray-200">
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-red-500">단원 정보 로드 실패: {error}</div>
        </div>
      </div>
    );
  }

  if (!isEconomyMode && (!contentTree || contentTree.length === 0)) {
    return (
      <div className="w-1/2 flex flex-col min-h-0 overflow-y-scroll border-r border-gray-200">
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-gray-500">단원 정보가 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-1/2 flex flex-col min-h-0 overflow-y-scroll border-r border-gray-200">
      {/* Subject Filter Bar - Hide 경제 in dialog mode */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <div className="cursor-not-allowed">
            <Button
              onClick={() => {}} // Disabled - no action
              variant="outline"
              disabled={true}
              className="rounded-full px-6 py-2 text-sm font-medium transition-all bg-red-50 text-black border-red-300 opacity-60 hover:bg-red-50 pointer-events-none"
            >
              통합사회 1
            </Button>
          </div>
          <Button
            onClick={() => onMainSubjectToggle('7ec63358-5e6b-49be-89a4-8b5639f3f9c0')} // 통합사회 2 database ID
            variant="outline"
            className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
              selectedMainSubjects.includes('7ec63358-5e6b-49be-89a4-8b5639f3f9c0')
                ? 'border-black text-black bg-gray-100'
                : 'bg-white text-black border-gray-300 hover:bg-gray-50'
            }`}
          >
            통합사회 2
          </Button>
          {/* Hide 경제 button in dialog mode */}
          {!isDialog && (
            <Button
              onClick={() => onMainSubjectToggle('economy')} // 경제 mode
              variant="outline"
              className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
                selectedMainSubjects.includes('economy')
                  ? 'border-black text-black bg-gray-100'
                  : 'bg-white text-black border-gray-300 hover:bg-gray-50'
              }`}
            >
              경제
            </Button>
          )}
        </div>
      </div>

      {/* Conditional rendering based on mode */}
      {isEconomyMode ? (
        <EconomyFilters />
      ) : (
        <TonghapsahoeFilters
          contentTree={contentTree}
          selectedMainSubjects={selectedMainSubjects}
        />
      )}
    </div>
  );
}
