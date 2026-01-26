'use client';

import React from 'react';
import { AuthButton as Button } from '@/components/ui/auth-button';
import { Button as DisabledButton } from '@/components/ui/button';
import type { ChapterTreeItem } from '@/lib/types';
import { Loader } from 'lucide-react';
import TonghapsahoeFilters from './filters/TonghapsahoeFilters';
import TaggedSubjectFilters from './filters/TaggedSubjectFilters';

// Tagged subjects configuration (active subjects only)
const TAGGED_SUBJECTS = [
  { id: '경제', label: '경제' },
  { id: '사회문화', label: '사회문화' },
  { id: '생활과윤리', label: '생활과윤리' },
  { id: '정치와법', label: '정치와법' },
  { id: '세계지리', label: '세계지리' },
  { id: '한국지리', label: '한국지리' },
  { id: '윤리와사상', label: '윤리와사상' },
  { id: '세계사', label: '세계사' },
  { id: '동아시아사', label: '동아시아사' },
] as const;

// Check if a subject ID is a tagged subject
function isTaggedSubject(subjectId: string): boolean {
  return TAGGED_SUBJECTS.some(s => s.id === subjectId);
}

interface FilterPanelProps {
  contentTree: ChapterTreeItem[];
  selectedMainSubjects: string[];
  onMainSubjectToggle: (subject: string) => void;
  loading?: boolean;
  error?: string | null;
  isDialog?: boolean;
  // Lock subject selection based on existing worksheet problems
  // null = no problems, all enabled; 'tonghapsahoe' = only 통합사회 enabled
  // For tagged subjects: '경제' | '사회문화' | '생활과윤리' | '정치와법' | '세계지리' = only that specific subject enabled
  lockedSubject?: '경제' | '사회문화' | '생활과윤리' | '정치와법' | '세계지리' | '한국지리' | '윤리와사상' | '세계사' | '동아시아사' | 'tonghapsahoe' | null;
  // Optional filter overrides for dialog view
  dialogFilters?: {
    selectedChapters: string[];
    setSelectedChapters: (value: string[]) => void;
    selectedDifficulties: string[];
    setSelectedDifficulties: (value: string[]) => void;
    selectedProblemTypes: string[];
    setSelectedProblemTypes: (value: string[]) => void;
    selectedSubjects: string[];
    setSelectedSubjects: (value: string[]) => void;
    correctRateRange: [number, number];
    setCorrectRateRange: (value: [number, number]) => void;
    selectedYears: number[];
    setSelectedYears: (value: number[]) => void;
    problemCount: number;
    setProblemCount: (value: number) => void;
    selectedGrades?: string[];
    setSelectedGrades?: (value: string[]) => void;
    selectedMonths?: string[];
    setSelectedMonths?: (value: string[]) => void;
    selectedExamTypes?: string[];
    setSelectedExamTypes?: (value: string[]) => void;
  };
}

export default function FilterPanel({
  contentTree,
  selectedMainSubjects,
  onMainSubjectToggle,
  loading = false,
  error = null,
  isDialog = false,
  lockedSubject = null,
  dialogFilters
}: FilterPanelProps) {
  // Determine if any tagged subject is selected
  const selectedTaggedSubject = selectedMainSubjects.find(s => isTaggedSubject(s));
  const isTaggedMode = !!selectedTaggedSubject;

  // Handle loading and error states (only for 통합사회 mode)
  if (!isTaggedMode && loading) {
    return (
      <div className="w-full h-full flex flex-col overflow-y-auto">
        <div className="flex items-center justify-center h-full">
          <Loader className="animate-spin w-4 h-4" />
        </div>
      </div>
    );
  }

  if (!isTaggedMode && error) {
    return (
      <div className="w-full h-full flex flex-col overflow-y-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-red-500">단원 정보 로드 실패: {error}</div>
        </div>
      </div>
    );
  }

  if (!isTaggedMode && (!contentTree || contentTree.length === 0)) {
    return (
      <div className="w-full h-full flex flex-col overflow-y-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-gray-500">단원 정보가 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      {/* Subject Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex gap-2 flex-wrap">
          {/* 통합사회 1 - Always disabled (not available) */}
          <div className="cursor-not-allowed">
            <DisabledButton
              onClick={() => {}}
              variant="outline"
              disabled={true}
              className="rounded-full px-6 py-2 text-sm font-medium transition-all bg-red-50 text-black border-red-300 opacity-60 hover:bg-red-50 pointer-events-none"
            >
              통합사회 1
            </DisabledButton>
          </div>
          {/* 통합사회 2 */}
          {(() => {
            // Disabled if lockedSubject is any tagged subject (경제, 사회문화, 생활과윤리)
            const isDisabled = lockedSubject !== null && lockedSubject !== 'tonghapsahoe';
            return (
              <Button
                onClick={() => onMainSubjectToggle('7ec63358-5e6b-49be-89a4-8b5639f3f9c0')}
                variant="outline"
                disabled={isDisabled}
                className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
                  selectedMainSubjects.includes('7ec63358-5e6b-49be-89a4-8b5639f3f9c0')
                    ? 'border-black text-black bg-gray-100'
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                통합사회 2
              </Button>
            );
          })()}
          {/* Tagged subjects (경제, 사회문화) */}
          {TAGGED_SUBJECTS.map(subject => {
            // Disabled if lockedSubject is tonghapsahoe OR a different tagged subject
            const isDisabled = lockedSubject === 'tonghapsahoe' ||
              (lockedSubject !== null && lockedSubject !== subject.id);
            return (
              <Button
                key={subject.id}
                onClick={() => onMainSubjectToggle(subject.id)}
                variant="outline"
                disabled={isDisabled}
                className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
                  selectedMainSubjects.includes(subject.id)
                    ? 'border-black text-black bg-gray-100'
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {subject.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Conditional rendering based on mode */}
      {isTaggedMode && selectedTaggedSubject ? (
        <TaggedSubjectFilters subject={selectedTaggedSubject} dialogFilters={dialogFilters} />
      ) : (
        <TonghapsahoeFilters
          contentTree={contentTree}
          selectedMainSubjects={selectedMainSubjects}
          dialogFilters={dialogFilters}
        />
      )}
    </div>
  );
}
