'use client';

import { useEffect, useState, Suspense, useMemo, useRef } from 'react';
import { Loader } from "lucide-react";
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { useChapters } from '@/lib/hooks/useChapters';
import { useProblems } from '@/lib/hooks/useProblems';
import { imageToBase64Client, createWorksheetDocDefinitionClient, generatePdfClient } from '@/lib/pdf/clientUtils';
import dynamic from 'next/dynamic';

// Dynamically import PDFViewer to prevent SSR issues
const PDFViewer = dynamic(() => import('@/components/pdf/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader className="animate-spin w-4 h-4 text-gray-600" />
    </div>
  )
});

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
import { ProblemFilter } from '@/lib/utils/problemFiltering';
import { getProblemImageUrl } from '@/lib/utils/s3Utils';

function PdfContent() {
  const searchParams = useSearchParams();
  const problemCount = parseInt(searchParams.get('problemCount') || '0', 10);
  
  const worksheetName = '';
  const creator = '';
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Fetch chapters from database
  const { chapters: contentTree, loading: chaptersLoading, error: chaptersError } = useChapters();
  const { problems, loading: problemsLoading, error: problemsError } = useProblems();

  // Filter and select problems based on criteria
  const selectedImages = useMemo(() => {
    if (!problems || problems.length === 0 || problemsLoading) {
      return [];
    }

    const selectedChapters = searchParams.get('selectedChapters')?.split(',').filter(Boolean) || [];
    const selectedDifficulties = searchParams.get('selectedDifficulties')?.split(',').filter(Boolean) || [];
    const selectedProblemTypes = searchParams.get('selectedProblemTypes')?.split(',').filter(Boolean) || [];
    const selectedSubjects = searchParams.get('selectedSubjects')?.split(',').filter(Boolean) || [];

    const filters = {
      selectedChapters,
      selectedDifficulties,
      selectedProblemTypes,
      selectedSubjects,
      problemCount,
      contentTree
    };

    const filtered = ProblemFilter.filterProblems(problems, filters);
    
    // Convert to S3 image URLs with error handling
    try {
      return filtered.map(problem => getProblemImageUrl(problem.id));
    } catch (error) {
      console.error('Failed to generate image URLs:', error);
      return [];
    }
  }, [problems, problemCount, contentTree, problemsLoading, searchParams]);

  // Generate PDF when selectedImages changes
  const lastProcessedImages = useRef<string>('');
  
  useEffect(() => {
    // Create a unique key for the current selection
    const selectionKey = JSON.stringify({
      selectedImages,
      worksheetName,
      creator
    });
    
    // Skip if we've already processed this exact selection
    if (selectionKey === lastProcessedImages.current) {
      return;
    }
    
    if (selectedImages.length === 0) {
      setPdfUrl(null);
      setPdfError(null);
      setLoading(false);
      lastProcessedImages.current = selectionKey;
      return;
    }

    const generatePdf = async () => {
      try {
        setLoading(true);
        setPdfError(null);
        
        // Convert images to base64 on client side with error handling
        const imagePromises = selectedImages.map(async (imagePath) => {
          try {
            return await imageToBase64Client(imagePath);
          } catch (error) {
            console.error(`Failed to process image ${imagePath}:`, error);
            return getNoImageBase64();
          }
        });
        
        const base64Images = await Promise.allSettled(imagePromises);
        const processedImages = base64Images.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            console.error(`Image ${index} failed:`, result.reason);
            return getNoImageBase64();
          }
        });
        
        // Create document definition (now async)
        const docDefinition = await createWorksheetDocDefinitionClient(
          selectedImages, 
          processedImages, 
          worksheetName, 
          creator
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
        setLoading(false);
      }
    };
    
    generatePdf();
  }, [selectedImages, worksheetName, creator]);

  if (problemsLoading || chaptersLoading) {
    return (
      <div className="px-4 pt-2 pb-6 max-w-4xl mx-auto w-full h-full">
        <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
          <div className="flex-1 bg-white flex items-center justify-center">
            <Loader className="animate-spin w-4 h-4" />
          </div>
        </Card>
      </div>
    );
  }

  if (problemsError || chaptersError) {
    return (
      <div className="px-4 pt-2 pb-6 max-w-4xl mx-auto w-full h-full">
        <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
          <div className="flex-1 bg-white flex items-center justify-center">
            <div className="text-center text-gray-600">
              {problemsError ? `문제 데이터 오류: ${problemsError}` : `단원 정보 오류: ${chaptersError}`}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 pb-6 max-w-4xl mx-auto w-full h-full">
      <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
        {/* PDF Preview Panel */}
        <div className="flex-1 bg-white overflow-y-auto relative">
          
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-white bg-opacity-70">
              <Loader className="animate-spin w-4 h-4 text-gray-600" />
            </div>
          )}
          
          {pdfError && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
              <div className="text-center text-gray-600 max-w-md p-4">
                <div className="text-red-500 font-medium mb-2">PDF 생성 오류</div>
                <div className="text-sm mb-4">{pdfError}</div>
                <button 
                  onClick={() => {
                    setPdfError(null);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}
          
          {pdfUrl && !loading && !pdfError && (
            <PDFViewer 
              pdfUrl={pdfUrl}
              onError={(error) => setPdfError(error)}
            />
          )}
          
          {!loading && !pdfError && selectedImages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-600 max-w-md p-4">
                <div className="text-orange-500 font-medium mb-2">설정 필요</div>
                <div className="text-sm mb-4">
                  S3 환경 변수가 설정되지 않았습니다. 이미지를 불러올 수 없습니다.
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  <p>다음 환경 변수를 설정해주세요:</p>
                  <p>• NEXT_PUBLIC_S3_BUCKET_NAME</p>
                  <p>• NEXT_PUBLIC_AWS_REGION</p>
                </div>
                <div className="text-xs text-gray-400">
                  자세한 설정 방법은 ENVIRONMENT_SETUP.md 파일을 참조하세요.
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Fallback() {
  return (
    <div className="px-4 pt-2 pb-6 max-w-6xl mx-auto w-full h-full">
      <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
        <div className="flex-1 bg-white flex items-center justify-center">
          <Loader className="animate-spin w-4 h-4 text-gray-600" />
        </div>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Fallback />}>
      <PdfContent />
    </Suspense>
  );
}
