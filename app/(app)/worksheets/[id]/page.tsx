'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Loader } from "lucide-react";
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useChapters } from '@/lib/hooks/useChapters';
import { imageToBase64Client, imageToBase64WithDimensions, createWorksheetWithAnswersDocDefinitionClient, generatePdfClient, generatePdfWithWorker, preloadPdfMake, getCachedLogoBase64, getCachedQrBase64, type ImageWithDimensions, type PdfProgressCallback } from '@/lib/pdf/clientUtils';
import { WorksheetMetadataDialog } from '@/components/worksheets/WorksheetMetadataDialog';
import { PublishConfirmDialog } from '@/components/worksheets/PublishConfirmDialog';
import IsolatedPDFContainer from '@/components/pdf/IsolatedPDFContainer';
import { getProblemImageUrl, getAnswerImageUrl } from '@/lib/utils/s3Utils';
import type { ProblemMetadata } from '@/lib/types/problems';
import ProblemsPanel from '@/components/build/problemsPanel';
import EconomyProblemsPanel from '@/components/build/EconomyProblemsPanel';

// Helper function to generate a simple "No Image" base64 as fallback
function getNoImageBase64(): string {
  // Create a simple SVG with "No Image" text
  const svg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="300" height="200" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2"/>
    <text x="150" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">
      이미지를 불러올 수 없습니다
    </text>
    <text x="150" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af">
      S3 설정을 확인하세요
    </text>
  </svg>`;
  
  // Convert SVG to base64
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

interface WorksheetData {
  worksheet: {
    id: string;
    title: string;
    author: string;
    filters: Record<string, unknown>;
    created_at: string;
    selected_problem_ids: string[];
    is_public: boolean;
  };
  problems: ProblemMetadata[];
}

// Helper to get chapter path labels from chapter tree
function getChapterPathLabels(chapterId: string, chapters: { id: string; name: string; parent_id: string | null }[]): string[] {
  const path: string[] = [];
  let currentId: string | null = chapterId;

  while (currentId) {
    const chapter = chapters.find(c => c.id === currentId);
    if (!chapter) break;

    path.unshift(chapter.name); // Add to beginning to maintain order
    currentId = chapter.parent_id;
  }

  return path;
}

export default function ConfigurePage() {
  const params = useParams();
  const worksheetId = params.id as string;
  
  const [worksheetData, setWorksheetData] = useState<WorksheetData | null>(null);
  const [worksheetTitle, setWorksheetTitle] = useState('수능 문제지');
  const [worksheetAuthor, setWorksheetAuthor] = useState('DASY');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true); // Start with loader visible
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showAnswersInPreview, setShowAnswersInPreview] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [worksheetReady, setWorksheetReady] = useState(false); // New flag to control PDF generation
  const [editedContentsMap, setEditedContentsMap] = useState<Map<string, string> | null>(null);
  const [pdfProgress, setPdfProgress] = useState<{ stage: string; percent: number; startTime?: number }>({ stage: '', percent: 0 });
  const [elapsedTime, setElapsedTime] = useState(0);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch chapters from database
  const { chapters: contentTree, loading: chaptersLoading, error: chaptersError } = useChapters();

  // OPTIMIZATION: Preload pdfMake library and static assets on page mount
  useEffect(() => {
    preloadPdfMake();
    // Preload logo and QR in background (they'll be cached for later use)
    getCachedLogoBase64();
    getCachedQrBase64();
  }, []);

  // Fetch worksheet data
  useEffect(() => {
    const fetchWorksheet = async () => {
      try {
        setLoading(true);
        setFetchError(null);

        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // First, fetch the worksheet to check if it's economy or regular
        const { data: worksheetMeta, error: metaError } = await supabase
          .from('worksheets')
          .select('selected_problem_ids, filters')
          .eq('id', worksheetId)
          .single();

        if (metaError) {
          throw new Error('Worksheet not found');
        }

        // Detect if it's an economy worksheet by checking problem ID format
        const { isEconomyWorksheet } = await import('@/lib/supabase/services/economyWorksheetService');
        const isEconomy = isEconomyWorksheet(worksheetMeta.selected_problem_ids);

        let data;
        if (isEconomy) {
          // Use economy worksheet service
          const { getEconomyWorksheet } = await import('@/lib/supabase/services/economyWorksheetService');
          data = await getEconomyWorksheet(supabase, worksheetId);
        } else {
          // Use regular worksheet service
          const { getWorksheet } = await import('@/lib/supabase/services/worksheetService');
          data = await getWorksheet(supabase, worksheetId);
        }

        setWorksheetData(data);
        setWorksheetTitle(data.worksheet.title);
        setWorksheetAuthor(data.worksheet.author);
        setWorksheetReady(true); // Mark worksheet as ready for PDF generation

      } catch (error) {
        console.error('Error fetching worksheet:', error);
        setFetchError(error instanceof Error ? error.message : '워크시트를 불러오는데 실패했습니다.');
        setShowLoader(false);
        setLoading(false);
      }
    };

    if (worksheetId) {
      fetchWorksheet();
    }
  }, [worksheetId]);

  // Generate image URLs and filter problems
  const { selectedImages, selectedAnswerImages } = useMemo(() => {
    if (!worksheetData?.problems) {
      return { selectedImages: [], selectedAnswerImages: [] };
    }

    try {
      const problemImages = worksheetData.problems.map(problem => getProblemImageUrl(problem.id));
      const answerImages = worksheetData.problems
        .filter(problem => problem.answer_filename)
        .map(problem => getAnswerImageUrl(problem.id));
      
      return { 
        selectedImages: problemImages, 
        selectedAnswerImages: answerImages 
      };
    } catch (error) {
      console.error('Failed to generate image URLs:', error);
      return { selectedImages: [], selectedAnswerImages: [] };
    }
  }, [worksheetData?.problems]);

  // Track PDF visibility states
  useEffect(() => {
    // PDF visibility states logging removed
  }, [loading, pdfUrl, pdfError, showEditDialog]);

  // Generate PDF when selectedImages changes - but only when worksheet is ready
  const lastProcessedImages = useRef<string>('');
  
  useEffect(() => {
    // Don't start PDF generation until worksheet data is fully loaded
    if (!worksheetReady) {
      // Waiting for worksheet data to be ready
      return;
    }

    // Create a unique key for the current selection using only the data that should trigger regeneration
    const selectionKey = JSON.stringify({
      imageUrls: selectedImages.join(','),
      answerUrls: selectedAnswerImages.join(','),
      title: worksheetTitle,
      author: worksheetAuthor
    });
    
    // PDF Generation logging removed
    
    // Skip if we've already processed this exact selection
    if (selectionKey === lastProcessedImages.current) {
      // Skipping - same selection key
      return;
    }
    
    if (selectedImages.length === 0) {
      setPdfUrl(null);
      setPdfError(null);
      setLoading(false);
      setShowLoader(false);
      lastProcessedImages.current = selectionKey;
      return;
    }

    const generatePdf = async () => {
      try {
        // ========== TIMING START ==========
        const timings: Record<string, number> = {};
        const totalStart = performance.now();
        let stepStart = performance.now();

        console.log('📊 [PDF TIMING] Starting PDF generation...');
        console.log(`📊 [PDF TIMING] Problem count: ${selectedImages.length}`);
        console.log(`📊 [PDF TIMING] Answer count: ${selectedAnswerImages.length}`);
        // ========== TIMING START ==========

        setLoading(true);
        setPdfError(null);
        setEditedContentsMap(null);
        setElapsedTime(0);
        setPdfProgress({ stage: '준비 중...', percent: 0, startTime: Date.now() });

        // Start elapsed time timer
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        const startTime = Date.now();
        elapsedTimerRef.current = setInterval(() => {
          setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        // STEP 1: Fetch edited contents URLs from database
        stepStart = performance.now();
        const { getEditedContents } = await import('@/lib/supabase/services/clientServices');

        const problemIds = worksheetData?.problems.map(p => p.id) || [];
        const answerIds = worksheetData?.problems
          .filter(p => p.answer_filename)
          .map(p => {
            if (p.id.startsWith('경제_')) {
              return p.id.replace('_문제', '_해설');
            }
            return p.id;
          }) || [];

        const allResourceIds = [...problemIds, ...answerIds];

        let fetchedEditedContents: Map<string, string>;
        try {
          fetchedEditedContents = await getEditedContents(allResourceIds);
        } catch (dbError) {
          console.error('[PDF] Database fetch failed:', dbError);
          throw new Error(`데이터베이스에서 편집된 콘텐츠를 불러오는데 실패했습니다. ${dbError instanceof Error ? dbError.message : String(dbError)}`);
        }
        timings['1_fetch_urls'] = performance.now() - stepStart;
        console.log(`📊 [PDF TIMING] Step 1 - Fetch URLs: ${timings['1_fetch_urls'].toFixed(0)}ms`);

        setEditedContentsMap(fetchedEditedContents);
        setPdfProgress({ stage: '문제 이미지 불러오는 중...', percent: 5 });

        // STEP 2: Fetch images via proxy + convert to base64
        stepStart = performance.now();
        const ANSWER_MAX_HEIGHT = 2000;
        const ANSWER_WIDTH = 165;

        // IMAGE SCALING OPTIONS (for testing PDF size vs quality)
        // undefined = full resolution (current behavior, largest PDF)
        // 1200 = high quality print (300 DPI)
        // 800 = good quality print
        // 600 = smaller PDF, acceptable quality
        const IMAGE_MAX_WIDTH: number | undefined = undefined; // Disabled - no effect on current images

        const problemImagePromises = selectedImages.map(async (imagePath, index): Promise<ImageWithDimensions> => {
          const problemId = worksheetData?.problems[index]?.id;

          // Check if edited content exists first (now returns CDN URL)
          if (problemId && fetchedEditedContents.has(problemId)) {
            const editedCdnUrl = fetchedEditedContents.get(problemId)!;
            try {
              return await imageToBase64WithDimensions(editedCdnUrl, undefined, 240, IMAGE_MAX_WIDTH);
            } catch {
              // Fall through to try original CDN
            }
          }

          // Otherwise fetch from original CDN/S3
          try {
            return await imageToBase64WithDimensions(imagePath, undefined, 240, IMAGE_MAX_WIDTH);
          } catch {
            return { base64: getNoImageBase64(), width: 300, height: 200 };
          }
        });

        // Create answer image promises
        const answerImagePromises = selectedAnswerImages.map(async (imagePath, index): Promise<ImageWithDimensions> => {
          const problem = worksheetData?.problems.filter(p => p.answer_filename)[index];
          if (!problem) {
            return { base64: getNoImageBase64(), width: 300, height: 200 };
          }

          // Get answer resource ID
          const answerId = problem.id.startsWith('경제_')
            ? problem.id.replace('_문제', '_해설')
            : problem.id;

          // Check if edited content exists first (now returns CDN URL)
          if (fetchedEditedContents.has(answerId)) {
            const editedCdnUrl = fetchedEditedContents.get(answerId)!;
            try {
              return await imageToBase64WithDimensions(editedCdnUrl, { maxHeight: ANSWER_MAX_HEIGHT }, ANSWER_WIDTH, IMAGE_MAX_WIDTH);
            } catch {
              // Fall through to try original CDN
            }
          }

          // Otherwise fetch from CDN/S3 with cropping
          try {
            return await imageToBase64WithDimensions(imagePath, { maxHeight: ANSWER_MAX_HEIGHT }, ANSWER_WIDTH, IMAGE_MAX_WIDTH);
          } catch {
            return { base64: getNoImageBase64(), width: 300, height: 200 };
          }
        });

        // PARALLEL EXECUTION: Fetch all images simultaneously
        const [problemImageResults, answerImageResults] = await Promise.all([
          Promise.allSettled(problemImagePromises),
          Promise.allSettled(answerImagePromises)
        ]);
        timings['2_fetch_images_and_base64'] = performance.now() - stepStart;
        console.log(`📊 [PDF TIMING] Step 2 - Fetch images + Base64: ${timings['2_fetch_images_and_base64'].toFixed(0)}ms`);
        setPdfProgress({ stage: '레이아웃 구성 중...', percent: 20 });

        // STEP 3: Process results
        stepStart = performance.now();
        const processedProblemData = problemImageResults.map((result) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return { base64: getNoImageBase64(), width: 300, height: 200 };
          }
        });

        // Process answer results
        const processedAnswerData = answerImageResults.map((result) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return { base64: getNoImageBase64(), width: 300, height: 200 };
          }
        });

        // Extract base64 images and heights
        const processedProblemImages = processedProblemData.map(d => d.base64);
        const problemHeights = processedProblemData.map(d => d.height);
        const processedAnswerImages = processedAnswerData.map(d => d.base64);
        const answerHeights = processedAnswerData.map(d => d.height);
        timings['3_process_results'] = performance.now() - stepStart;
        console.log(`📊 [PDF TIMING] Step 3 - Process results: ${timings['3_process_results'].toFixed(0)}ms`);

        // STEP 4: Prepare metadata and layout
        stepStart = performance.now();
        const isEconomyWorksheet = (worksheetData?.problems?.length ?? 0) > 0 &&
          worksheetData?.problems?.[0]?.id.startsWith('경제_');
        const subject = isEconomyWorksheet ? '경제' : '통합사회';

        const flattenChapters = (tree: typeof contentTree, parentId: string | null = null): Array<{ id: string; name: string; parent_id: string | null }> => {
          const result: Array<{ id: string; name: string; parent_id: string | null }> = [];
          tree.forEach(item => {
            result.push({ id: item.id, name: item.label, parent_id: parentId });
            if (item.children) {
              result.push(...flattenChapters(item.children, item.id));
            }
          });
          return result;
        };
        const flatChapters = contentTree ? flattenChapters(contentTree) : [];

        const enrichedProblems = worksheetData?.problems.map(problem => {
          if (!isEconomyWorksheet && problem.chapter_id && flatChapters.length > 0) {
            const chapterPath = getChapterPathLabels(problem.chapter_id, flatChapters);
            return { ...problem, chapter_path: chapterPath };
          }
          return problem;
        });

        // STEP 5: Create document definition (layout calculation)
        const docDefinition = await createWorksheetWithAnswersDocDefinitionClient(
          selectedImages,
          processedProblemImages,
          selectedAnswerImages,
          processedAnswerImages,
          worksheetTitle,
          worksheetAuthor,
          worksheetData?.worksheet.created_at,
          subject,
          enrichedProblems as Array<Record<string, unknown>>,
          problemHeights,
          answerHeights
        );
        timings['4_metadata_and_5_doc_definition'] = performance.now() - stepStart;
        console.log(`📊 [PDF TIMING] Step 4+5 - Metadata + Doc definition: ${timings['4_metadata_and_5_doc_definition'].toFixed(0)}ms`);
        setPdfProgress({ stage: 'PDF 파일 생성 중...', percent: 25 });

        // STEP 6: Generate PDF blob using Web Worker (non-blocking)
        // Estimate based on actual measurements: ~105ms per problem (90s for 850 problems)
        const problemCount = selectedImages.length;
        const estimatedTimeMs = problemCount * 105;
        const pdfStartTime = Date.now();

        // Time-based progress with asymptotic behavior (never stops moving)
        const progressInterval = setInterval(() => {
          const elapsed = Date.now() - pdfStartTime;
          const ratio = elapsed / estimatedTimeMs;

          let progress: number;
          let stage: string;

          if (ratio <= 1) {
            // Normal progress: 0% to 90% during estimated time
            progress = ratio * 0.9;

            if (ratio < 0.2) stage = 'PDF 파일 생성 중...';
            else if (ratio < 0.5) stage = '문제 배치 중...';
            else if (ratio < 0.8) stage = '해설 추가 중...';
            else stage = '마무리 중...';
          } else {
            // Exceeded estimate: asymptotic progress from 90% to 99%
            // Uses 1 - 1/(1 + x) which approaches 1 as x increases
            const overtime = ratio - 1; // How much we've exceeded (0 = at estimate, 1 = 2x estimate)
            progress = 0.9 + 0.09 * (overtime / (overtime + 0.5)); // Slowly approaches 99%
            stage = '예상보다 오래 걸리고 있습니다...';
          }

          const percent = 25 + Math.round(progress * 70); // 25% to 95% (or 97% if overtime)
          setPdfProgress({ stage, percent: Math.min(percent, 97) });
        }, 500);

        stepStart = performance.now();
        const blob = await generatePdfWithWorker(docDefinition, (progress) => {
          if (progress.stage === 'complete') {
            clearInterval(progressInterval);
            setPdfProgress({ stage: '완료!', percent: 100 });
          }
        });
        clearInterval(progressInterval);
        timings['6_pdfmake_generation'] = performance.now() - stepStart;
        console.log(`📊 [PDF TIMING] Step 6 - pdfMake generation (Worker): ${timings['6_pdfmake_generation'].toFixed(0)}ms`);

        if (blob.size === 0) throw new Error("PDF blob is empty");

        // STEP 7: Create blob URL
        stepStart = performance.now();
        const url = URL.createObjectURL(blob);
        timings['7_blob_url'] = performance.now() - stepStart;

        // ========== TIMING SUMMARY ==========
        const totalTime = performance.now() - totalStart;
        console.log('\n📊 ========== PDF TIMING SUMMARY ==========');
        console.log(`📊 Step 1 - Fetch URLs from DB:     ${timings['1_fetch_urls']?.toFixed(0) || 0}ms`);
        console.log(`📊 Step 2 - Fetch images + Base64:  ${timings['2_fetch_images_and_base64']?.toFixed(0) || 0}ms`);
        console.log(`📊 Step 3 - Process results:        ${timings['3_process_results']?.toFixed(0) || 0}ms`);
        console.log(`📊 Step 4+5 - Layout + Doc def:     ${timings['4_metadata_and_5_doc_definition']?.toFixed(0) || 0}ms`);
        console.log(`📊 Step 6 - pdfMake generation:     ${timings['6_pdfmake_generation']?.toFixed(0) || 0}ms`);
        console.log(`📊 Step 7 - Blob URL:               ${timings['7_blob_url']?.toFixed(0) || 0}ms`);
        console.log(`📊 ----------------------------------------`);
        console.log(`📊 TOTAL TIME:                      ${totalTime.toFixed(0)}ms (${(totalTime/1000).toFixed(1)}s)`);
        console.log(`📊 PDF Size:                        ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
        console.log('📊 ==========================================\n');
        // ========== TIMING SUMMARY ==========

        setPdfUrl(url);
        setPdfError(null);
        lastProcessedImages.current = selectionKey;
      } catch (error: unknown) {
        console.error("Failed to generate PDF:", error);
        setPdfUrl(null);

        // Reset editedContentsMap on error to allow fresh fetch on retry
        setEditedContentsMap(null);

        // Provide more helpful error messages
        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        // Check for database fetch errors first (highest priority)
        if (errorMessage.includes('데이터베이스에서 편집된 콘텐츠를 불러오는데 실패했습니다')) {
          // Database error - keep the detailed message
          // errorMessage already contains Korean message from the throw
        } else if (errorMessage.includes('Database fetch failed') || errorMessage.includes('Failed to fetch edited contents')) {
          errorMessage = `데이터베이스 연결 실패: 편집된 콘텐츠를 불러올 수 없습니다. 네트워크 연결을 확인하고 다시 시도해주세요.`;
        } else if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
          errorMessage = 'S3 버킷에서 이미지를 불러올 수 없습니다. S3 설정을 확인하거나 관리자에게 문의하세요.';
        } else if (errorMessage.includes('Failed to load PDF library')) {
          errorMessage = 'PDF 라이브러리 로딩에 실패했습니다. 페이지를 새로고침해 주세요.';
        }

        setPdfError(errorMessage);
        lastProcessedImages.current = selectionKey;
      } finally {
        // PDF generation complete
        if (elapsedTimerRef.current) {
          clearInterval(elapsedTimerRef.current);
          elapsedTimerRef.current = null;
        }
        setLoading(false);
        setShowLoader(false);
      }
    };
    
    generatePdf();
  }, [selectedImages, selectedAnswerImages, worksheetTitle, worksheetAuthor, worksheetReady]);

  const handleEdit = useCallback(() => {
    setShowEditDialog(true);
  }, [loading, pdfUrl, pdfError, showEditDialog, showLoader, selectedImages.length]);

  const handleEditSubmit = useCallback(async (data: { title: string; author: string }) => {
    // Only update state and URL if title or author actually changed
    const titleChanged = data.title !== worksheetTitle;
    const authorChanged = data.author !== worksheetAuthor;
    
    if (titleChanged || authorChanged) {
      try {
        // Update database first
        const { createClient } = await import('@/lib/supabase/client');
        const { updateWorksheet } = await import('@/lib/supabase/services/worksheetService');
        
        const supabase = createClient();
        await updateWorksheet(supabase, worksheetId, {
          title: data.title,
          author: data.author
        });
        
        // Update state - this will trigger PDF regeneration
        setWorksheetTitle(data.title);
        setWorksheetAuthor(data.author);
        
        // Worksheet metadata updated successfully
      } catch (error) {
        console.error('Failed to update worksheet metadata:', error);
        // Show error to user - you might want to add a toast notification here
        alert('Failed to update worksheet metadata. Please try again.');
      }
    }
    // If nothing changed, dialog just closes without any updates
  }, [worksheetTitle, worksheetAuthor, worksheetId]);

  const handleSave = useCallback(() => {
    setShowPublishDialog(true);
  }, []);

  const handlePublishConfirm = useCallback(async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const { publishWorksheet } = await import('@/lib/supabase/services/worksheetService');
      
      const supabase = createClient();
      await publishWorksheet(supabase, worksheetId);
      
      // Update local state to reflect the change
      setWorksheetData(prev => 
        prev ? { ...prev, worksheet: { ...prev.worksheet, is_public: true } } : null
      );
    } catch (error) {
      console.error('Error publishing worksheet:', error);
      alert('공개 중 오류가 발생했습니다.');
    }
  }, [worksheetId]);

  const handlePDFError = useCallback((error: string) => {
    setPdfError(error || null);
    // If error is being cleared (retry), force PDF regeneration
    if (!error) {
      lastProcessedImages.current = '';
    }
  }, []);

  const handlePreview = useCallback(() => {
    setShowPreviewDialog(true);
  }, []);

  // Detect if this is an economy worksheet
  const isEconomyWorksheet = useMemo(() => {
    return (worksheetData?.problems?.length ?? 0) > 0 &&
      worksheetData?.problems?.[0]?.id.startsWith('경제_');
  }, [worksheetData?.problems]);

  const subject = isEconomyWorksheet ? '경제' : '통합사회';

  // Show loading state while fetching worksheet OR generating PDF
  if ((!worksheetData && loading) || (worksheetReady && showLoader)) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
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
              <span>{elapsedTime}초</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show error state
  if (fetchError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-gray-600">
          {fetchError}
        </div>
      </div>
    );
  }

  if (chaptersLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader className="animate-spin w-4 h-4" />
      </div>
    );
  }

  if (chaptersError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-gray-600">
          단원 정보 오류: {chaptersError}
        </div>
      </div>
    );
  }

  return (
    <>
      <IsolatedPDFContainer
        pdfUrl={pdfUrl}
        pdfError={pdfError}
        loading={loading}
        showLoader={showLoader}
        onError={handlePDFError}
        onEdit={handleEdit}
        onSave={handleSave}
        onPreview={handlePreview}
        subject={subject}
        selectedImagesLength={selectedImages.length}
        worksheetTitle={worksheetTitle}
        worksheetAuthor={worksheetAuthor}
        isPublic={worksheetData?.worksheet.is_public}
        worksheetId={worksheetId}
      />
      
      <WorksheetMetadataDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSubmit={handleEditSubmit}
        initialData={{ title: worksheetTitle, author: worksheetAuthor }}
        isEditing={true}
      />
      
      <PublishConfirmDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        onConfirm={handlePublishConfirm}
        worksheetTitle={worksheetTitle}
      />

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>프리뷰</DialogTitle>
              <div className="flex items-center space-x-2">
                <Label htmlFor="show-answers" className="text-sm font-medium text-gray-600 cursor-pointer">해설 보기</Label>
                <Switch
                  id="show-answers"
                  checked={showAnswersInPreview}
                  onCheckedChange={setShowAnswersInPreview}
                  className="data-[state=checked]:bg-[#FF00A1] data-[state=unchecked]:bg-gray-200 data-[state=checked]:!border-[#FF00A1] data-[state=unchecked]:!border-gray-200 h-[1.15rem] w-8 border shadow-sm focus-visible:ring-[#FF00A1]/50 [&>span]:bg-white [&>span]:data-[state=checked]:translate-x-[calc(100%-2px)]"
                />
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {worksheetData && (
              (() => {
                // Wait for edited content to be loaded before showing preview
                if (editedContentsMap === null) {
                  return (
                    <div className="flex items-center justify-center h-full">
                      <Loader className="animate-spin w-4 h-4 text-gray-400" />
                    </div>
                  );
                }

                const isEconomy = worksheetData.problems.length > 0 &&
                  worksheetData.problems[0].id.startsWith('경제_');
                const problems = worksheetData.problems;

                return isEconomy ? (
                  <EconomyProblemsPanel
                    filteredProblems={problems}
                    problemsLoading={false}
                    problemsError={null}
                    showAnswers={showAnswersInPreview}
                    editedContentsMap={editedContentsMap}
                  />
                ) : (
                  <ProblemsPanel
                    filteredProblems={problems}
                    problemsLoading={false}
                    problemsError={null}
                    contentTree={contentTree || []}
                    showAnswers={showAnswersInPreview}
                    editedContentsMap={editedContentsMap}
                  />
                );
              })()
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}