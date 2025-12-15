'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProblemsPanel from '@/components/build/problemsPanel';
import TaggedProblemsPanel from '@/components/build/TaggedProblemsPanel';
import FilterPanel from '@/components/build/filterPanel';
import WorksheetMetadataPanel from '@/components/build/WorksheetMetadataPanel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { CornerDownLeft, ChevronLeft, Loader, RefreshCw } from 'lucide-react';
import { imageToBase64WithDimensions, createWorksheetWithAnswersDocDefinitionClient, generatePdfWithWorker, type ImageWithDimensions } from '@/lib/pdf/clientUtils';
import PDFViewer from '@/components/pdf/PDFViewer';
import { OMRSheet } from '@/components/solve/OMRSheet';
import dynamic from 'next/dynamic';

const SimplePDFViewer = dynamic(() => import('@/components/solve/SimplePDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader className="animate-spin w-4 h-4 text-gray-600" />
    </div>
  )
});
import { getProblemImageUrl, getAnswerImageUrl } from '@/lib/utils/s3Utils';
import { CustomButton } from '@/components/custom-button';
import { useChapters } from '@/lib/hooks/useChapters';
import { useProblems } from '@/lib/hooks/useProblems';
import { useWorksheetStore } from '@/lib/zustand/worksheetStore';
import { ProblemFilter } from '@/lib/utils/problemFiltering';
import { getTaggedProblems } from '@/lib/supabase/services/clientServices';
import { getSubjectFromProblemId } from '@/lib/supabase/services/taggedWorksheetService';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAuthBlocker } from '@/lib/contexts/auth-blocker-context';
import { AuthenticationBlocker } from '@/components/auth/authentication-blocker';
import type { ProblemMetadata, TaggedProblem } from '@/lib/types/problems';
import type { ChapterTreeItem } from '@/lib/types';
import type { SortRule } from '@/lib/types/sorting';
import { TONGHAP_PRESET_RULES, ECONOMY_PRESET_RULES } from '@/lib/types/sorting';
import { applySortRules } from '@/lib/utils/sorting';
import { saveSolve, getWrongProblemIds, type ProblemResult } from '@/lib/supabase/services/solveService';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

// Convert answer number to circled number character
function getCircledNumber(answer: string | number | undefined): string {
  if (!answer) return '-';
  const num = typeof answer === 'string' ? parseInt(answer) : answer;
  if (num >= 1 && num <= 20) {
    return String.fromCharCode(0x2460 + num - 1);
  }
  return String(answer);
}

interface WorksheetBuilderProps {
  worksheetId?: string;
  autoPdf?: boolean;
}

