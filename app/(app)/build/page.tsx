'use client';

import { useState, useEffect } from 'react';
import ProblemsPanel from '@/components/build/problemsPanel';
import EconomyProblemsPanel from '@/components/build/EconomyProblemsPanel';
import FilterPanel from '@/components/build/filterPanel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { CornerDownLeft, ArrowDownUp, ChevronLeft, Check } from 'lucide-react';
import { CustomButton } from '@/components/custom-button';
import { useChapters } from '@/lib/hooks/useChapters';
import { useProblems } from '@/lib/hooks/useProblems';
import { useWorksheetStore } from '@/lib/zustand/worksheetStore';
import { ProblemFilter } from '@/lib/utils/problemFiltering';
import { WorksheetMetadataDialog } from '@/components/worksheets/WorksheetMetadataDialog';
import { getEconomyProblems } from '@/lib/supabase/services/clientServices';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAuthBlocker } from '@/lib/contexts/auth-blocker-context';
import { AuthenticationBlocker } from '@/components/auth/authentication-blocker';
import type { ProblemMetadata, EconomyProblem } from '@/lib/types/problems';
import type { ChapterTreeItem } from '@/lib/types';

export default function Page() {
  const {
    selectedChapters,
    setSelectedChapters,
    problemCount,
    selectedDifficulties,
    selectedProblemTypes,
    selectedSubjects,
    correctRateRange,
    selectedYears,
    selectedGrades,
    selectedMonths,
    selectedExamTypes
  } = useWorksheetStore();
  const [selectedMainSubjects, setSelectedMainSubjects] = useState<string[]>(['7ec63358-5e6b-49be-89a4-8b5639f3f9c0']); // 통합사회 2 database ID
  const [hasSetDefaultSelection, setHasSetDefaultSelection] = useState(false);
  const [filteredProblems, setFilteredProblems] = useState<ProblemMetadata[]>([]);
  const [economyProblems, setEconomyProblems] = useState<EconomyProblem[]>([]);
  const [dialogProblems, setDialogProblems] = useState<ProblemMetadata[]>([]);
  const [economyLoading, setEconomyLoading] = useState(false);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [worksheetMode, setWorksheetMode] = useState<'연습' | '실전'>('연습');
  const [sortedDialogProblems, setSortedDialogProblems] = useState<ProblemMetadata[]>([]);
  const [sortedFilteredProblems, setSortedFilteredProblems] = useState<ProblemMetadata[]>([]);
  const [editedContentsMap, setEditedContentsMap] = useState<Map<string, string> | null>(null);
  const [viewMode, setViewMode] = useState<'worksheet' | 'addProblems'>('worksheet');

  // Separate filter states for "문제 추가" view
  const [dialogSelectedChapters, setDialogSelectedChapters] = useState<string[]>([]);
  const [dialogSelectedDifficulties, setDialogSelectedDifficulties] = useState<string[]>([]);
  const [dialogSelectedProblemTypes, setDialogSelectedProblemTypes] = useState<string[]>([]);
  const [dialogSelectedSubjects, setDialogSelectedSubjects] = useState<string[]>([]);
  const [dialogCorrectRateRange, setDialogCorrectRateRange] = useState<[number, number]>([0, 100]);
  const [dialogSelectedYears, setDialogSelectedYears] = useState<number[]>([]);
  const [dialogSelectedGrades, setDialogSelectedGrades] = useState<string[]>([]);
  const [dialogSelectedMonths, setDialogSelectedMonths] = useState<string[]>([]);
  const [dialogSelectedExamTypes, setDialogSelectedExamTypes] = useState<string[]>([]);
  const [dialogProblemCount, setDialogProblemCount] = useState<number>(-1);

  const { chapters: contentTree, loading: chaptersLoading, error: chaptersError } = useChapters();
  const { problems, loading: problemsLoading, error: problemsError } = useProblems();
  const { user } = useAuth();
  const { showAuthBlocker, triggerAuthBlocker, dismissAuthBlocker } = useAuthBlocker();

  // Wrapper function to require auth before executing callback
  const requireAuth = (callback: () => void) => {
    if (!user) {
      triggerAuthBlocker();
      return;
    }
    callback();
  };

  // Check if in economy mode
  const isEconomyMode = selectedMainSubjects.includes('economy');

  // Initialize dialog filters with current worksheet filters when switching to add problems view
  useEffect(() => {
    if (viewMode === 'addProblems' && dialogSelectedChapters.length === 0) {
      // Only initialize if dialog filters are empty (first time opening)
      setDialogSelectedChapters(selectedChapters);
      setDialogSelectedDifficulties(selectedDifficulties);
      setDialogSelectedProblemTypes(selectedProblemTypes);
      setDialogSelectedSubjects(selectedSubjects);
      setDialogCorrectRateRange(correctRateRange);
      setDialogSelectedYears(selectedYears);
      setDialogProblemCount(problemCount);
      setDialogSelectedGrades(selectedGrades);
      setDialogSelectedMonths(selectedMonths);
      setDialogSelectedExamTypes(selectedExamTypes);
    }
  }, [viewMode, dialogSelectedChapters.length, selectedChapters, selectedDifficulties, selectedProblemTypes, selectedSubjects, correctRateRange, selectedYears, problemCount, selectedGrades, selectedMonths, selectedExamTypes]);

  // Fetch edited content when problems change (ONLY for 경제 problems)
  useEffect(() => {
    let cancelled = false;

    const fetchEditedContent = async () => {
      // Only fetch edited content for 경제 mode
      if (!isEconomyMode) {
        // For 통합사회, set empty map (not null) so components don't wait
        setEditedContentsMap(new Map());
        return;
      }

      // Combine both filteredProblems (worksheet view) and dialogProblems (add problems view)
      const allProblems = [...filteredProblems, ...dialogProblems];

      if (allProblems.length === 0) {
        setEditedContentsMap(null); // Set null when no problems (consistent loading state)
        return;
      }

      // Set to null to indicate "loading"
      setEditedContentsMap(null);

      const { getEditedContents } = await import('@/lib/supabase/services/clientServices');

      // Collect problem IDs from both views, removing duplicates
      const allResourceIds = Array.from(new Set(allProblems.map(p => p.id)));

      console.log(`[Build Page Preview] Fetching edited content for ${allResourceIds.length} 경제 resources (${filteredProblems.length} worksheet + ${dialogProblems.length} dialog)`);
      console.log('[Build Page Preview] First 5 resource IDs:', allResourceIds.slice(0, 5));

      const fetchedEditedContents = await getEditedContents(allResourceIds);

      // Only update state if this fetch hasn't been cancelled
      if (cancelled) {
        console.log('[Build Page Preview] ⚠️ Fetch cancelled - problem list changed');
        return;
      }

      if (fetchedEditedContents.size > 0) {
        console.log(`[Build Page Preview] ✅ Found ${fetchedEditedContents.size} edited images in database`);
        console.log('[Build Page Preview] Resource IDs with edited content:', Array.from(fetchedEditedContents.keys()));
      } else {
        console.log('[Build Page Preview] ⚠️ No edited content found in database for these problems');
      }

      setEditedContentsMap(fetchedEditedContents);
    };

    fetchEditedContent();

    // Cleanup: cancel fetch if component unmounts or problem lists change
    return () => {
      cancelled = true;
    };
  }, [isEconomyMode, filteredProblems, dialogProblems]);

  // Simulate clicking 통합사회 2 checkbox when content tree loads (only once)
  useEffect(() => {
    // Skip if in economy mode
    if (isEconomyMode) return;
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

        // Simulating 통합사회 2 checkbox click - selecting parent and all children
        setSelectedChapters(newSelectedChapters);
        setHasSetDefaultSelection(true);
      }
    }
  }, [contentTree, hasSetDefaultSelection, setSelectedChapters, selectedChapters, isEconomyMode]);

  // Filter problems for main page when filters change
  useEffect(() => {
    // Skip if in economy mode - show empty
    if (isEconomyMode) {
      setFilteredProblems([]);
      return;
    }

    if (!problems || problems.length === 0) {
      return;
    }

    const filters = {
      selectedChapters,
      selectedDifficulties,
      selectedProblemTypes,
      selectedSubjects,
      problemCount,
      contentTree,
      correctRateRange,
      selectedYears
    };

    const filtered = ProblemFilter.filterProblems(problems, filters);
    setFilteredProblems(filtered);
  }, [isEconomyMode, problems, selectedChapters, selectedDifficulties, selectedProblemTypes, selectedSubjects, problemCount, contentTree, correctRateRange, selectedYears]);

  // Fetch economy problems when in economy mode
  useEffect(() => {
    if (!isEconomyMode) {
      setEconomyProblems([]);
      setEconomyLoading(false);
      // Don't clear filteredProblems here - let the other useEffect handle it
      return;
    }

    async function fetchEconomyData() {
      try {
        setEconomyLoading(true);

        const filters = {
          selectedChapterIds: selectedChapters,
          selectedGrades,
          selectedYears,
          selectedMonths,
          selectedExamTypes,
          selectedDifficulties,
          correctRateRange
        };

        const economyData = await getEconomyProblems(filters);
        setEconomyProblems(economyData);

        // Convert economy problems to ProblemMetadata format for display
        const convertedProblems: ProblemMetadata[] = economyData.map((problem) => ({
          id: problem.problem_id,
          problem_filename: `${problem.problem_id}.png`,
          answer_filename: problem.problem_id.replace('_문제', '_해설') + '.png',
          answer: problem.correct_answer,
          chapter_id: problem.tag_ids[problem.tag_ids.length - 1] || null, // Use most specific chapter
          difficulty: problem.difficulty || '중',
          problem_type: `${problem.exam_type} ${problem.year}년 ${parseInt(problem.month)}월`,
          tags: problem.tag_labels,
          related_subjects: ['경제'],
          correct_rate: problem.accuracy_rate,
          exam_year: parseInt(problem.year),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        // Remove duplicates based on problem ID
        const uniqueProblems = convertedProblems.filter((problem, index, self) =>
          index === self.findIndex(p => p.id === problem.id)
        );

        if (uniqueProblems.length !== convertedProblems.length) {
          console.warn(`[Economy Debug] Removed ${convertedProblems.length - uniqueProblems.length} duplicate problems`);
        }

        // Apply problem count limit with random selection
        let limitedProblems: ProblemMetadata[];
        if (problemCount === -1) {
          // Show all problems
          limitedProblems = uniqueProblems;
        } else {
          // Randomly select problems first, then they will be sorted later
          const shuffled = [...uniqueProblems].sort(() => Math.random() - 0.5);
          limitedProblems = shuffled.slice(0, Math.min(problemCount, shuffled.length));
        }

        console.log(`[Economy Debug] Total problems: ${uniqueProblems.length}, showing: ${limitedProblems.length}`);
        console.log(`[Economy Debug] First 5 problem IDs:`, limitedProblems.slice(0, 5).map(p => p.id));

        setFilteredProblems(limitedProblems);
      } catch (error) {
        console.error('Error fetching economy problems:', error);
        setEconomyProblems([]);
        setFilteredProblems([]);
      } finally {
        setEconomyLoading(false);
      }
    }

    fetchEconomyData();
  }, [isEconomyMode, selectedChapters, selectedGrades, selectedYears, selectedMonths, selectedExamTypes, selectedDifficulties, correctRateRange, problemCount]);

  // Filter problems for dialog when any filter changes (only in filter mode, not AI mode)
  // Uses separate dialog filter states
  useEffect(() => {
    if (aiMode) return; // Skip filtering in AI mode - let AI control the results

    // Handle economy mode for dialog
    if (isEconomyMode) {
      const fetchDialogEconomyProblems = async () => {
        try {
          const filters = {
            selectedChapterIds: dialogSelectedChapters || [],
            selectedGrades: dialogSelectedGrades || ['고3'],
            selectedYears: dialogSelectedYears || Array.from({ length: 2025 - 2012 + 1 }, (_, i) => 2012 + i),
            selectedMonths: dialogSelectedMonths || ['03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
            selectedExamTypes: dialogSelectedExamTypes || ['학평', '모평', '수능'],
            selectedDifficulties: dialogSelectedDifficulties || ['최상', '상', '중상', '중', '중하', '하'],
            correctRateRange: dialogCorrectRateRange as [number, number]
          };

          const economyData = await getEconomyProblems(filters);

          // Convert economy problems to ProblemMetadata format (same as main view)
          const convertedProblems: ProblemMetadata[] = economyData.map((problem) => ({
            id: problem.problem_id,
            problem_filename: `${problem.problem_id}.png`,
            answer_filename: problem.problem_id.replace('_문제', '_해설') + '.png',
            answer: problem.correct_answer,
            chapter_id: problem.tag_ids[problem.tag_ids.length - 1] || null,
            difficulty: problem.difficulty || '중',
            problem_type: `${problem.exam_type} ${problem.year}년 ${parseInt(problem.month)}월`,
            tags: problem.tag_labels,
            related_subjects: ['경제'],
            correct_rate: problem.accuracy_rate,
            exam_year: parseInt(problem.year),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          // Remove duplicates
          const uniqueProblems = convertedProblems.filter((problem, index, self) =>
            index === self.findIndex(p => p.id === problem.id)
          );

          // Apply problem count limit with random selection
          let limitedProblems: ProblemMetadata[];
          if (dialogProblemCount === -1) {
            limitedProblems = uniqueProblems;
          } else {
            const shuffled = [...uniqueProblems].sort(() => Math.random() - 0.5);
            limitedProblems = shuffled.slice(0, Math.min(dialogProblemCount, shuffled.length));
          }

          console.log(`[Dialog Economy Debug] Total: ${uniqueProblems.length}, showing: ${limitedProblems.length}`);
          setDialogProblems(limitedProblems);
        } catch (error) {
          console.error('Error fetching economy problems for dialog:', error);
          setDialogProblems([]);
        }
      };

      fetchDialogEconomyProblems();
      return;
    }

    if (!problems || problems.length === 0) return;

    const filters = {
      selectedChapters: dialogSelectedChapters,
      selectedDifficulties: dialogSelectedDifficulties,
      selectedProblemTypes: dialogSelectedProblemTypes,
      selectedSubjects: dialogSelectedSubjects,
      problemCount: dialogProblemCount,
      contentTree,
      correctRateRange: dialogCorrectRateRange,
      selectedYears: dialogSelectedYears
    };

    const filtered = ProblemFilter.filterProblems(problems, filters);
    setDialogProblems(filtered);
  }, [aiMode, isEconomyMode, problems, dialogSelectedChapters, dialogSelectedDifficulties, dialogSelectedProblemTypes, dialogSelectedSubjects, dialogProblemCount, contentTree, dialogCorrectRateRange, dialogSelectedYears, dialogSelectedGrades, dialogSelectedExamTypes, dialogSelectedMonths]);

  // Sort main page problems based on worksheet mode
  useEffect(() => {
    if (!filteredProblems || filteredProblems.length === 0) {
      setSortedFilteredProblems([]);
      return;
    }

    // For non-economy mode, we need contentTree
    if (!isEconomyMode && !contentTree) {
      setSortedFilteredProblems([]);
      return;
    }

    let sorted = [...filteredProblems];

    console.log(`[Sort Debug] Mode: ${worksheetMode}, Problems to sort: ${sorted.length}, IsEconomyMode: ${isEconomyMode}`);

    if (worksheetMode === '연습') {
      if (isEconomyMode) {
        // Economy mode: Sort by tag hierarchy -> group by complete tag path -> sort by correct rate
        sorted.sort((a, b) => {
          const tagsA = a.tags || [];
          const tagsB = b.tags || [];

          // Compare tag hierarchy level by level (chapter hierarchy)
          const minLength = Math.min(tagsA.length, tagsB.length);
          for (let i = 0; i < minLength; i++) {
            // Extract leading numbers for numeric comparison
            const numA = parseInt(tagsA[i].match(/^\d+/)?.[0] || '0', 10);
            const numB = parseInt(tagsB[i].match(/^\d+/)?.[0] || '0', 10);

            // If both have numbers, compare numerically
            if (numA !== numB) {
              return numA - numB;
            }

            // If numbers are equal or don't exist, fall back to string comparison
            const comparison = tagsA[i].localeCompare(tagsB[i]);
            if (comparison !== 0) {
              return comparison;
            }
          }

          // If one path is shorter (e.g., ['경제', '시장'] vs ['경제', '시장', '수요'])
          // Put the shorter one first
          if (tagsA.length !== tagsB.length) {
            return tagsA.length - tagsB.length;
          }

          // Same tag path (same chapter at deepest level)
          // Sort by correct rate descending (highest first = easiest first)
          const aCorrectRate = a.correct_rate ?? 0;
          const bCorrectRate = b.correct_rate ?? 0;
          return bCorrectRate - aCorrectRate;
        });
      } else {
        // Regular mode: Use the same hierarchical sorting as ProblemFilter
        // Build chapter path map
        const pathMap = new Map<string, number[]>();
        const traverse = (items: ChapterTreeItem[], path: number[]) => {
          items.forEach((item, index) => {
            const currentPath = [...path, index];
            pathMap.set(item.id, currentPath);
            if (item.children && item.children.length > 0) {
              traverse(item.children, currentPath);
            }
          });
        };
        traverse(contentTree, []);

        // Sort hierarchically: root chapter -> sub-chapters -> tags -> correct rate
        sorted.sort((a, b) => {
          const pathA = a.chapter_id ? pathMap.get(a.chapter_id) : undefined;
          const pathB = b.chapter_id ? pathMap.get(b.chapter_id) : undefined;

          // If one problem has no chapter path, put it at the end
          if (!pathA && !pathB) return 0;
          if (!pathA) return 1;
          if (!pathB) return -1;

          // Compare chapter hierarchy first
          const minLength = Math.min(pathA.length, pathB.length);
          for (let i = 0; i < minLength; i++) {
            if (pathA[i] !== pathB[i]) {
              return pathA[i] - pathB[i];
            }
          }
          // If all common levels are equal, shorter path comes first
          if (pathA.length !== pathB.length) {
            return pathA.length - pathB.length;
          }

          // If in same chapter, group by tags
          const tagsA = (a.tags || []).sort().join(',');
          const tagsB = (b.tags || []).sort().join(',');
          if (tagsA !== tagsB) {
            return tagsA.localeCompare(tagsB);
          }

          // If in same chapter and same tag group, sort by correct rate descending (highest first = easiest first)
          const aCorrectRate = a.correct_rate ?? 0;
          const bCorrectRate = b.correct_rate ?? 0;
          return bCorrectRate - aCorrectRate;
        });
      }
    } else {
      // 실전: totally random
      sorted = sorted
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
    }

    console.log(`[Sort Debug] After sorting, first 3 problems:`, sorted.slice(0, 3).map(p => ({
      id: p.id,
      chapter: p.chapter_id,
      tags: p.tags,
      difficulty: p.difficulty,
      correctRate: p.correct_rate
    })));

    // Check for duplicates
    const ids = sorted.map(p => p.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.warn(`[Economy Debug] Found ${ids.length - uniqueIds.size} duplicate problems in sorted list`);
      console.warn('[Economy Debug] Sample duplicates:', ids.filter((id, index) => ids.indexOf(id) !== index).slice(0, 3));
    }

    console.log(`[Economy Debug] Setting sortedFilteredProblems: ${sorted.length} problems`);
    setSortedFilteredProblems(sorted);
  }, [filteredProblems, worksheetMode, contentTree, isEconomyMode]);

  // Sort dialog problems based on worksheet mode
  useEffect(() => {
    if (!dialogProblems || dialogProblems.length === 0) {
      setSortedDialogProblems([]);
      return;
    }

    // For non-economy mode, we need contentTree
    if (!isEconomyMode && !contentTree) {
      setSortedDialogProblems([]);
      return;
    }

    let sorted = [...dialogProblems];

    if (worksheetMode === '연습') {
      if (isEconomyMode) {
        // Economy mode: Sort by tag hierarchy -> group by complete tag path -> sort by correct rate
        sorted.sort((a, b) => {
          const tagsA = a.tags || [];
          const tagsB = b.tags || [];

          // Compare tag hierarchy level by level (chapter hierarchy)
          const minLength = Math.min(tagsA.length, tagsB.length);
          for (let i = 0; i < minLength; i++) {
            // Extract leading numbers for numeric comparison
            const numA = parseInt(tagsA[i].match(/^\d+/)?.[0] || '0', 10);
            const numB = parseInt(tagsB[i].match(/^\d+/)?.[0] || '0', 10);

            // If both have numbers, compare numerically
            if (numA !== numB) {
              return numA - numB;
            }

            // If numbers are equal or don't exist, fall back to string comparison
            const comparison = tagsA[i].localeCompare(tagsB[i]);
            if (comparison !== 0) {
              return comparison;
            }
          }

          // If one path is shorter (e.g., ['경제', '시장'] vs ['경제', '시장', '수요'])
          // Put the shorter one first
          if (tagsA.length !== tagsB.length) {
            return tagsA.length - tagsB.length;
          }

          // Same tag path (same chapter at deepest level)
          // Sort by correct rate descending (highest first = easiest first)
          const aCorrectRate = a.correct_rate ?? 0;
          const bCorrectRate = b.correct_rate ?? 0;
          return bCorrectRate - aCorrectRate;
        });
      } else {
        // Regular mode: Use the same hierarchical sorting as ProblemFilter
        // Build chapter path map
        const pathMap = new Map<string, number[]>();
        const traverse = (items: ChapterTreeItem[], path: number[]) => {
          items.forEach((item, index) => {
            const currentPath = [...path, index];
            pathMap.set(item.id, currentPath);
            if (item.children && item.children.length > 0) {
              traverse(item.children, currentPath);
            }
          });
        };
        traverse(contentTree, []);

        // Sort hierarchically: root chapter -> sub-chapters -> tags -> correct rate
        sorted.sort((a, b) => {
          const pathA = a.chapter_id ? pathMap.get(a.chapter_id) : undefined;
          const pathB = b.chapter_id ? pathMap.get(b.chapter_id) : undefined;

          // If one problem has no chapter path, put it at the end
          if (!pathA && !pathB) return 0;
          if (!pathA) return 1;
          if (!pathB) return -1;

          // Compare chapter hierarchy first
          const minLength = Math.min(pathA.length, pathB.length);
          for (let i = 0; i < minLength; i++) {
            if (pathA[i] !== pathB[i]) {
              return pathA[i] - pathB[i];
            }
          }
          // If all common levels are equal, shorter path comes first
          if (pathA.length !== pathB.length) {
            return pathA.length - pathB.length;
          }

          // If in same chapter, group by tags
          const tagsA = (a.tags || []).sort().join(',');
          const tagsB = (b.tags || []).sort().join(',');
          if (tagsA !== tagsB) {
            return tagsA.localeCompare(tagsB);
          }

          // If in same chapter and same tag group, sort by correct rate descending (highest first = easiest first)
          const aCorrectRate = a.correct_rate ?? 0;
          const bCorrectRate = b.correct_rate ?? 0;
          return bCorrectRate - aCorrectRate;
        });
      }
    } else {
      // 실전: totally random
      sorted = sorted
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
    }

    setSortedDialogProblems(sorted);
  }, [dialogProblems, worksheetMode, contentTree, isEconomyMode]);

  const handleMainSubjectToggle = (subject: string) => {
    // Only one subject can be selected at a time (exclusive selection)
    setSelectedMainSubjects([subject]);
  };

  const handleDeleteProblem = (problemId: string) => {
    setFilteredProblems(prev => prev.filter(p => p.id !== problemId));
  };

  const handleCreateWorksheet = () => {
    if (sortedFilteredProblems.length === 0) return;
    setShowMetadataDialog(true);
  };

  const handleMetadataSubmit = async (data: { title: string; author: string }) => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      let worksheetId: string;

      if (isEconomyMode) {
        // Use economy worksheet service
        const { createEconomyWorksheet } = await import('@/lib/supabase/services/economyWorksheetService');

        const economyFilters = {
          selectedChapters,
          selectedDifficulties,
          selectedGrades,
          selectedYears,
          selectedMonths,
          selectedExamTypes,
          correctRateRange,
          problemCount
        };

        const { id } = await createEconomyWorksheet(supabase, {
          title: data.title,
          author: data.author,
          filters: economyFilters,
          problems: sortedFilteredProblems
        });

        worksheetId = id;
      } else {
        // Use regular worksheet service for 통합사회
        const { createWorksheet } = await import('@/lib/supabase/services/worksheetService');

        const filters = {
          selectedChapters,
          selectedDifficulties,
          selectedProblemTypes,
          selectedSubjects,
          problemCount,
          correctRateRange,
          selectedYears
        };

        const { id } = await createWorksheet(supabase, {
          title: data.title,
          author: data.author,
          filters,
          problems: sortedFilteredProblems,
          contentTree
        });

        worksheetId = id;
      }

      window.location.href = `/worksheets/${worksheetId}`;
    } catch (error) {
      console.error('Error creating worksheet:', error);
      alert('워크시트 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');

    try {
      // Import the agent function dynamically
      const { processUserMessage } = await import('@/lib/ai/agent');

      // Process the message with the AI agent, passing current chat history
      const response = await processUserMessage(userMessage, chatMessages, (problems) => {
        // Update the dialog problems when agent finds results
        setDialogProblems(problems);
      });

      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: response.message
      }]);

    } catch (error) {
      console.error('Error processing message:', error);
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: '죄송합니다. 메시지 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'
      }]);
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">
      {/* Worksheet View - with fade transition */}
      <div
        className={`absolute inset-0 flex flex-col transition-opacity duration-500 ease-in-out ${
          viewMode === 'worksheet' ? 'opacity-100 delay-200' : 'opacity-0 pointer-events-none delay-0'
        }`}
      >
        {/* Top Bar - Worksheet */}
        <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
          <div className="flex items-end gap-2">
            <h1 className="text-lg font-semibold text-[var(--foreground)] leading-none">학습지 생성</h1>
            <span className="text-xs text-[var(--gray-500)] leading-none pb-0.5">
              {sortedFilteredProblems.length}문제
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu
              onOpenChange={(open) => {
                if (open && !user) {
                  triggerAuthBlocker();
                }
              }}
              open={!user ? false : undefined}
            >
              <DropdownMenuTrigger asChild>
                <CustomButton
                  variant="outline"
                  size="sm"
                >
                  <ArrowDownUp className="w-3.5 h-3.5 mr-1.5" />
                  {worksheetMode}
                </CustomButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white w-64">
                <DropdownMenuItem
                  onClick={() => setWorksheetMode('연습')}
                  className="cursor-pointer hover:bg-[var(--gray-100)] transition-colors flex items-start justify-between"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">연습</span>
                    <span className="text-xs text-[var(--gray-500)]">단원별, 난이도순 정렬</span>
                  </div>
                  {worksheetMode === '연습' && <Check className="w-4 h-4 mt-0.5" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setWorksheetMode('실전')}
                  className="cursor-pointer hover:bg-[var(--gray-100)] transition-colors flex items-start justify-between"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">실전</span>
                    <span className="text-xs text-[var(--gray-500)]">무작위 배치</span>
                  </div>
                  {worksheetMode === '실전' && <Check className="w-4 h-4 mt-0.5" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <CustomButton
              variant="outline"
              size="sm"
              onClick={() => requireAuth(() => setViewMode('addProblems'))}
            >
              문제 추가
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              onClick={() => requireAuth(handleCreateWorksheet)}
              disabled={sortedFilteredProblems.length === 0}
            >
              생성
            </CustomButton>
          </div>
        </div>

        {/* Panels - Worksheet */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          {/* Left Panel - Filters */}
          <ResizablePanel defaultSize={60} minSize={30} maxSize={75}>
            <FilterPanel
              contentTree={contentTree}
              selectedMainSubjects={selectedMainSubjects}
              onMainSubjectToggle={handleMainSubjectToggle}
              loading={chaptersLoading}
              error={chaptersError}
              isDialog={false}
            />
          </ResizablePanel>

          {/* Divider */}
          <ResizableHandle withHandle className="w-px bg-[var(--border)]" />

          {/* Right Panel - Preview */}
          <ResizablePanel defaultSize={40} minSize={25} maxSize={70}>
            <div className="h-full overflow-y-auto">
              {isEconomyMode ? (
                <EconomyProblemsPanel
                  filteredProblems={sortedFilteredProblems}
                  problemsLoading={economyLoading || chaptersLoading}
                  problemsError={problemsError}
                  onDeleteProblem={handleDeleteProblem}
                  editedContentsMap={editedContentsMap}
                />
              ) : (
                <ProblemsPanel
                  filteredProblems={sortedFilteredProblems}
                  problemsLoading={problemsLoading || chaptersLoading || !hasSetDefaultSelection}
                  problemsError={problemsError}
                  contentTree={contentTree}
                  onDeleteProblem={handleDeleteProblem}
                  editedContentsMap={editedContentsMap}
                />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Add Problems View - with fade transition */}
      <div
        className={`absolute inset-0 flex flex-col transition-opacity duration-500 ease-in-out ${
          viewMode === 'addProblems' ? 'opacity-100 delay-200' : 'opacity-0 pointer-events-none delay-0'
        }`}
      >
        {/* Top Bar - Add Problems */}
        <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('worksheet')}
              className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--gray-100)] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">문제 추가</h1>
          </div>
          <CustomButton
            variant="primary"
            size="sm"
            onClick={() => {
              // Add dialog problems to the worksheet
              const newProblems = sortedDialogProblems.filter(
                problem => !filteredProblems.some(existing => existing.id === problem.id)
              );
              setFilteredProblems(prev => [...prev, ...newProblems]);
              setViewMode('worksheet');
            }}
            disabled={sortedDialogProblems.length === 0}
          >
            추가
          </CustomButton>
        </div>

        {/* Panels - Add Problems */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          {/* Left Panel - Filters */}
          <ResizablePanel defaultSize={60} minSize={30} maxSize={75}>
            <FilterPanel
              contentTree={contentTree}
              selectedMainSubjects={selectedMainSubjects}
              onMainSubjectToggle={handleMainSubjectToggle}
              loading={chaptersLoading}
              error={chaptersError}
              isDialog={true}
              dialogFilters={{
                selectedChapters: dialogSelectedChapters,
                setSelectedChapters: setDialogSelectedChapters,
                selectedDifficulties: dialogSelectedDifficulties,
                setSelectedDifficulties: setDialogSelectedDifficulties,
                selectedProblemTypes: dialogSelectedProblemTypes,
                setSelectedProblemTypes: setDialogSelectedProblemTypes,
                selectedSubjects: dialogSelectedSubjects,
                setSelectedSubjects: setDialogSelectedSubjects,
                correctRateRange: dialogCorrectRateRange,
                setCorrectRateRange: setDialogCorrectRateRange,
                selectedYears: dialogSelectedYears,
                setSelectedYears: setDialogSelectedYears,
                problemCount: dialogProblemCount,
                setProblemCount: setDialogProblemCount,
                selectedGrades: dialogSelectedGrades,
                setSelectedGrades: setDialogSelectedGrades,
                selectedMonths: dialogSelectedMonths,
                setSelectedMonths: setDialogSelectedMonths,
                selectedExamTypes: dialogSelectedExamTypes,
                setSelectedExamTypes: setDialogSelectedExamTypes,
              }}
            />
          </ResizablePanel>

          {/* Divider */}
          <ResizableHandle withHandle className="w-px bg-[var(--border)]" />

          {/* Right Panel - Preview */}
          <ResizablePanel defaultSize={40} minSize={25} maxSize={70}>
            <div className="h-full overflow-y-auto">
              {isEconomyMode ? (
                <EconomyProblemsPanel
                  filteredProblems={sortedDialogProblems}
                  problemsLoading={economyLoading || chaptersLoading}
                  problemsError={problemsError}
                  onDeleteProblem={(problemId) => setDialogProblems(prev => prev.filter(p => p.id !== problemId))}
                  editedContentsMap={editedContentsMap}
                />
              ) : (
                <ProblemsPanel
                  filteredProblems={sortedDialogProblems}
                  problemsLoading={problemsLoading || chaptersLoading || !hasSetDefaultSelection}
                  problemsError={problemsError}
                  contentTree={contentTree}
                  onDeleteProblem={(problemId) => setDialogProblems(prev => prev.filter(p => p.id !== problemId))}
                  editedContentsMap={editedContentsMap}
                />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Dialog with filtering and AI functionality */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full h-[90vh] p-0 gap-0 overflow-hidden flex flex-col" style={{ maxWidth: 'min(56rem, 90vw)' }}>
          <div className="border-b flex-shrink-0">
            <div className="flex h-12">
              {/* Left half of header */}
              <div className="w-1/2 p-4 border-r border-gray-200 flex items-center justify-between">
                <DialogTitle>문제 추가</DialogTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="ai-mode" className="text-sm">AI 모드</Label>
                  <Switch
                    id="ai-mode"
                    checked={aiMode}
                    onCheckedChange={setAiMode}
                    className="data-[state=checked]:bg-[#FF00A1] data-[state=unchecked]:bg-gray-200 data-[state=checked]:!border-[#FF00A1] data-[state=unchecked]:!border-gray-200 h-[1.15rem] w-8 border shadow-sm focus-visible:ring-[#FF00A1]/50 [&>span]:bg-white [&>span]:data-[state=checked]:translate-x-[calc(100%-2px)]"
                  />
                </div>
              </div>
              {/* Right half of header */}
              <div className="w-1/2 p-4">
                {/* Empty right header space */}
              </div>
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden">
            {aiMode ? (
              /* AI Chat Interface in Dialog */
              <div className="w-1/2 border-r border-gray-200 bg-gray-50 flex flex-col">
                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-600">
                        <div className="text-xl mb-2">KIDARI AI</div>
                        <p className="text-sm text-gray-500">
                          문제 내용으로 검색해보세요
                        </p>
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((message, index) => (
                      <div key={index} className="mb-4">
                        {message.role === 'user' ? (
                          <div className="flex justify-start">
                            <div className="bg-gray-800 text-white pr-4 pt-2.5 pb-2.5 pl-2.5 rounded-lg max-w-[70%] flex items-start gap-3">
                              <div className="flex-shrink-0 w-7 h-7 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                나
                              </div>
                              <div className="text-sm pt-1">
                                {message.content}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-800 leading-relaxed text-sm">
                            {message.content}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4">
                  <div className="border border-gray-300 rounded-lg p-3 flex flex-col gap-3 bg-white">
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="찾고 싶은 문제 내용을 설명해주세요"
                      className="w-full border-0 focus:ring-0 focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-0 py-0 resize-none min-h-0 bg-white"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim()}
                        size="sm"
                        className="bg-black hover:bg-gray-800 text-white w-8 h-8 p-0"
                      >
                        <CornerDownLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Original Filter Panel - with isDialog=true to hide 경제 */
              <FilterPanel
                contentTree={contentTree}
                selectedMainSubjects={selectedMainSubjects}
                onMainSubjectToggle={handleMainSubjectToggle}
                loading={chaptersLoading}
                error={chaptersError}
                isDialog={true}
              />
            )}
            <div className="relative flex-1 flex flex-col">
              <div className="flex-1 overflow-hidden">
                {isEconomyMode ? (
                  <EconomyProblemsPanel
                    filteredProblems={sortedDialogProblems}
                    problemsLoading={economyLoading || chaptersLoading}
                    problemsError={problemsError}
                    onDeleteProblem={(problemId) => {
                      setDialogProblems(prev => prev.filter(p => p.id !== problemId));
                    }}
                    editedContentsMap={editedContentsMap}
                  />
                ) : (
                  <ProblemsPanel
                    filteredProblems={sortedDialogProblems}
                    problemsLoading={problemsLoading || chaptersLoading || !hasSetDefaultSelection}
                    problemsError={problemsError}
                    contentTree={contentTree}
                    onDeleteProblem={(problemId) => {
                      setDialogProblems(prev => prev.filter(p => p.id !== problemId));
                    }}
                    editedContentsMap={editedContentsMap}
                  />
                )}
              </div>

              {/* Sticky Bottom Bar */}
              <div className="h-9 bg-white border-t border-gray-200 pl-4 flex items-center justify-between shadow-lg overflow-hidden">
                <div className="text-xs text-gray-600">
                  {sortedDialogProblems.length}문제
                </div>
                <Button
                  disabled={sortedDialogProblems.length === 0}
                  className="h-9 px-4 text-white bg-black hover:bg-gray-800 rounded-none"
                  onClick={() => {
                    // Add dialog problems to the worksheet
                    const newProblems = sortedDialogProblems.filter(
                      problem => !filteredProblems.some(existing => existing.id === problem.id)
                    );
                    setFilteredProblems(prev => [...prev, ...newProblems]);
                    setIsDialogOpen(false);
                  }}
                >
                  문제 추가
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <WorksheetMetadataDialog
        open={showMetadataDialog}
        onOpenChange={setShowMetadataDialog}
        onSubmit={handleMetadataSubmit}
      />

      {/* Auth blocker overlay */}
      {showAuthBlocker && (
        <div
          className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              dismissAuthBlocker();
            }
          }}
        >
          <AuthenticationBlocker />
        </div>
      )}
    </div>
  );
}
