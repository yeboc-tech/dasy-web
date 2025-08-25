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
import type { ChapterTreeItem } from '@/lib/types';

export default function Page() {
  const {selectedChapters, setSelectedChapters, problemCount, selectedDifficulties, selectedProblemTypes, selectedSubjects, correctRateRange} = useWorksheetStore();
  const [selectedMainSubjects, setSelectedMainSubjects] = useState<string[]>(['7ec63358-5e6b-49be-89a4-8b5639f3f9c0']); // 통합사회 2 database ID
  const [hasSetDefaultSelection, setHasSetDefaultSelection] = useState(false);
  const [filteredProblems, setFilteredProblems] = useState<ProblemMetadata[]>([]);
  
  const { chapters: contentTree, loading: chaptersLoading, error: chaptersError } = useChapters();
  const { problems, loading: problemsLoading, error: problemsError } = useProblems();
  
  // Debug logging
  console.log('Build Page - selectedChapters from store:', selectedChapters);
  console.log('Build Page - selectedMainSubjects:', selectedMainSubjects);
  console.log('Build Page - contentTree length:', contentTree?.length || 0);
  console.log('Build Page - chaptersLoading:', chaptersLoading);
  if (chaptersError) console.log('Build Page - chaptersError:', chaptersError);

  // Simulate clicking 통합사회 2 checkbox when content tree loads (only once)
  useEffect(() => {
    if (contentTree && contentTree.length > 0 && !hasSetDefaultSelection) {
      const tonghapsahoe2Id = '7ec63358-5e6b-49be-89a4-8b5639f3f9c0';
      const tonghapsahoe2Item = contentTree.find(item => item.id === tonghapsahoe2Id);
      
      if (tonghapsahoe2Item) {
        // Use the same logic as handleCheckboxChange when checking a parent
        const getAllChildIds = (item: ChapterTreeItem): string[] => {
          const childIds: string[] = [];
          if (item.children && item.children.length > 0) {
            item.children.forEach((child: ChapterTreeItem) => {
              childIds.push(child.id);
              childIds.push(...getAllChildIds(child));
            });
          }
          return childIds;
        };

        // Simulate checking 통합사회 2 - add parent + all children (same as FilterPanel logic)
        const allChildIds = getAllChildIds(tonghapsahoe2Item);
        const itemsToAdd = [tonghapsahoe2Id, ...allChildIds];
        const newSelectedChapters = [...selectedChapters, ...itemsToAdd.filter(id => !selectedChapters.includes(id))];
        
        console.log('Simulating 통합사회 2 checkbox click - selecting parent and all children:', newSelectedChapters);
        setSelectedChapters(newSelectedChapters);
        setHasSetDefaultSelection(true);
      }
    }
  }, [contentTree, hasSetDefaultSelection, setSelectedChapters, selectedChapters]);

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