export default function WorksheetBuilder({ worksheetId, autoPdf }: WorksheetBuilderProps) {
  const router = useRouter();
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
  const [worksheetLoading, setWorksheetLoading] = useState(!!worksheetId);
  const [worksheetCreatedAt, setWorksheetCreatedAt] = useState<string | undefined>(undefined);
  const [hasSetDefaultSelection, setHasSetDefaultSelection] = useState(false);
  // Main worksheet problems - single source of truth for preview, save, PDF
  const [worksheetProblems, setWorksheetProblems] = useState<ProblemMetadata[]>([]);
  // Problems available in "문제 추가" screen (independent from worksheet)
  const [addProblemsPool, setAddProblemsPool] = useState<ProblemMetadata[]>([]);
  const [economyLoading, setEconomyLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sortRules, setSortRules] = useState<SortRule[]>([]);
  const [editedContentsMap, setEditedContentsMap] = useState<Map<string, string> | null>(null);
  const [viewMode, setViewMode] = useState<'worksheet' | 'addProblems' | 'pdfGeneration' | 'solve'>(autoPdf ? 'pdfGeneration' : 'addProblems');
  const [pdfProgress, setPdfProgress] = useState<{ stage: string; percent: number }>(autoPdf ? { stage: '준비 중...', percent: 0 } : { stage: '', percent: 0 });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfElapsedTime, setPdfElapsedTime] = useState(0);
  const pdfElapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [worksheetTitle, setWorksheetTitle] = useState('');
  const [worksheetAuthor, setWorksheetAuthor] = useState('');
  const [savedTitle, setSavedTitle] = useState<string | null>(null); // Title shown in header, only updates on save
  const [validationErrors, setValidationErrors] = useState<{ title?: string; author?: string }>({});
  const [isOwner, setIsOwner] = useState(true); // Default true for new worksheets

  // Solve mode states
  const [solveAnswers, setSolveAnswers] = useState<{[problemNumber: number]: number}>({});
  const [solveGradingResults, setSolveGradingResults] = useState<{[problemNumber: number]: { isCorrect: boolean; correctAnswer: number; score: number }} | null>(null);
  const [solvePdfUrl, setSolvePdfUrl] = useState<string | null>(null);
  const [solvePdfLoading, setSolvePdfLoading] = useState(false);
  const [solveResultDialogOpen, setSolveResultDialogOpen] = useState(false);
  const [solveScore, setSolveScore] = useState<{ score: number; maxScore: number; correctCount: number; totalProblems: number } | null>(null);

  // Filter states for "문제 추가" screen
  const [addProblemsSelectedChapters, setAddProblemsSelectedChapters] = useState<string[]>([]);
  const [addProblemsSelectedDifficulties, setAddProblemsSelectedDifficulties] = useState<string[]>([]);
  const [addProblemsSelectedProblemTypes, setAddProblemsSelectedProblemTypes] = useState<string[]>([]);
  const [addProblemsSelectedSubjects, setAddProblemsSelectedSubjects] = useState<string[]>([]);
  const [addProblemsCorrectRateRange, setAddProblemsCorrectRateRange] = useState<[number, number]>([0, 100]);
  const [addProblemsSelectedYears, setAddProblemsSelectedYears] = useState<number[]>([]);
  const [addProblemsSelectedGrades, setAddProblemsSelectedGrades] = useState<string[]>([]);
  const [addProblemsSelectedMonths, setAddProblemsSelectedMonths] = useState<string[]>([]);
  const [addProblemsSelectedExamTypes, setAddProblemsSelectedExamTypes] = useState<string[]>([]);
  const [addProblemsProblemCount, setAddProblemsProblemCount] = useState<number>(-1);
  const [showOnlyWrongProblems, setShowOnlyWrongProblems] = useState(false);
  const [wrongProblemIds, setWrongProblemIds] = useState<Set<string>>(new Set());
  const [wrongProblemsLoading, setWrongProblemsLoading] = useState(false);

  const { chapters: contentTree, loading: chaptersLoading, error: chaptersError } = useChapters();
  const { problems, loading: problemsLoading, error: problemsError } = useProblems();
  const { user } = useAuth();
  const { showAuthBlocker, triggerAuthBlocker, dismissAuthBlocker } = useAuthBlocker();

  // Check if in manual sort mode (수동) - enables drag & drop
  const isManualSortMode = sortRules.length === 1 && sortRules[0].field === 'manual';

  // Handle manual reorder from drag & drop
  const handleManualReorder = (reorderedProblems: ProblemMetadata[]) => {
    setWorksheetProblems(reorderedProblems);
  };

  // Wrapper function to require auth before executing callback
  const requireAuth = (callback: () => void) => {
    if (!user) {
      triggerAuthBlocker();
      return;
    }
    callback();
  };

  // Check if in tagged subject mode (경제, 사회문화, 생활과윤리)
  const TAGGED_SUBJECTS = ['경제', '사회문화', '생활과윤리'];
  const isTaggedMode = TAGGED_SUBJECTS.some(s => selectedMainSubjects.includes(s));

  // Get current tagged subject (if in tagged mode)
  const currentTaggedSubject = selectedMainSubjects.find(s => TAGGED_SUBJECTS.includes(s));

  // Filter wrong problem IDs to only include those relevant to current mode
  const relevantWrongProblemIds = useMemo(() => {
    if (wrongProblemIds.size === 0) return new Set<string>();

    if (isTaggedMode && currentTaggedSubject) {
      // In tagged mode: only include IDs that start with the current subject
      const filtered = new Set<string>();
      for (const id of wrongProblemIds) {
        if (id.startsWith(currentTaggedSubject + '_')) {
          filtered.add(id);
        }
      }
      return filtered;
    } else {
      // In 통합사회 mode: only include UUIDs (not tagged format)
      // Tagged IDs contain Korean characters, UUIDs don't
      const filtered = new Set<string>();
      for (const id of wrongProblemIds) {
        // UUID format check: doesn't start with Korean subject names
        if (!TAGGED_SUBJECTS.some(subject => id.startsWith(subject + '_'))) {
          filtered.add(id);
        }
      }
      return filtered;
    }
  }, [wrongProblemIds, isTaggedMode, currentTaggedSubject]);

  // Set default sorting to 연습 preset for new worksheets
  // Track the last mode for which sorting was initialized
  const [lastInitializedMode, setLastInitializedMode] = useState<boolean | null>(null);
  useEffect(() => {
    // For new worksheets (no worksheetId), update sort rules when mode changes
    if (!worksheetId) {
      // First initialization OR mode changed
      if (lastInitializedMode === null || lastInitializedMode !== isTaggedMode) {
        const defaultRules = isTaggedMode ? ECONOMY_PRESET_RULES['연습'] : TONGHAP_PRESET_RULES['연습'];
        setSortRules(defaultRules);
        setLastInitializedMode(isTaggedMode);
      }
    }
  }, [worksheetId, isTaggedMode, lastInitializedMode]);

  // Fetch wrong problem IDs only when checkbox is checked
  useEffect(() => {
    if (!user?.id || !showOnlyWrongProblems) {
      // Clear wrong IDs when unchecked
      if (!showOnlyWrongProblems) {
        setWrongProblemIds(new Set());
        setWrongProblemsLoading(false);
      }
      return;
    }

    const fetchWrongProblems = async () => {
      setWrongProblemsLoading(true);
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const ids = await getWrongProblemIds(supabase, user.id);
        setWrongProblemIds(new Set(ids));
      } catch (error) {
        console.error('Error fetching wrong problem IDs:', error);
      } finally {
        setWrongProblemsLoading(false);
      }
    };

    fetchWrongProblems();
  }, [user?.id, showOnlyWrongProblems]);

  // Determine locked subject based on existing worksheet problems
  // Uses getSubjectFromProblemId utility to detect tagged subjects (경제, 사회문화, 생활과윤리)
  // Returns the specific subject name to lock, or 'tonghapsahoe' for 통합사회
  const lockedSubject: '경제' | '사회문화' | '생활과윤리' | 'tonghapsahoe' | null = (() => {
    if (worksheetProblems.length === 0) return null;

    // Check if any problem is from a tagged subject
    for (const problem of worksheetProblems) {
      const subject = getSubjectFromProblemId(problem.id);
      if (subject) {
        // Return the specific tagged subject (경제, 사회문화, or 생활과윤리)
        return subject as '경제' | '사회문화' | '생활과윤리';
      }
    }

    // If no tagged subjects found, it's 통합사회
    return 'tonghapsahoe';
  })();

  // Track recently added problem IDs for visual distinction
  const [recentlyAddedProblemIds, setRecentlyAddedProblemIds] = useState<Set<string>>(new Set());

  // Load/refresh worksheet data function
  const loadWorksheet = async () => {
    if (!worksheetId) {
      setWorksheetLoading(false);
      return;
    }

    try {
      setWorksheetLoading(true);

      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Fetch the worksheet to check if it's economy or regular
      const { data: worksheetMeta, error: metaError } = await supabase
        .from('worksheets')
        .select('selected_problem_ids, filters, title, author, is_public, created_at, created_by')
        .eq('id', worksheetId)
        .single();

      if (metaError) {
        console.error('Worksheet not found:', metaError);
        setWorksheetLoading(false);
        return;
      }

      // Check ownership
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const worksheetOwnerId = worksheetMeta.created_by;
      setIsOwner(currentUser?.id === worksheetOwnerId);

      // Set worksheet metadata
      setWorksheetTitle(worksheetMeta.title || '');
      setWorksheetAuthor(worksheetMeta.author || '');
      setSavedTitle(worksheetMeta.title || null);
      setWorksheetCreatedAt(worksheetMeta.created_at);

      // Detect if it's an economy worksheet by checking problem ID format
      const { isTaggedWorksheet } = await import('@/lib/supabase/services/taggedWorksheetService');
      const isTagged = isTaggedWorksheet(worksheetMeta.selected_problem_ids);

      // Fetch the full worksheet data with problems
      let data;
      if (isTagged) {
        const { getTaggedWorksheet, getSubjectFromProblemId } = await import('@/lib/supabase/services/taggedWorksheetService');
        data = await getTaggedWorksheet(supabase, worksheetId);
        // Detect subject from first problem ID
        const detectedSubject = getSubjectFromProblemId(worksheetMeta.selected_problem_ids[0]) || '경제';
        setSelectedMainSubjects([detectedSubject]);
      } else {
        const { getWorksheet } = await import('@/lib/supabase/services/worksheetService');
        data = await getWorksheet(supabase, worksheetId);
        setSelectedMainSubjects(['7ec63358-5e6b-49be-89a4-8b5639f3f9c0']);
      }

      // Load the problems into the worksheet (already in saved order)
      if (data?.problems) {
        setWorksheetProblems(data.problems);  // Use saved order, don't re-sort
      }

      // Load sorting preferences (but mark as initialized to skip re-sorting)
      if (data?.worksheet?.sorting) {
        setSortRules(data.worksheet.sorting);
      }
      setLastInitializedMode(isTaggedMode);  // Skip re-sorting on load

      // Fetch edited contents for preview
      const { getEditedContents } = await import('@/lib/supabase/services/clientServices');
      const problemIds = data?.problems?.map((p: ProblemMetadata) => p.id) || [];
      const answerIds = data?.problems
        ?.filter((p: ProblemMetadata) => p.answer_filename)
        ?.map((p: ProblemMetadata) => {
          // For tagged subject problems, answer ID replaces _문제 with _해설
          if (getSubjectFromProblemId(p.id) !== null) {
            return p.id.replace('_문제', '_해설');
          }
          return p.id;
        }) || [];
      const allResourceIds = [...problemIds, ...answerIds];
      const fetchedEditedContents = await getEditedContents(allResourceIds);
      setEditedContentsMap(fetchedEditedContents);

      // Start in worksheet view when editing existing worksheet (unless autoPdf)
      if (!autoPdf) {
        setViewMode('worksheet');
      }

    } catch (error) {
      console.error('Error loading worksheet:', error);
    } finally {
      setWorksheetLoading(false);
    }
  };

  // Load existing worksheet data if worksheetId is provided
  useEffect(() => {
    loadWorksheet();
  }, [worksheetId]);

  // Track if autoPdf has been triggered to prevent re-triggering
  const autoPdfTriggeredRef = useRef(false);

  // Auto-trigger PDF generation when autoPdf is true and worksheet is loaded
  useEffect(() => {
    if (autoPdf && !worksheetLoading && worksheetProblems.length > 0 && !autoPdfTriggeredRef.current) {
      autoPdfTriggeredRef.current = true;
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        handleGeneratePdf();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoPdf, worksheetLoading, worksheetProblems.length]);

  // Initialize dialog filters with current worksheet filters when switching to add problems view
  useEffect(() => {
    if (viewMode === 'addProblems' && addProblemsSelectedChapters.length === 0) {
      setAddProblemsSelectedChapters(selectedChapters);
      setAddProblemsSelectedDifficulties(selectedDifficulties);
      setAddProblemsSelectedProblemTypes(selectedProblemTypes);
      setAddProblemsSelectedSubjects(selectedSubjects);
      setAddProblemsCorrectRateRange(correctRateRange);
      setAddProblemsSelectedYears(selectedYears);
      setAddProblemsProblemCount(problemCount);
      setAddProblemsSelectedGrades(selectedGrades);
      setAddProblemsSelectedMonths(selectedMonths);
      setAddProblemsSelectedExamTypes(selectedExamTypes);
    }
  }, [viewMode, addProblemsSelectedChapters.length, selectedChapters, selectedDifficulties, selectedProblemTypes, selectedSubjects, correctRateRange, selectedYears, problemCount, selectedGrades, selectedMonths, selectedExamTypes]);

  // Fetch edited content when problems change (ONLY for tagged subjects)
  useEffect(() => {
    let cancelled = false;

    const fetchEditedContent = async () => {
      if (!isTaggedMode) {
        setEditedContentsMap(new Map());
        return;
      }

      const allProblems = [...worksheetProblems, ...addProblemsPool];

      if (allProblems.length === 0) {
        setEditedContentsMap(null);
        return;
      }

      setEditedContentsMap(null);

      const { getEditedContents } = await import('@/lib/supabase/services/clientServices');

      // Collect both problem IDs and answer IDs for tagged subjects
      const problemIds = allProblems.map(p => p.id);
      const answerIds = allProblems.map(p => p.id.replace('_문제', '_해설'));
      const allResourceIds = Array.from(new Set([...problemIds, ...answerIds]));

      const fetchedEditedContents = await getEditedContents(allResourceIds);

      if (cancelled) return;

      setEditedContentsMap(fetchedEditedContents);
    };

    fetchEditedContent();

    return () => {
      cancelled = true;
    };
  }, [isTaggedMode, worksheetProblems, addProblemsPool]);

  // Simulate clicking 통합사회 2 checkbox when content tree loads (only once)
  useEffect(() => {
    if (isTaggedMode) return;
    if (contentTree && contentTree.length > 0 && !hasSetDefaultSelection) {
      const tonghapsahoe2Id = '7ec63358-5e6b-49be-89a4-8b5639f3f9c0';
      const tonghapsahoe2Item = contentTree.find(item => item.id === tonghapsahoe2Id);

      if (tonghapsahoe2Item) {
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

        const allChildIds = getAllChildIds(tonghapsahoe2Item);
        const itemsToAdd = [tonghapsahoe2Id, ...allChildIds];
        const newSelectedChapters = [...selectedChapters, ...itemsToAdd.filter(id => !selectedChapters.includes(id))];

        setSelectedChapters(newSelectedChapters);
        setHasSetDefaultSelection(true);
      }
    }
  }, [contentTree, hasSetDefaultSelection, setSelectedChapters, selectedChapters, isTaggedMode]);

  // Filter problems for dialog when any filter changes
  useEffect(() => {
    if (aiMode) return;

    if (isTaggedMode) {
      const fetchDialogTaggedProblems = async () => {
        try {
          // Get current selected tagged subject
          const currentSubject = selectedMainSubjects.find(s => TAGGED_SUBJECTS.includes(s)) || '경제';

          const filters = {
            selectedChapterIds: addProblemsSelectedChapters || [],
            selectedGrades: addProblemsSelectedGrades || ['고3'],
            selectedYears: addProblemsSelectedYears || Array.from({ length: 2025 - 2012 + 1 }, (_, i) => 2012 + i),
            selectedMonths: addProblemsSelectedMonths || ['03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
            selectedExamTypes: addProblemsSelectedExamTypes || ['학평', '모평', '수능'],
            selectedDifficulties: addProblemsSelectedDifficulties || ['최상', '상', '중상', '중', '중하', '하'],
            correctRateRange: addProblemsCorrectRateRange as [number, number]
          };

          const taggedData = await getTaggedProblems(currentSubject, filters);

          const convertedProblems: ProblemMetadata[] = taggedData.map((problem) => ({
            id: problem.problem_id,
            problem_filename: `${problem.problem_id}.png`,
            answer_filename: problem.problem_id.replace('_문제', '_해설') + '.png',
            answer: problem.correct_answer,
            chapter_id: problem.tag_ids[problem.tag_ids.length - 1] || null,
            difficulty: problem.difficulty || '중',
            problem_type: `${problem.exam_type} ${problem.year}년 ${parseInt(problem.month)}월`,
            tags: [currentSubject, ...problem.tag_labels],
            related_subjects: [currentSubject],
            correct_rate: problem.accuracy_rate,
            exam_year: parseInt(problem.year),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          const uniqueProblems = convertedProblems.filter((problem, index, self) =>
            index === self.findIndex(p => p.id === problem.id)
          );

          let limitedProblems: ProblemMetadata[];
          if (addProblemsProblemCount === -1) {
            limitedProblems = uniqueProblems;
          } else {
            const shuffled = [...uniqueProblems].sort(() => Math.random() - 0.5);
            limitedProblems = shuffled.slice(0, Math.min(addProblemsProblemCount, shuffled.length));
          }

          // Apply wrong problems filter if enabled (for tagged mode)
          if (showOnlyWrongProblems) {
            // If still loading, show empty list
            if (wrongProblemsLoading) {
              setAddProblemsPool([]);
              return;
            }
            // If loaded but no wrong problems for current mode, show empty
            if (relevantWrongProblemIds.size === 0) {
              setAddProblemsPool([]);
              return;
            }
            limitedProblems = limitedProblems.filter(problem => relevantWrongProblemIds.has(problem.id));
          }

          setAddProblemsPool(limitedProblems);
        } catch (error) {
          console.error('Error fetching tagged problems for dialog:', error);
          setAddProblemsPool([]);
        }
      };

      fetchDialogTaggedProblems();
      return;
    }

    if (!problems || problems.length === 0) return;

    const filters = {
      selectedChapters: addProblemsSelectedChapters,
      selectedDifficulties: addProblemsSelectedDifficulties,
      selectedProblemTypes: addProblemsSelectedProblemTypes,
      selectedSubjects: addProblemsSelectedSubjects,
      problemCount: addProblemsProblemCount,
      contentTree,
      correctRateRange: addProblemsCorrectRateRange,
      selectedYears: addProblemsSelectedYears
    };

    let filtered = ProblemFilter.filterProblems(problems, filters);

    // Apply wrong problems filter if enabled
    if (showOnlyWrongProblems) {
      // If still loading, show empty list
      if (wrongProblemsLoading) {
        setAddProblemsPool([]);
        return;
      }
      // If loaded but no wrong problems for current mode, show empty
      if (relevantWrongProblemIds.size === 0) {
        setAddProblemsPool([]);
        return;
      }
      filtered = filtered.filter(problem => relevantWrongProblemIds.has(problem.id));
    }

    setAddProblemsPool(filtered);
  }, [aiMode, isTaggedMode, selectedMainSubjects, problems, addProblemsSelectedChapters, addProblemsSelectedDifficulties, addProblemsSelectedProblemTypes, addProblemsSelectedSubjects, addProblemsProblemCount, contentTree, addProblemsCorrectRateRange, addProblemsSelectedYears, addProblemsSelectedGrades, addProblemsSelectedExamTypes, addProblemsSelectedMonths, showOnlyWrongProblems, wrongProblemsLoading, relevantWrongProblemIds]);

  // Helper function to sort problems and update worksheetProblems
  const sortAndSetProblems = (problems: ProblemMetadata[], rules: SortRule[]) => {
    if (problems.length === 0) {
      setWorksheetProblems([]);
      return;
    }

    if (!isTaggedMode && !contentTree) {
      setWorksheetProblems(problems);
      return;
    }

    const sorted = applySortRules(problems, rules, {
      isTaggedMode,
      contentTree
    });

    setWorksheetProblems(sorted);
  };

  const handleMainSubjectToggle = (subject: string) => {
    setSelectedMainSubjects([subject]);
  };

  const handleDeleteProblem = (problemId: string) => {
    // Just remove the problem, don't re-sort (keeps remaining in same order)
    setWorksheetProblems(prev => prev.filter(p => p.id !== problemId));
  };

  const handleSaveWorksheet = async () => {
    if (worksheetProblems.length === 0) return;

    const errors: { title?: string; author?: string } = {};
    if (!worksheetTitle.trim()) {
      errors.title = '학습지명을 입력해주세요';
    }
    if (!worksheetAuthor.trim()) {
      errors.author = '출제자를 입력해주세요';
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // If worksheetId exists, update; otherwise create new
      if (worksheetId) {
        // Update existing worksheet
        if (isTaggedMode) {
          const { updateTaggedWorksheet } = await import('@/lib/supabase/services/taggedWorksheetService');

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

          await updateTaggedWorksheet(supabase, worksheetId, {
            title: worksheetTitle,
            author: worksheetAuthor,
            filters: economyFilters,
            problems: worksheetProblems,
            sorting: sortRules
          });
        } else {
          const { updateWorksheetFull } = await import('@/lib/supabase/services/worksheetService');

          const filters = {
            selectedChapters,
            selectedDifficulties,
            selectedProblemTypes,
            selectedSubjects,
            problemCount,
            correctRateRange,
            selectedYears
          };

          await updateWorksheetFull(supabase, worksheetId, {
            title: worksheetTitle,
            author: worksheetAuthor,
            filters,
            problems: worksheetProblems,
            sorting: sortRules
          });
        }

        // Update saved title and show success message
        setSavedTitle(worksheetTitle);
        const { toast } = await import('sonner');
        toast.success('저장되었습니다');
      } else {
        // Create new worksheet
        let newWorksheetId: string;

        if (isTaggedMode) {
          const { createTaggedWorksheet } = await import('@/lib/supabase/services/taggedWorksheetService');

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

          const { id } = await createTaggedWorksheet(supabase, {
            title: worksheetTitle,
            author: worksheetAuthor,
            userId: user?.id,
            filters: economyFilters,
            problems: worksheetProblems,
            sorting: sortRules
          });

          newWorksheetId = id;
        } else {
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
            title: worksheetTitle,
            author: worksheetAuthor,
            userId: user?.id,
            filters,
            problems: worksheetProblems,
            contentTree,
            sorting: sortRules
          });

          newWorksheetId = id;
        }

        // Navigate to the new worksheet page
        router.push(`/w/${newWorksheetId}`);
      }
    } catch {
      alert('워크시트 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // Copy worksheet to user's own worksheets (for non-owners viewing public worksheets)
  const handleCopyToMyWorksheets = async () => {
    if (worksheetProblems.length === 0) return;

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      let newWorksheetId: string;

      if (isTaggedMode) {
        const { createTaggedWorksheet } = await import('@/lib/supabase/services/taggedWorksheetService');

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

        const { id } = await createTaggedWorksheet(supabase, {
          title: worksheetTitle,
          author: worksheetAuthor,
          userId: user?.id,
          filters: economyFilters,
          problems: worksheetProblems,
          sorting: sortRules
        });

        newWorksheetId = id;
      } else {
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
          title: worksheetTitle,
          author: worksheetAuthor,
          userId: user?.id,
          filters,
          problems: worksheetProblems,
          contentTree,
          sorting: sortRules
        });

        newWorksheetId = id;
      }

      // Navigate to the new worksheet page
      router.push(`/w/${newWorksheetId}`);
    } catch {
      alert('학습지 복사 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // Open quick answers in a new window
  const openQuickAnswers = () => {
    const title = worksheetTitle || '학습지명';
    const author = worksheetAuthor || '출제자';
    const date = worksheetCreatedAt
      ? new Date(worksheetCreatedAt).toLocaleDateString('ko-KR')
      : new Date().toLocaleDateString('ko-KR');
    const count = worksheetProblems.length;

    const rows = Array.from({ length: Math.ceil(count / 10) }, (_, rowIndex) => {
      const cells = Array.from({ length: 10 }, (_, colIndex) => {
        const problemIndex = rowIndex * 10 + colIndex;
        const problem = worksheetProblems[problemIndex];
        if (!problem) {
          return '<td class="cell"></td>';
        }
        const circledNum = getCircledNumber(problem.answer);
        return `<td class="cell">
          <div class="cell-content">
            <span class="num">${problemIndex + 1}</span>
            <span class="answer">${circledNum}</span>
          </div>
        </td>`;
      }).join('');
      const rowClass = rowIndex % 2 === 1 ? 'alt-row' : '';
      return `<tr class="${rowClass}">${cells}</tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>빠른 정답 - ${title}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      min-height: 100vh;
      background-color: white;
    }
    .container {
      max-width: 896px;
      margin: 0 auto;
      padding: 32px;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 24px;
    }
    .meta {
      font-size: 0.875rem;
      color: #4b5563;
      margin-bottom: 24px;
    }
    .table-wrapper {
      background-color: white;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      overflow: hidden;
      border: 1px solid #d1d5db;
    }
    table {
      width: 100%;
      font-size: 0.875rem;
      border-collapse: collapse;
    }
    .cell {
      padding: 6px 8px;
      font-size: 0.75rem;
      border: 1px solid #d1d5db;
    }
    .alt-row {
      background-color: rgba(253, 242, 248, 0.3);
    }
    .cell-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .num {
      font-weight: 700;
      font-size: 0.75rem;
      color: #FF00A1;
      min-width: 2ch;
      text-align: right;
    }
    .answer {
      font-size: 1rem;
      color: #374151;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>빠른 정답</h1>
    <div class="meta">${title} - ${author}, ${count}문제, ${date}</div>
    <div class="table-wrapper">
      <table>${rows}</table>
    </div>
  </div>
</body>
</html>`;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  // Solve mode handlers
  const handleEnterSolveMode = () => {
    if (worksheetProblems.length === 0) return;

    // Reset solve state (but keep the pre-generated PDF)
    setSolveAnswers({});
    setSolveGradingResults(null);
    setSolveScore(null);
    setSolveResultDialogOpen(false);
    setViewMode('solve');

    // solvePdfUrl is already generated in handleGeneratePdf, no need to regenerate
  };

  const handleSolveAnswerChange = (problemNumber: number, answer: number) => {
    setSolveAnswers(prev => ({
      ...prev,
      [problemNumber]: answer
    }));
  };

  const handleAutoGrade = async () => {
    if (!worksheetProblems.length || !user) return;

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Fetch correct answers and scores from accuracy_rate table
      const problemIds = worksheetProblems.map(p => p.id);
      const { data: accuracyData, error: accuracyError } = await supabase
        .from('accuracy_rate')
        .select('problem_id, correct_answer, score')
        .in('problem_id', problemIds);

      if (accuracyError) {
        console.error('Error fetching accuracy data:', accuracyError);
        toast.error('채점 중 오류가 발생했습니다.');
        return;
      }

      // Create a map of problem ID to correct answer and score
      const accuracyMap = new Map<string, { correctAnswer: number; score: number }>();
      accuracyData?.forEach(item => {
        accuracyMap.set(item.problem_id, {
          correctAnswer: parseInt(item.correct_answer),
          score: item.score || 2
        });
      });

      // Grade each answer
      const results: {[problemNumber: number]: { isCorrect: boolean; correctAnswer: number; score: number }} = {};
      const problemResults: Record<string, ProblemResult> = {};
      let totalScore = 0;
      let maxScore = 0;
      let correctCount = 0;

      worksheetProblems.forEach((problem, index) => {
        const problemNumber = index + 1;
        const userAnswer = solveAnswers[problemNumber] || 0;
        const accuracyInfo = accuracyMap.get(problem.id);

        if (accuracyInfo) {
          const isCorrect = userAnswer === accuracyInfo.correctAnswer;
          const score = accuracyInfo.score;

          if (isCorrect) {
            correctCount++;
            totalScore += score;
          }
          maxScore += score;

          results[problemNumber] = {
            isCorrect,
            correctAnswer: accuracyInfo.correctAnswer,
            score
          };

          problemResults[problem.id] = {
            user_answer: userAnswer,
            correct_answer: accuracyInfo.correctAnswer,
            is_correct: isCorrect,
            score
          };
        }
      });

      setSolveGradingResults(results);
      setSolveScore({
        score: totalScore,
        maxScore,
        correctCount,
        totalProblems: worksheetProblems.length
      });

      // Save to database
      if (worksheetId) {
        await saveSolve(supabase, {
          worksheetId,
          userId: user.id,
          score: totalScore,
          maxScore,
          correctCount,
          totalProblems: worksheetProblems.length,
          results: problemResults
        });
      }

      // Show result dialog
      setSolveResultDialogOpen(true);

    } catch (error) {
      console.error('Error during auto-grading:', error);
      toast.error('채점 중 오류가 발생했습니다.');
    }
  };

  const handleExitSolveMode = () => {
    // Don't revoke solvePdfUrl - it's pre-generated and can be reused
    setSolveAnswers({});
    setSolveGradingResults(null);
    setSolveScore(null);
    setSolveResultDialogOpen(false);
    setViewMode('pdfGeneration');
  };

  const handleResetSolve = () => {
    setSolveAnswers({});
    setSolveGradingResults(null);
    setSolveScore(null);
    setSolveResultDialogOpen(false);
  };

  const handleGeneratePdf = async () => {
    if (worksheetProblems.length === 0) return;

    setPdfProgress({ stage: '준비 중...', percent: 0 });
    setPdfUrl(null);
    setPdfError(null);
    setPdfElapsedTime(0);
    setViewMode('pdfGeneration');

    if (pdfElapsedTimerRef.current) {
      clearInterval(pdfElapsedTimerRef.current);
    }
    pdfElapsedTimerRef.current = setInterval(() => {
      setPdfElapsedTime(prev => prev + 1);
    }, 1000);

    try {
      setPdfProgress({ stage: '이미지 로딩 중...', percent: 5 });

      const problemImageUrls = worksheetProblems.map(p => {
        const editedUrl = editedContentsMap?.get(p.id);
        return editedUrl || getProblemImageUrl(p.id);
      });

      const answerImageUrls = worksheetProblems.map(p => {
        // For tagged subject problems, answer ID replaces _문제 with _해설
        const isTaggedSubject = getSubjectFromProblemId(p.id) !== null;
        const answerId = isTaggedSubject ? p.id.replace('_문제', '_해설') : p.id;
        const editedUrl = editedContentsMap?.get(answerId);
        return editedUrl || getAnswerImageUrl(p.id);
      });

      const problemImages: ImageWithDimensions[] = [];
      const answerImages: ImageWithDimensions[] = [];

      for (let i = 0; i < problemImageUrls.length; i++) {
        const percent = 5 + Math.round((i / problemImageUrls.length) * 20);
        setPdfProgress({ stage: `문제 이미지 로딩 중... (${i + 1}/${problemImageUrls.length})`, percent });

        try {
          const imgData = await imageToBase64WithDimensions(problemImageUrls[i]);
          problemImages.push(imgData);
        } catch (err) {
          console.error(`Failed to load problem image ${i}:`, err);
          problemImages.push({ base64: '', width: 0, height: 0 });
        }
      }

      for (let i = 0; i < answerImageUrls.length; i++) {
        const percent = 25 + Math.round((i / answerImageUrls.length) * 20);
        setPdfProgress({ stage: `해설 이미지 로딩 중... (${i + 1}/${answerImageUrls.length})`, percent });

        try {
          const imgData = await imageToBase64WithDimensions(answerImageUrls[i]);
          answerImages.push(imgData);
        } catch (err) {
          console.error(`Failed to load answer image ${i}:`, err);
          answerImages.push({ base64: '', width: 0, height: 0 });
        }
      }

      setPdfProgress({ stage: '문서 생성 중...', percent: 50 });
      const base64ProblemImages = problemImages.map(img => img.base64);
      const base64AnswerImages = answerImages.map(img => img.base64);
      const problemHeights = problemImages.map(img => img.height);
      const answerHeights = answerImages.map(img => img.height);

      // Detect subject from first problem ID - for tagged subjects (경제, 사회문화, 생활과윤리) or default to 통합사회
      const detectedSubject = worksheetProblems[0] ? getSubjectFromProblemId(worksheetProblems[0].id) : null;
      const subject = detectedSubject || '통합사회';

      // Prepare problem metadata for PDF badges
      const problemMetadataForPdf = worksheetProblems.map(problem => ({
        tags: problem.tags,
        difficulty: problem.difficulty,
        problem_type: problem.problem_type,
        related_subjects: problem.related_subjects,
        correct_rate: problem.correct_rate,
        exam_year: problem.exam_year,
      }));

      const docDefinition = await createWorksheetWithAnswersDocDefinitionClient(
        problemImageUrls,
        base64ProblemImages,
        answerImageUrls,
        base64AnswerImages,
        worksheetTitle || '학습지명',
        worksheetAuthor || '출제자',
        worksheetCreatedAt,
        subject,
        problemMetadataForPdf,
        problemHeights,
        answerHeights
      );

      setPdfProgress({ stage: 'PDF 생성 중...', percent: 60 });

      const blob = await generatePdfWithWorker(docDefinition, (progress) => {
        if (progress.stage === 'complete') {
          setPdfProgress({ stage: '완료!', percent: 100 });
        }
      });

      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      // For tagged subjects, also pre-generate solve PDF (problems only)
      if (isTaggedMode) {
        setPdfProgress({ stage: '풀이용 PDF 생성 중...', percent: 90 });
        const solveDocDefinition = await createWorksheetWithAnswersDocDefinitionClient(
          problemImageUrls,
          base64ProblemImages,
          [], // No answer images for solve mode
          [],
          worksheetTitle || '학습지명',
          worksheetAuthor || '출제자',
          worksheetCreatedAt,
          subject,
          problemMetadataForPdf,
          problemHeights,
          []
        );
        const solveBlob = await generatePdfWithWorker(solveDocDefinition, () => {});
        const solveUrl = URL.createObjectURL(solveBlob);
        setSolvePdfUrl(solveUrl);
      }

      setPdfProgress({ stage: '완료!', percent: 100 });

      if (pdfElapsedTimerRef.current) {
        clearInterval(pdfElapsedTimerRef.current);
        pdfElapsedTimerRef.current = null;
      }

    } catch (error) {
      console.error('PDF generation error:', error);
      setPdfError('PDF 생성 중 오류가 발생했습니다.');
      setPdfProgress({ stage: '오류 발생', percent: 0 });

      if (pdfElapsedTimerRef.current) {
        clearInterval(pdfElapsedTimerRef.current);
        pdfElapsedTimerRef.current = null;
      }
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');

    try {
      const { processUserMessage } = await import('@/lib/ai/agent');

      const response = await processUserMessage(userMessage, chatMessages, (problems) => {
        setAddProblemsPool(problems);
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

  // Show loading state when loading existing worksheet
  if (worksheetLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader className="animate-spin w-4 h-4" />
      </div>
    );
  }

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
            <h1 className="text-lg font-semibold leading-none text-[var(--foreground)]">
              {worksheetId ? (savedTitle || '학습지명') : '새 학습지'}
            </h1>
            <span className="text-xs text-[var(--gray-500)] leading-none pb-0.5">
              {worksheetProblems.length}문제
            </span>
          </div>
          <div className="flex items-center gap-2">
            {worksheetId && isOwner && (
              <button
                onClick={loadWorksheet}
                disabled={worksheetLoading}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                title="저장된 상태로 되돌리기"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${worksheetLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            {isOwner && (
              <CustomButton
                variant="outline"
                size="sm"
                onClick={() => requireAuth(() => setViewMode('addProblems'))}
              >
                문제 추가
              </CustomButton>
            )}
            <CustomButton
              variant="outline"
              size="sm"
              onClick={handleGeneratePdf}
              disabled={worksheetProblems.length === 0}
            >
              PDF 생성
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              onClick={() => requireAuth(isOwner ? handleSaveWorksheet : handleCopyToMyWorksheets)}
              disabled={worksheetProblems.length === 0}
            >
              {isOwner ? '저장' : '내 학습지에 저장'}
            </CustomButton>
          </div>
        </div>

        {/* Panels - Worksheet */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          <ResizablePanel defaultSize={60} minSize={30} maxSize={75}>
            <WorksheetMetadataPanel
              title={worksheetTitle}
              setTitle={(value) => {
                setWorksheetTitle(value);
                if (validationErrors.title) {
                  setValidationErrors(prev => ({ ...prev, title: undefined }));
                }
              }}
              author={worksheetAuthor}
              setAuthor={(value) => {
                setWorksheetAuthor(value);
                if (validationErrors.author) {
                  setValidationErrors(prev => ({ ...prev, author: undefined }));
                }
              }}
              sortRules={sortRules}
              setSortRules={(rules) => {
                setSortRules(rules);
                // Re-sort worksheetProblems with new rules
                sortAndSetProblems(worksheetProblems, rules);
              }}
              isTaggedMode={isTaggedMode}
              errors={validationErrors}
              readOnly={!isOwner}
            />
          </ResizablePanel>

          <ResizableHandle withHandle className="w-px bg-[var(--border)]" />

          <ResizablePanel defaultSize={40} minSize={25} maxSize={70}>
            <div className="h-full overflow-y-auto">
              {isTaggedMode ? (
                <TaggedProblemsPanel
                  filteredProblems={worksheetProblems}
                  problemsLoading={economyLoading || chaptersLoading}
                  problemsError={problemsError}
                  onDeleteProblem={isOwner ? handleDeleteProblem : undefined}
                  editedContentsMap={editedContentsMap}
                  emptyMessage="문제 추가를 눌러 문제를 추가하세요."
                  addedProblemIds={recentlyAddedProblemIds}
                  isManualSortMode={isManualSortMode}
                  onReorder={handleManualReorder}
                />
              ) : (
                <ProblemsPanel
                  filteredProblems={worksheetProblems}
                  problemsLoading={problemsLoading || chaptersLoading || !hasSetDefaultSelection}
                  problemsError={problemsError}
                  contentTree={contentTree}
                  onDeleteProblem={isOwner ? handleDeleteProblem : undefined}
                  editedContentsMap={editedContentsMap}
                  emptyMessage="문제 추가를 눌러 문제를 추가하세요."
                  addedProblemIds={recentlyAddedProblemIds}
                  isManualSortMode={isManualSortMode}
                  onReorder={handleManualReorder}
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
              onClick={() => requireAuth(() => setViewMode('worksheet'))}
              className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--gray-100)] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-end gap-2">
              <h1 className="text-lg font-semibold leading-none text-[var(--foreground)]">문제 추가</h1>
              <span className="text-xs text-[var(--gray-500)] leading-none pb-0.5">
                {addProblemsPool.length}문제
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* 오답만 checkbox - always show when user is logged in */}
            {user && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showOnlyWrongProblems}
                  onCheckedChange={(checked) => setShowOnlyWrongProblems(checked === true)}
                  className="data-[state=checked]:bg-[#FF00A1] data-[state=checked]:border-[#FF00A1] data-[state=checked]:text-white"
                />
                <span className="text-sm text-gray-600">오답만</span>
              </label>
            )}
            <CustomButton
              variant="primary"
              size="sm"
              onClick={() => requireAuth(() => {
                const newProblems = addProblemsPool.filter(
                  problem => !worksheetProblems.some(existing => existing.id === problem.id)
                );
                // Add new problems and apply sorting
                const allProblems = [...worksheetProblems, ...newProblems];
                sortAndSetProblems(allProblems, sortRules);
                setRecentlyAddedProblemIds(new Set(newProblems.map(p => p.id)));
                setViewMode('worksheet');
              })}
              disabled={addProblemsPool.length === 0}
            >
              추가
            </CustomButton>
          </div>
        </div>

        {/* Panels - Add Problems */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          <ResizablePanel defaultSize={60} minSize={30} maxSize={75}>
            <FilterPanel
              contentTree={contentTree}
              selectedMainSubjects={selectedMainSubjects}
              onMainSubjectToggle={handleMainSubjectToggle}
              loading={chaptersLoading}
              error={chaptersError}
              lockedSubject={lockedSubject}
              dialogFilters={{
                selectedChapters: addProblemsSelectedChapters,
                setSelectedChapters: setAddProblemsSelectedChapters,
                selectedDifficulties: addProblemsSelectedDifficulties,
                setSelectedDifficulties: setAddProblemsSelectedDifficulties,
                selectedProblemTypes: addProblemsSelectedProblemTypes,
                setSelectedProblemTypes: setAddProblemsSelectedProblemTypes,
                selectedSubjects: addProblemsSelectedSubjects,
                setSelectedSubjects: setAddProblemsSelectedSubjects,
                correctRateRange: addProblemsCorrectRateRange,
                setCorrectRateRange: setAddProblemsCorrectRateRange,
                selectedYears: addProblemsSelectedYears,
                setSelectedYears: setAddProblemsSelectedYears,
                problemCount: addProblemsProblemCount,
                setProblemCount: setAddProblemsProblemCount,
                selectedGrades: addProblemsSelectedGrades,
                setSelectedGrades: setAddProblemsSelectedGrades,
                selectedMonths: addProblemsSelectedMonths,
                setSelectedMonths: setAddProblemsSelectedMonths,
                selectedExamTypes: addProblemsSelectedExamTypes,
                setSelectedExamTypes: setAddProblemsSelectedExamTypes,
              }}
            />
          </ResizablePanel>

          <ResizableHandle withHandle className="w-px bg-[var(--border)]" />

          <ResizablePanel defaultSize={40} minSize={25} maxSize={70}>
            <div className="h-full overflow-y-auto">
              {isTaggedMode ? (
                <TaggedProblemsPanel
                  filteredProblems={addProblemsPool}
                  problemsLoading={economyLoading || chaptersLoading}
                  problemsError={problemsError}
                  onDeleteProblem={(problemId) => setAddProblemsPool(prev => prev.filter(p => p.id !== problemId))}
                  editedContentsMap={editedContentsMap}
                />
              ) : (
                <ProblemsPanel
                  filteredProblems={addProblemsPool}
                  problemsLoading={problemsLoading || chaptersLoading || !hasSetDefaultSelection}
                  problemsError={problemsError}
                  contentTree={contentTree}
                  onDeleteProblem={(problemId) => setAddProblemsPool(prev => prev.filter(p => p.id !== problemId))}
                  editedContentsMap={editedContentsMap}
                />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* PDF Generation View - with fade transition */}
      <div
        className={`absolute inset-0 flex flex-col transition-opacity duration-500 ease-in-out ${
          viewMode === 'pdfGeneration' ? 'opacity-100 delay-200' : 'opacity-0 pointer-events-none delay-0'
        }`}
      >
        <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            {!autoPdf && (
              <button
                onClick={() => {
                  if (pdfElapsedTimerRef.current) {
                    clearInterval(pdfElapsedTimerRef.current);
                    pdfElapsedTimerRef.current = null;
                  }
                  if (pdfUrl) {
                    URL.revokeObjectURL(pdfUrl);
                  }
                  if (solvePdfUrl) {
                    URL.revokeObjectURL(solvePdfUrl);
                  }
                  setPdfUrl(null);
                  setSolvePdfUrl(null);
                  setPdfError(null);
                  setPdfProgress({ stage: '', percent: 0 });
                  setPdfElapsedTime(0);
                  setViewMode('worksheet');
                }}
                className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--gray-100)] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              PDF 생성
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <CustomButton
              variant="outline"
              size="sm"
              disabled={!pdfUrl}
              onClick={openQuickAnswers}
            >
              빠른 정답
            </CustomButton>
            {isTaggedMode && (
              <CustomButton
                variant="outline"
                size="sm"
                disabled={!pdfUrl}
                onClick={() => requireAuth(handleEnterSolveMode)}
              >
                풀기
              </CustomButton>
            )}
          </div>
        </div>

        {pdfError ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--gray-50)]">
            <div className="text-center">
              <div className="text-red-500 mb-2">{pdfError}</div>
              <CustomButton variant="outline" size="sm" onClick={() => setViewMode('worksheet')}>
                돌아가기
              </CustomButton>
            </div>
          </div>
        ) : pdfUrl ? (
          <PDFViewer
            pdfUrl={pdfUrl}
            hideHeader={true}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--gray-50)]">
            <div className="flex flex-col items-center gap-4">
              <Loader className="animate-spin w-4 h-4" />
              {pdfProgress.stage && (
                <div className="w-64 text-center">
                  <div className="text-xs text-gray-500 mb-2">{pdfProgress.stage}</div>
                  <div className="w-full h-1 bg-gray-200 rounded">
                    <div
                      className="h-1 bg-[#FF00A1] rounded transition-all duration-300"
                      style={{ width: `${pdfProgress.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{pdfProgress.percent}%</span>
                    <span>{pdfElapsedTime}초</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Solve View - with fade transition */}
      <div
        className={`absolute inset-0 flex flex-col transition-opacity duration-500 ease-in-out ${
          viewMode === 'solve' ? 'opacity-100 delay-200' : 'opacity-0 pointer-events-none delay-0'
        }`}
      >
        {/* Top Bar - Solve */}
        <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExitSolveMode}
              className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--gray-100)] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              풀기
            </h1>
            <span className="text-xs text-[var(--gray-500)]">
              {worksheetProblems.length}문제
            </span>
          </div>
          <div className="flex items-center gap-2">
            {solveGradingResults ? (
              <CustomButton
                variant="outline"
                size="sm"
                onClick={handleResetSolve}
              >
                다시 풀기
              </CustomButton>
            ) : (
              <>
                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={handleAutoGrade}
                >
                  자동 채점
                </CustomButton>
                <CustomButton
                  variant="primary"
                  size="sm"
                  onClick={handleAutoGrade}
                >
                  저장
                </CustomButton>
              </>
            )}
          </div>
        </div>

        {/* Solve Content - OMR left, PDF right */}
        <div className="flex-1 flex overflow-hidden bg-gray-100">
          {/* OMR Sheet - Left Side with padding */}
          <div className="w-52 shrink-0 p-4 pr-0 overflow-hidden flex flex-col">
            <OMRSheet
              problemCount={worksheetProblems.length}
              answers={solveAnswers}
              onAnswerChange={handleSolveAnswerChange}
              gradingResults={solveGradingResults}
            />
          </div>

          {/* PDF Viewer - Right Side */}
          <div className="flex-1 overflow-hidden">
            {solvePdfLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <Loader className="animate-spin w-4 h-4" />
                  <span className="text-xs text-gray-500">PDF 생성 중...</span>
                </div>
              </div>
            ) : solvePdfUrl ? (
              <SimplePDFViewer
                pdfUrl={solvePdfUrl}
                onError={(error) => console.error('PDF error:', error)}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-gray-500">PDF를 불러올 수 없습니다.</span>
              </div>
            )}
          </div>
        </div>

        {/* Score Result Dialog */}
        <Dialog open={solveResultDialogOpen} onOpenChange={setSolveResultDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle className="text-center text-lg font-semibold">
              채점 결과
            </DialogTitle>
            {solveScore && (
              <div className="py-6">
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-[#FF00A1] mb-2">
                    {solveScore.score}/{solveScore.maxScore}점
                  </div>
                  <div className="text-gray-600">
                    {solveScore.correctCount}/{solveScore.totalProblems}문제 정답
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF00A1] transition-all duration-500"
                    style={{ width: `${(solveScore.score / solveScore.maxScore) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <CustomButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setSolveResultDialogOpen(false);
                  handleResetSolve();
                }}
              >
                다시 풀기
              </CustomButton>
              <CustomButton
                variant="primary"
                size="sm"
                onClick={() => setSolveResultDialogOpen(false)}
              >
                확인
              </CustomButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog with filtering and AI functionality */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full h-[90vh] p-0 gap-0 overflow-hidden flex flex-col" style={{ maxWidth: 'min(56rem, 90vw)' }}>
          <div className="border-b flex-shrink-0">
            <div className="flex h-12">
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
              <div className="w-1/2 p-4">
              </div>
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden">
            {aiMode ? (
              <div className="w-1/2 border-r border-gray-200 bg-gray-50 flex flex-col">
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
                {isTaggedMode ? (
                  <TaggedProblemsPanel
                    filteredProblems={addProblemsPool}
                    problemsLoading={economyLoading || chaptersLoading}
                    problemsError={problemsError}
                    onDeleteProblem={(problemId) => {
                      setAddProblemsPool(prev => prev.filter(p => p.id !== problemId));
                    }}
                    editedContentsMap={editedContentsMap}
                  />
                ) : (
                  <ProblemsPanel
                    filteredProblems={addProblemsPool}
                    problemsLoading={problemsLoading || chaptersLoading || !hasSetDefaultSelection}
                    problemsError={problemsError}
                    contentTree={contentTree}
                    onDeleteProblem={(problemId) => {
                      setAddProblemsPool(prev => prev.filter(p => p.id !== problemId));
                    }}
                    editedContentsMap={editedContentsMap}
                  />
                )}
              </div>

              <div className="h-9 bg-white border-t border-gray-200 px-4 flex items-center justify-between shadow-lg overflow-hidden">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600">
                    {addProblemsPool.length}문제
                  </span>
                  {/* 오답만 checkbox for mobile */}
                  {user && (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={showOnlyWrongProblems}
                        onCheckedChange={(checked) => setShowOnlyWrongProblems(checked === true)}
                        className="w-3.5 h-3.5 data-[state=checked]:bg-[#FF00A1] data-[state=checked]:border-[#FF00A1] data-[state=checked]:text-white"
                      />
                      <span className="text-xs text-gray-600">오답만</span>
                    </label>
                  )}
                </div>
                <Button
                  disabled={addProblemsPool.length === 0}
                  className="h-9 px-4 text-white bg-black hover:bg-gray-800 rounded-none"
                  onClick={() => {
                    const newProblems = addProblemsPool.filter(
                      problem => !worksheetProblems.some(existing => existing.id === problem.id)
                    );
                    // Add new problems and apply sorting
                    const allProblems = [...worksheetProblems, ...newProblems];
                    sortAndSetProblems(allProblems, sortRules);
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
