'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Loader } from 'lucide-react';
import { imageToBase64Client, createWorksheetWithAnswersDocDefinitionClient, generatePdfClient } from '@/lib/pdf/clientUtils';
import { getProblemImageUrl } from '@/lib/utils/s3Utils';
import type { ProblemMetadata } from '@/lib/types/problems';
import dynamic from 'next/dynamic';

const SimplePDFViewer = dynamic(() => import('@/components/solve/SimplePDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader className="animate-spin w-4 h-4 text-gray-600" />
    </div>
  )
});

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

interface SolvePDFViewerProps {
  worksheetData: WorksheetData;
}

// Helper function for fallback image
function getNoImageBase64(): string {
  const svg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="300" height="200" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2"/>
    <text x="150" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">
      이미지를 불러올 수 없습니다
    </text>
    <text x="150" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af">
      S3 설정을 확인하세요
    </text>
  </svg>`;

  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

export const SolvePDFViewer = React.memo(function SolvePDFViewer({ worksheetData }: SolvePDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Generate problem image URLs
  const selectedImages = useMemo(() => {
    if (!worksheetData?.problems) {
      return [];
    }

    try {
      return worksheetData.problems.map(problem => getProblemImageUrl(problem.id));
    } catch (error) {
      console.error('Failed to generate image URLs:', error);
      return [];
    }
  }, [worksheetData?.problems]);

  // Generate PDF for solving (problems only, no answers)
  useEffect(() => {
    if (!worksheetData || selectedImages.length === 0) {
      setLoading(false);
      return;
    }

    const generatePdf = async () => {
      try {
        setLoading(true);
        setPdfError(null);

        // Convert problem images to base64
        const problemImagePromises = selectedImages.map(async (imagePath) => {
          try {
            return await imageToBase64Client(imagePath);
          } catch {
            return getNoImageBase64();
          }
        });

        const base64ProblemImages = await Promise.allSettled(problemImagePromises);
        const processedProblemImages = base64ProblemImages.map((result) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return getNoImageBase64();
          }
        });

        // Create document definition with only problems (no answers for solving)
        const docDefinition = await createWorksheetWithAnswersDocDefinitionClient(
          selectedImages,
          processedProblemImages,
          [], // No answer images for solving
          [], // No answer images for solving
          worksheetData.worksheet.title,
          worksheetData.worksheet.author,
          worksheetData.worksheet.created_at
        );

        // Generate PDF blob
        const blob = await generatePdfClient(docDefinition);

        if (blob.size === 0) throw new Error("PDF blob is empty");

        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setPdfError(null);

      } catch (error: unknown) {
        console.error("Failed to generate PDF:", error);
        setPdfUrl(null);

        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
          errorMessage = 'S3 버킷에서 이미지를 불러올 수 없습니다. S3 설정을 확인하거나 관리자에게 문의하세요.';
        } else if (errorMessage.includes('Failed to load PDF library')) {
          errorMessage = 'PDF 라이브러리 로딩에 실패했습니다. 페이지를 새로고침해 주세요.';
        }

        setPdfError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    generatePdf();
  }, [selectedImages, worksheetData]);

  const handlePDFError = (error: string) => {
    setPdfError(error || null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="animate-spin w-4 h-4" />
      </div>
    );
  }

  if (pdfError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-600 max-w-md p-4">
          <div className="text-red-500 font-medium mb-2">PDF 생성 오류</div>
          <div className="text-sm mb-4">{pdfError}</div>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-600">
          PDF를 생성할 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <SimplePDFViewer
        pdfUrl={pdfUrl}
        onError={handlePDFError}
      />
    </div>
  );
});