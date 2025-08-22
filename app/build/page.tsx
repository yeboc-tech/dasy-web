'use client';

import { useState, useEffect } from 'react';
import ProblemsPanel from '@/components/build/problemsPanel';
import FilterPanel from '@/components/build/filterPanel';
import { Card } from '@/components/ui/card';
import { useChapters } from '@/lib/hooks/useChapters';
import { useProblems } from '@/lib/hooks/useProblems';
import { useWorksheetStore } from '@/lib/zustand/worksheetStore';
import { ProblemFilter } from '@/lib/utils/problemFiltering';
import type { ProblemMetadata } from '@/lib/types/problems';

export default function Page() {
  const {selectedChapters, problemCount, selectedDifficulties, selectedProblemTypes, selectedSubjects, correctRateRange} = useWorksheetStore();
  const [selectedMainSubjects, setSelectedMainSubjects] = useState<string[]>(['7ec63358-5e6b-49be-89a4-8b5639f3f9c0']); // 통합사회 2 database ID
  
  const [filteredProblems, setFilteredProblems] = useState<ProblemMetadata[]>([]);
  
  const { chapters: contentTree, loading: chaptersLoading, error: chaptersError } = useChapters();
  const { problems, loading: problemsLoading, error: problemsError } = useProblems();

  // Filter problems when any filter changes
  useEffect(() => {
    if (!problems || problems.length === 0) return;

    const filters = {
      selectedChapters,
      selectedDifficulties,
      selectedProblemTypes,
      selectedSubjects,
      problemCount,
      contentTree,
      correctRateRange
    };

    const filtered = ProblemFilter.filterProblems(problems, filters);
    setFilteredProblems(filtered);
  }, [problems, selectedChapters, selectedDifficulties, selectedProblemTypes, selectedSubjects, problemCount, contentTree, correctRateRange]);

  const handleMainSubjectToggle = (subject: string) => {
    const newSelectedMainSubjects = selectedMainSubjects.includes(subject)
      ? selectedMainSubjects.filter(s => s !== subject)
      : [...selectedMainSubjects, subject];
    
    if (newSelectedMainSubjects.length === 0) {
      setSelectedMainSubjects([subject]);
    } else {
      setSelectedMainSubjects(newSelectedMainSubjects);
    }
  };

  return (
    <div className="mx-auto px-4 pt-2 pb-6 w-full max-w-4xl h-full">
      <Card className="overflow-hidden relative p-0 h-full flex flex-row gap-0 ">
        <FilterPanel 
          contentTree={contentTree} 
          selectedMainSubjects={selectedMainSubjects} 
          onMainSubjectToggle={handleMainSubjectToggle}
          loading={chaptersLoading}
          error={chaptersError}
        />
                <ProblemsPanel 
          filteredProblems={filteredProblems}
          problemsLoading={problemsLoading}
          problemsError={problemsError}
          contentTree={contentTree}
        />
      </Card>
    </div>
  );
}
