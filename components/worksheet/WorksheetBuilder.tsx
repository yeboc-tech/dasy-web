'use client';

import { useState, useEffect, useRef } from 'react';
import ProblemsPanel from '@/components/build/problemsPanel';
import EconomyProblemsPanel from '@/components/build/EconomyProblemsPanel';
import FilterPanel from '@/components/build/filterPanel';
import WorksheetMetadataPanel from '@/components/build/WorksheetMetadataPanel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { CornerDownLeft, ChevronLeft, Loader } from 'lucide-react';
import { imageToBase64WithDimensions, createWorksheetWithAnswersDocDefinitionClient, generatePdfWithWorker, type ImageWithDimensions } from '@/lib/pdf/clientUtils';
import PDFViewer from '@/components/pdf/PDFViewer';
import { getProblemImageUrl, getAnswerImageUrl } from '@/lib/utils/s3Utils';
import { CustomButton } from '@/components/custom-button';
import { useChapters } from '@/lib/hooks/useChapters';
import { useProblems } from '@/lib/hooks/useProblems';
import { useWorksheetStore } from '@/lib/zustand/worksheetStore';
import { ProblemFilter } from '@/lib/utils/problemFiltering';
import { getEconomyProblems } from '@/lib/supabase/services/clientServices';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAuthBlocker } from '@/lib/contexts/auth-blocker-context';
import { AuthenticationBlocker } from '@/components/auth/authentication-blocker';
import type { ProblemMetadata, EconomyProblem } from '@/lib/types/problems';
import type { ChapterTreeItem } from '@/lib/types';
import type { SortRule } from '@/lib/types/sorting';
import { applySortRules } from '@/lib/utils/sorting';

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
}

