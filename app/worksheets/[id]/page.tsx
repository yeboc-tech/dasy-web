'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Loader } from "lucide-react";
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { useChapters } from '@/lib/hooks/useChapters';
import { imageToBase64Client, createWorksheetWithAnswersDocDefinitionClient, generatePdfClient } from '@/lib/pdf/clientUtils';
import { WorksheetMetadataDialog } from '@/components/worksheets/WorksheetMetadataDialog';
import { PublishConfirmDialog } from '@/components/worksheets/PublishConfirmDialog';
import IsolatedPDFContainer from '@/components/pdf/IsolatedPDFContainer';
import { getProblemImageUrl, getAnswerImageUrl } from '@/lib/utils/s3Utils';
import type { ProblemMetadata } from '@/lib/types/problems';

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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [worksheetReady, setWorksheetReady] = useState(false); // New flag to control PDF generation

  // Fetch chapters from database
  const { loading: chaptersLoading, error: chaptersError } = useChapters();

  // Fetch worksheet data
  useEffect(() => {
    const fetchWorksheet = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        
        const { createClient } = await import('@/lib/supabase/client');
        const { getWorksheet } = await import('@/lib/supabase/services/worksheetService');
        
        const supabase = createClient();
        const data = await getWorksheet(supabase, worksheetId);
        
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
    console.log('PDF visibility states changed:', {
      loading,
      pdfUrl: !!pdfUrl,
      pdfError: !!pdfError,
      showEditDialog,
      shouldShowPDF: !!(pdfUrl && !loading && !pdfError)
    });
  }, [loading, pdfUrl, pdfError, showEditDialog]);

  // Generate PDF when selectedImages changes - but only when worksheet is ready
  const lastProcessedImages = useRef<string>('');
  
  useEffect(() => {
    // Don't start PDF generation until worksheet data is fully loaded
    if (!worksheetReady) {
      console.log('🟡 Waiting for worksheet data to be ready...');
      return;
    }

    // Create a unique key for the current selection using only the data that should trigger regeneration
    const selectionKey = JSON.stringify({
      imageUrls: selectedImages.join(','),
      answerUrls: selectedAnswerImages.join(','),
      title: worksheetTitle,
      author: worksheetAuthor
    });
    
    console.log('🟡 PDF Generation useEffect triggered:');
    console.log('  - selectionKey:', selectionKey);
    console.log('  - previous:', lastProcessedImages.current);
    console.log('  - selectedImages.length:', selectedImages.length);
    console.log('  - worksheetReady:', worksheetReady);
    
    // Skip if we've already processed this exact selection
    if (selectionKey === lastProcessedImages.current) {
      console.log('SKIPPING - same selection key');
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
        console.log('🔴 Starting PDF generation - keeping loader visible');
        setLoading(true);
        // Keep showLoader true - no need to delay since we want consistent loading
        setPdfError(null);
        
        // Convert problem images to base64 on client side with error handling
        const problemImagePromises = selectedImages.map(async (imagePath) => {
          try {
            return await imageToBase64Client(imagePath);
          } catch {
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
        const answerImagePromises = selectedAnswerImages.map(async (imagePath) => {
          try {
            return await imageToBase64Client(imagePath);
          } catch {
            // Silently fall back to placeholder image
            return getNoImageBase64();
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
        
        // Create document definition with answers
        const docDefinition = await createWorksheetWithAnswersDocDefinitionClient(
          selectedImages, 
          processedProblemImages,
          selectedAnswerImages,
          processedAnswerImages,
          worksheetTitle,
          worksheetAuthor
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
        console.log('🔴 PDF generation complete - hiding loader');
        setLoading(false);
        setShowLoader(false);
      }
    };
    
    generatePdf();
  }, [selectedImages, selectedAnswerImages, worksheetTitle, worksheetAuthor, worksheetReady]);

  const handleEdit = useCallback(() => {
    console.log('🔵 handleEdit called BEFORE setShowEditDialog - PDF states:', {
      loading,
      pdfUrl: !!pdfUrl,
      pdfError: !!pdfError,
      showEditDialog,
      showLoader,
      selectedImagesLength: selectedImages.length
    });
    setShowEditDialog(true);
    console.log('🔵 handleEdit called AFTER setShowEditDialog');
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
        
        console.log('Worksheet metadata updated successfully');
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
            selectedImagesLength={selectedImages.length}
            worksheetTitle={worksheetTitle}
            worksheetAuthor={worksheetAuthor}
            isPublic={worksheetData?.worksheet.is_public}
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
    </>
  );
}