'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Loader } from "lucide-react";
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useChapters } from '@/lib/hooks/useChapters';
import { imageToBase64Client, createWorksheetWithAnswersDocDefinitionClient, generatePdfClient, cropBase64ImageClient } from '@/lib/pdf/clientUtils';
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

  // Fetch chapters from database
  const { chapters: contentTree, loading: chaptersLoading, error: chaptersError } = useChapters();

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
        // Starting PDF generation
        setLoading(true);
        // Keep showLoader true - no need to delay since we want consistent loading
        setPdfError(null);

        // Set to null to indicate "loading" - prevents race condition in preview
        setEditedContentsMap(null);

        // Fetch edited contents from database
        const { getEditedContents } = await import('@/lib/supabase/services/clientServices');

        // Collect all resource IDs (problems + answers)
        const problemIds = worksheetData?.problems.map(p => p.id) || [];

        // For answers: construct proper resource IDs
        const answerIds = worksheetData?.problems
          .filter(p => p.answer_filename)
          .map(p => {
            // Economy: replace _문제 with _해설
            if (p.id.startsWith('경제_')) {
              return p.id.replace('_문제', '_해설');
            }
            // Regular problems: use same ID
            return p.id;
          }) || [];

        const allResourceIds = [...problemIds, ...answerIds];

        console.log('[PDF Generation] Problem IDs:', problemIds);
        console.log('[PDF Generation] Answer IDs:', answerIds);
        console.log('[PDF Generation] Total resource IDs:', allResourceIds.length);

        const fetchedEditedContents = await getEditedContents(allResourceIds);

        console.log('[PDF Generation] Received edited content for:', Array.from(fetchedEditedContents.keys()));
        console.log('[PDF Generation] Expected problems:', problemIds.length, 'Received:', fetchedEditedContents.size);

        // Check for missing problems
        const missingProblems = problemIds.filter(id => !fetchedEditedContents.has(id));
        if (missingProblems.length > 0) {
          console.warn('[PDF Generation] ⚠️ Missing edited content for these problems:', missingProblems);
        }

        // Store in state for preview dialog to use
        console.log('[PDF Generation] Setting editedContentsMap with', fetchedEditedContents.size, 'items');
        setEditedContentsMap(fetchedEditedContents);
        console.log('[PDF Generation] editedContentsMap state updated');

        if (fetchedEditedContents.size > 0) {
          console.log(`[Edited Content] Found ${fetchedEditedContents.size} edited images in database`);
          console.log('[Edited Content] Resource IDs:', Array.from(fetchedEditedContents.keys()));
        }

        // Convert problem images to base64 on client side with error handling
        const problemImagePromises = selectedImages.map(async (imagePath, index) => {
          const problemId = worksheetData?.problems[index]?.id;

          console.log(`[PDF Image ${index + 1}] Problem ID: ${problemId}, Has edited: ${problemId && fetchedEditedContents.has(problemId)}`);

          // Check if edited content exists first
          if (problemId && fetchedEditedContents.has(problemId)) {
            console.log(`[PDF Image ${index + 1}] ✅ Using edited version from database`);
            const base64 = fetchedEditedContents.get(problemId)!;
            // Ensure it has the data URL prefix
            return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
          }

          // Otherwise fetch from CDN/S3
          console.log(`[PDF Image ${index + 1}] ⚠️ No edited content, trying CDN: ${imagePath}`);
          try {
            const cdnImage = await imageToBase64Client(imagePath);
            console.log(`[PDF Image ${index + 1}] ✅ Fetched from CDN successfully`);
            return cdnImage;
          } catch (error) {
            console.error(`[PDF Image ${index + 1}] ❌ CDN fetch failed, using placeholder`);
            // Silently fall back to placeholder image
            return getNoImageBase64();
          }
        });

        const base64ProblemImages = await Promise.allSettled(problemImagePromises);
        const processedProblemImages = base64ProblemImages.map((result) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            // Silently fall back to placeholder for failed images
            return getNoImageBase64();
          }
        });

        // Convert answer images to base64 on client side with error handling
        // Max height for answer images to prevent layout overflow
        const ANSWER_MAX_HEIGHT = 2000;

        const answerImagePromises = selectedAnswerImages.map(async (imagePath, index) => {
          const problem = worksheetData?.problems.filter(p => p.answer_filename)[index];
          if (!problem) {
            return getNoImageBase64();
          }

          // Get answer resource ID
          const answerId = problem.id.startsWith('경제_')
            ? problem.id.replace('_문제', '_해설')
            : problem.id;

          let answerBase64: string;

          // Check if edited content exists first
          if (fetchedEditedContents.has(answerId)) {
            console.log(`[Edited Content] Using edited version for answer: ${answerId}`);
            const base64 = fetchedEditedContents.get(answerId)!;
            // Ensure it has the data URL prefix
            answerBase64 = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
          } else {
            // Otherwise fetch from CDN/S3
            try {
              answerBase64 = await imageToBase64Client(imagePath);
            } catch {
              // Silently fall back to placeholder image
              return getNoImageBase64();
            }
          }

          // Crop the answer image if it exceeds max height
          try {
            return await cropBase64ImageClient(answerBase64, ANSWER_MAX_HEIGHT);
          } catch {
            // If cropping fails, return the original
            return answerBase64;
          }
        });

        const base64AnswerImages = await Promise.allSettled(answerImagePromises);
        const processedAnswerImages = base64AnswerImages.map((result) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            // Silently fall back to placeholder for failed images
            return getNoImageBase64();
          }
        });
        
        // Detect if this is an economy worksheet by checking first problem ID
        const isEconomyWorksheet = (worksheetData?.problems?.length ?? 0) > 0 &&
          worksheetData?.problems?.[0]?.id.startsWith('경제_');
        const subject = isEconomyWorksheet ? '경제' : '통합사회';

        // Flatten contentTree to flat array for chapter path lookup
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

        // Enrich problem metadata with chapter paths for 통합사회 problems
        const enrichedProblems = worksheetData?.problems.map(problem => {
          // For 통합사회 problems, add chapter_path from chapter tree
          if (!isEconomyWorksheet && problem.chapter_id && flatChapters.length > 0) {
            const chapterPath = getChapterPathLabels(problem.chapter_id, flatChapters);
            console.log('[Enrich] Problem:', problem.id, 'chapter_id:', problem.chapter_id, 'chapter_path:', chapterPath);
            return {
              ...problem,
              chapter_path: chapterPath // Add chapter path for PDF badges
            };
          }
          console.log('[Enrich] Problem:', problem.id, 'isEconomy:', isEconomyWorksheet, 'has chapter_id:', !!problem.chapter_id, 'flatChapters count:', flatChapters.length);
          return problem;
        });

        // Create document definition with answers
        const docDefinition = await createWorksheetWithAnswersDocDefinitionClient(
          selectedImages,
          processedProblemImages,
          selectedAnswerImages,
          processedAnswerImages,
          worksheetTitle,
          worksheetAuthor,
          worksheetData?.worksheet.created_at,
          subject,
          enrichedProblems as Array<Record<string, unknown>> // Pass enriched problem metadata for badges
        );
        
        // Generate PDF blob
        const blob = await generatePdfClient(docDefinition);
        
        if (blob.size === 0) throw new Error("PDF blob is empty");
        
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setPdfError(null);
        lastProcessedImages.current = selectionKey;
      } catch (error: unknown) {
        console.error("Failed to generate PDF:", error);
        setPdfUrl(null);
        
        // Provide more helpful error messages
        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
          errorMessage = 'S3 버킷에서 이미지를 불러올 수 없습니다. S3 설정을 확인하거나 관리자에게 문의하세요.';
        } else if (errorMessage.includes('Failed to load PDF library')) {
          errorMessage = 'PDF 라이브러리 로딩에 실패했습니다. 페이지를 새로고침해 주세요.';
        }
        
        setPdfError(errorMessage);
        lastProcessedImages.current = selectionKey;
      } finally {
        // PDF generation complete
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
      alert('목록 추가 중 오류가 발생했습니다.');
    }
  }, [worksheetId]);

  const handlePDFError = useCallback((error: string) => {
    setPdfError(error || null);
  }, []);

  const handlePreview = useCallback(() => {
    setShowPreviewDialog(true);
  }, []);

  // Show loading state while fetching worksheet OR generating PDF
  if ((!worksheetData && loading) || (worksheetReady && showLoader)) {
    return (
      <div className="px-4 pt-0 pb-4 max-w-4xl mx-auto w-full h-full">
        <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
          <div className="flex-1 bg-white flex items-center justify-center">
            <Loader className="animate-spin w-4 h-4" />
          </div>
        </Card>
      </div>
    );
  }

  // Show error state
  if (fetchError) {
    return (
      <div className="px-4 pt-0 pb-4 max-w-4xl mx-auto w-full h-full">
        <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
          <div className="flex-1 bg-white flex items-center justify-center">
            <div className="text-center text-gray-600">
              {fetchError}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (chaptersLoading) {
    return (
      <div className="px-4 pt-0 pb-4 max-w-4xl mx-auto w-full h-full">
        <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
          <div className="flex-1 bg-white flex items-center justify-center">
            <Loader className="animate-spin w-4 h-4" />
          </div>
        </Card>
      </div>
    );
  }

  if (chaptersError) {
    return (
      <div className="px-4 pt-0 pb-4 max-w-4xl mx-auto w-full h-full">
        <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
          <div className="flex-1 bg-white flex items-center justify-center">
            <div className="text-center text-gray-600">
              단원 정보 오류: {chaptersError}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-0 pb-4 max-w-4xl mx-auto w-full h-full">
        <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
          <IsolatedPDFContainer
            pdfUrl={pdfUrl}
            pdfError={pdfError}
            loading={loading}
            showLoader={showLoader}
            onError={handlePDFError}
            onEdit={handleEdit}
            onSave={handleSave}
            onPreview={handlePreview}
            selectedImagesLength={selectedImages.length}
            worksheetTitle={worksheetTitle}
            worksheetAuthor={worksheetAuthor}
            isPublic={worksheetData?.worksheet.is_public}
            worksheetId={worksheetId}
          />
        </Card>
      </div>
      
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
              <DialogTitle>프리뷰 보기</DialogTitle>
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
                  console.log('[Preview Dialog] Waiting for editedContentsMap to load...');
                  return (
                    <div className="flex items-center justify-center h-full">
                      <Loader className="animate-spin w-4 h-4 text-gray-400" />
                    </div>
                  );
                }

                // Verify all expected problems are in the map
                const expectedProblemIds = worksheetData.problems.map(p => p.id);
                const missingIds = expectedProblemIds.filter(id => !editedContentsMap.has(id));

                console.log('[Preview Dialog] Rendering with editedContentsMap size:', editedContentsMap.size);
                console.log('[Preview Dialog] Expected problems:', expectedProblemIds.length);
                console.log('[Preview Dialog] First 5 expected:', expectedProblemIds.slice(0, 5));
                console.log('[Preview Dialog] First 5 in map:', Array.from(editedContentsMap.keys()).slice(0, 5));

                if (missingIds.length > 0) {
                  console.warn('[Preview Dialog] ⚠️ Missing edited content for', missingIds.length, 'problems');
                  console.warn('[Preview Dialog] Missing IDs:', missingIds);
                  console.log('[Preview Dialog] Total available in map:', editedContentsMap.size);
                } else {
                  console.log('[Preview Dialog] ✅ All expected problems found in editedContentsMap');
                }

                // Detect if it's an economy worksheet
                const isEconomy = worksheetData.problems.length > 0 &&
                  worksheetData.problems[0].id.startsWith('경제_');

                // Use original problem order from database (preserves worksheet mode from creation)
                // Do NOT re-sort - the order was set when the worksheet was created (연습 or 실전 mode)
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