export default function WorksheetBuilder({ worksheetId }: WorksheetBuilderProps) {
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
  const [filteredProblems, setFilteredProblems] = useState<ProblemMetadata[]>([]);
  const [dialogProblems, setDialogProblems] = useState<ProblemMetadata[]>([]);
  const [economyLoading, setEconomyLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sortRules, setSortRules] = useState<SortRule[]>([]);
  const [sortedFilteredProblems, setSortedFilteredProblems] = useState<ProblemMetadata[]>([]);
  const [editedContentsMap, setEditedContentsMap] = useState<Map<string, string> | null>(null);
  const [viewMode, setViewMode] = useState<'worksheet' | 'addProblems' | 'pdfGeneration'>('addProblems');
  const [pdfProgress, setPdfProgress] = useState<{ stage: string; percent: number }>({ stage: '', percent: 0 });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfElapsedTime, setPdfElapsedTime] = useState(0);
  const pdfElapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [worksheetTitle, setWorksheetTitle] = useState('');
  const [worksheetAuthor, setWorksheetAuthor] = useState('');
  const [savedTitle, setSavedTitle] = useState<string | null>(null); // Title shown in header, only updates on save
  const [validationErrors, setValidationErrors] = useState<{ title?: string; author?: string }>({});

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

  // Determine locked subject based on existing worksheet problems
  const lockedSubject = filteredProblems.length === 0
    ? null
    : filteredProblems.some(p => p.id.startsWith('경제_'))
      ? 'economy'
      : 'tonghapsahoe';

  // Track recently added problem IDs for visual distinction
  const [recentlyAddedProblemIds, setRecentlyAddedProblemIds] = useState<Set<string>>(new Set());

  // Load existing worksheet data if worksheetId is provided
  useEffect(() => {
    if (!worksheetId) {
      setWorksheetLoading(false);
      return;
    }

    const loadWorksheet = async () => {
      try {
        setWorksheetLoading(true);

        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // Fetch the worksheet to check if it's economy or regular
        const { data: worksheetMeta, error: metaError } = await supabase
          .from('worksheets')
          .select('selected_problem_ids, filters, title, author, is_public, created_at')
          .eq('id', worksheetId)
          .single();

        if (metaError) {
          console.error('Worksheet not found:', metaError);
          setWorksheetLoading(false);
          return;
        }

        // Set worksheet metadata
        setWorksheetTitle(worksheetMeta.title || '');
        setWorksheetAuthor(worksheetMeta.author || '');
        setSavedTitle(worksheetMeta.title || null);
        setWorksheetCreatedAt(worksheetMeta.created_at);

        // Detect if it's an economy worksheet by checking problem ID format
        const { isEconomyWorksheet } = await import('@/lib/supabase/services/economyWorksheetService');
        const isEconomy = isEconomyWorksheet(worksheetMeta.selected_problem_ids);

        // Fetch the full worksheet data with problems
        let data;
        if (isEconomy) {
          const { getEconomyWorksheet } = await import('@/lib/supabase/services/economyWorksheetService');
          data = await getEconomyWorksheet(supabase, worksheetId);
          setSelectedMainSubjects(['economy']);
        } else {
          const { getWorksheet } = await import('@/lib/supabase/services/worksheetService');
          data = await getWorksheet(supabase, worksheetId);
          setSelectedMainSubjects(['7ec63358-5e6b-49be-89a4-8b5639f3f9c0']);
        }

        // Load the problems into the worksheet
        if (data?.problems) {
          setFilteredProblems(data.problems);
          setSortedFilteredProblems(data.problems);
        }

        // Load sorting preferences
        if (data?.worksheet?.sorting) {
          setSortRules(data.worksheet.sorting);
        }

        // Fetch edited contents for preview
        const { getEditedContents } = await import('@/lib/supabase/services/clientServices');
        const problemIds = data?.problems?.map((p: ProblemMetadata) => p.id) || [];
        const answerIds = data?.problems
          ?.filter((p: ProblemMetadata) => p.answer_filename)
          ?.map((p: ProblemMetadata) => {
            if (p.id.startsWith('경제_')) {
              return p.id.replace('_문제', '_해설');
            }
            return p.id;
          }) || [];
        const allResourceIds = [...problemIds, ...answerIds];
        const fetchedEditedContents = await getEditedContents(allResourceIds);
        setEditedContentsMap(fetchedEditedContents);

        // Start in worksheet view when editing existing worksheet
        setViewMode('worksheet');

      } catch (error) {
        console.error('Error loading worksheet:', error);
      } finally {
        setWorksheetLoading(false);
      }
    };

    loadWorksheet();
  }, [worksheetId]);

  // Initialize dialog filters with current worksheet filters when switching to add problems view
  useEffect(() => {
    if (viewMode === 'addProblems' && dialogSelectedChapters.length === 0) {
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
      if (!isEconomyMode) {
        setEditedContentsMap(new Map());
        return;
      }

      const allProblems = [...filteredProblems, ...dialogProblems];

      if (allProblems.length === 0) {
        setEditedContentsMap(null);
        return;
      }

      setEditedContentsMap(null);

      const { getEditedContents } = await import('@/lib/supabase/services/clientServices');
      const allResourceIds = Array.from(new Set(allProblems.map(p => p.id)));
      const fetchedEditedContents = await getEditedContents(allResourceIds);

      if (cancelled) return;

      setEditedContentsMap(fetchedEditedContents);
    };

    fetchEditedContent();

    return () => {
      cancelled = true;
    };
  }, [isEconomyMode, filteredProblems, dialogProblems]);

  // Simulate clicking 통합사회 2 checkbox when content tree loads (only once)
  useEffect(() => {
    if (isEconomyMode) return;
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
  }, [contentTree, hasSetDefaultSelection, setSelectedChapters, selectedChapters, isEconomyMode]);

  // Filter problems for dialog when any filter changes
  useEffect(() => {
    if (aiMode) return;

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

          const uniqueProblems = convertedProblems.filter((problem, index, self) =>
            index === self.findIndex(p => p.id === problem.id)
          );

          let limitedProblems: ProblemMetadata[];
          if (dialogProblemCount === -1) {
            limitedProblems = uniqueProblems;
          } else {
            const shuffled = [...uniqueProblems].sort(() => Math.random() - 0.5);
            limitedProblems = shuffled.slice(0, Math.min(dialogProblemCount, shuffled.length));
          }

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

  // Sort main page problems based on sort rules
  useEffect(() => {
    if (!filteredProblems || filteredProblems.length === 0) {
      setSortedFilteredProblems([]);
      return;
    }

    if (!isEconomyMode && !contentTree) {
      setSortedFilteredProblems([]);
      return;
    }

    const sorted = applySortRules(filteredProblems, sortRules, {
      isEconomyMode,
      contentTree
    });

    setSortedFilteredProblems(sorted);
  }, [filteredProblems, sortRules, contentTree, isEconomyMode]);


  const handleMainSubjectToggle = (subject: string) => {
    setSelectedMainSubjects([subject]);
  };

  const handleDeleteProblem = (problemId: string) => {
    setFilteredProblems(prev => prev.filter(p => p.id !== problemId));
  };

  const handleSaveWorksheet = async () => {
    if (sortedFilteredProblems.length === 0) return;

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
        if (isEconomyMode) {
          const { updateEconomyWorksheet } = await import('@/lib/supabase/services/economyWorksheetService');

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

          await updateEconomyWorksheet(supabase, worksheetId, {
            title: worksheetTitle,
            author: worksheetAuthor,
            filters: economyFilters,
            problems: sortedFilteredProblems,
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
            problems: sortedFilteredProblems,
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

        if (isEconomyMode) {
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
            title: worksheetTitle,
            author: worksheetAuthor,
            userId: user?.id,
            filters: economyFilters,
            problems: sortedFilteredProblems,
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
            problems: sortedFilteredProblems,
            contentTree,
            sorting: sortRules
          });

          newWorksheetId = id;
        }

        // Navigate to the new worksheet page
        window.location.href = `/w/${newWorksheetId}`;
      }
    } catch (error) {
      console.error('Error saving worksheet:', error);
      alert('워크시트 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // Open quick answers in a new window
  const openQuickAnswers = () => {
    const title = worksheetTitle || '학습지명';
    const author = worksheetAuthor || '출제자';
    const date = worksheetCreatedAt
      ? new Date(worksheetCreatedAt).toLocaleDateString('ko-KR')
      : new Date().toLocaleDateString('ko-KR');
    const count = sortedFilteredProblems.length;

    const rows = Array.from({ length: Math.ceil(count / 10) }, (_, rowIndex) => {
      const cells = Array.from({ length: 10 }, (_, colIndex) => {
        const problemIndex = rowIndex * 10 + colIndex;
        const problem = sortedFilteredProblems[problemIndex];
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

  const handleGeneratePdf = async () => {
    if (sortedFilteredProblems.length === 0) return;

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

      const problemImageUrls = sortedFilteredProblems.map(p => {
        const editedUrl = editedContentsMap?.get(p.id);
        return editedUrl || getProblemImageUrl(p.id);
      });

      const answerImageUrls = sortedFilteredProblems.map(p => {
        const answerId = p.id.startsWith('경제_') ? p.id.replace('_문제', '_해설') : p.id;
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

      const subject = sortedFilteredProblems[0]?.id.startsWith('경제_') ? '경제' : '통합사회';

      const docDefinition = await createWorksheetWithAnswersDocDefinitionClient(
        problemImageUrls,
        base64ProblemImages,
        answerImageUrls,
        base64AnswerImages,
        worksheetTitle || '학습지명',
        worksheetAuthor || '출제자',
        worksheetCreatedAt,
        subject,
        undefined,
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
              {sortedFilteredProblems.length}문제
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CustomButton
              variant="outline"
              size="sm"
              onClick={() => requireAuth(() => setViewMode('addProblems'))}
            >
              문제 추가
            </CustomButton>
            <CustomButton
              variant="outline"
              size="sm"
              onClick={() => requireAuth(handleGeneratePdf)}
              disabled={sortedFilteredProblems.length === 0}
            >
              PDF 생성
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              onClick={() => requireAuth(handleSaveWorksheet)}
              disabled={sortedFilteredProblems.length === 0}
            >
              저장
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
              setSortRules={setSortRules}
              isEconomyMode={isEconomyMode}
              errors={validationErrors}
            />
          </ResizablePanel>

          <ResizableHandle withHandle className="w-px bg-[var(--border)]" />

          <ResizablePanel defaultSize={40} minSize={25} maxSize={70}>
            <div className="h-full overflow-y-auto">
              {isEconomyMode ? (
                <EconomyProblemsPanel
                  filteredProblems={sortedFilteredProblems}
                  problemsLoading={economyLoading || chaptersLoading}
                  problemsError={problemsError}
                  onDeleteProblem={handleDeleteProblem}
                  editedContentsMap={editedContentsMap}
                  emptyMessage="문제 추가를 눌러 문제를 추가하세요."
                  addedProblemIds={recentlyAddedProblemIds}
                />
              ) : (
                <ProblemsPanel
                  filteredProblems={sortedFilteredProblems}
                  problemsLoading={problemsLoading || chaptersLoading || !hasSetDefaultSelection}
                  problemsError={problemsError}
                  contentTree={contentTree}
                  onDeleteProblem={handleDeleteProblem}
                  editedContentsMap={editedContentsMap}
                  emptyMessage="문제 추가를 눌러 문제를 추가하세요."
                  addedProblemIds={recentlyAddedProblemIds}
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
              const newProblems = dialogProblems.filter(
                problem => !filteredProblems.some(existing => existing.id === problem.id)
              );
              setFilteredProblems(prev => [...prev, ...newProblems]);
              setRecentlyAddedProblemIds(new Set(newProblems.map(p => p.id)));
              setViewMode('worksheet');
            }}
            disabled={dialogProblems.length === 0}
          >
            추가
          </CustomButton>
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

          <ResizableHandle withHandle className="w-px bg-[var(--border)]" />

          <ResizablePanel defaultSize={40} minSize={25} maxSize={70}>
            <div className="h-full overflow-y-auto">
              {isEconomyMode ? (
                <EconomyProblemsPanel
                  filteredProblems={dialogProblems}
                  problemsLoading={economyLoading || chaptersLoading}
                  problemsError={problemsError}
                  onDeleteProblem={(problemId) => setDialogProblems(prev => prev.filter(p => p.id !== problemId))}
                  editedContentsMap={editedContentsMap}
                />
              ) : (
                <ProblemsPanel
                  filteredProblems={dialogProblems}
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

      {/* PDF Generation View - with fade transition */}
      <div
        className={`absolute inset-0 flex flex-col transition-opacity duration-500 ease-in-out ${
          viewMode === 'pdfGeneration' ? 'opacity-100 delay-200' : 'opacity-0 pointer-events-none delay-0'
        }`}
      >
        <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (pdfElapsedTimerRef.current) {
                  clearInterval(pdfElapsedTimerRef.current);
                  pdfElapsedTimerRef.current = null;
                }
                if (pdfUrl) {
                  URL.revokeObjectURL(pdfUrl);
                }
                setPdfUrl(null);
                setPdfError(null);
                setPdfProgress({ stage: '', percent: 0 });
                setPdfElapsedTime(0);
                setViewMode('worksheet');
              }}
              className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--gray-100)] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
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
                {isEconomyMode ? (
                  <EconomyProblemsPanel
                    filteredProblems={dialogProblems}
                    problemsLoading={economyLoading || chaptersLoading}
                    problemsError={problemsError}
                    onDeleteProblem={(problemId) => {
                      setDialogProblems(prev => prev.filter(p => p.id !== problemId));
                    }}
                    editedContentsMap={editedContentsMap}
                  />
                ) : (
                  <ProblemsPanel
                    filteredProblems={dialogProblems}
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

              <div className="h-9 bg-white border-t border-gray-200 pl-4 flex items-center justify-between shadow-lg overflow-hidden">
                <div className="text-xs text-gray-600">
                  {dialogProblems.length}문제
                </div>
                <Button
                  disabled={dialogProblems.length === 0}
                  className="h-9 px-4 text-white bg-black hover:bg-gray-800 rounded-none"
                  onClick={() => {
                    const newProblems = dialogProblems.filter(
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
