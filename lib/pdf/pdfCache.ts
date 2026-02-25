/**
 * PDF 캐시 유틸리티
 * S3에 저장된 PDF를 조회하거나 새로 생성하여 캐시합니다.
 */

import { getCdnUrl, getProblemImageUrl } from '@/lib/utils/s3Utils';
import { imageToBase64WithDimensions, createWorksheetWithAnswersDocDefinitionClient, generatePdfWithWorker, type ImageWithDimensions } from '@/lib/pdf/clientUtils';
import { getSubjectFromProblemId } from '@/lib/supabase/services/taggedWorksheetService';

interface CacheCheckResult {
  cached: boolean;
  cdnPath?: string;
  reason?: string;
}

interface CacheUploadResult {
  success: boolean;
  cdnPath?: string;
  error?: string;
}

export type PdfProgressStage =
  | 'checking_cache'
  | 'cache_hit'
  | 'loading_images'
  | 'generating_pdf'
  | 'uploading'
  | 'complete';

export interface PdfProgress {
  stage: PdfProgressStage;
  percent: number;
  message?: string;
}

export interface WorksheetPdfParams {
  worksheetId: string;
  problemIds: string[];
  title: string;
  author: string;
  createdAt?: string;
  /** 답안 이미지 포함 여부 (기본: false, solve 모드에서는 false) */
  includeAnswers?: boolean;
}

/**
 * 캐시된 PDF 확인
 */
export async function checkPdfCache(worksheetId: string): Promise<CacheCheckResult> {
  const response = await fetch(`/api/pdf/cached?worksheetId=${worksheetId}`);

  if (!response.ok) {
    return { cached: false };
  }

  return response.json();
}

/**
 * Blob을 base64로 변환 (큰 파일 지원)
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * PDF를 S3에 캐시
 */
export async function uploadPdfToCache(
  worksheetId: string,
  pdfBlob: Blob
): Promise<CacheUploadResult> {
  try {
    // Convert Blob to base64 using FileReader (handles large files better)
    const base64 = await blobToBase64(pdfBlob);

    const response = await fetch('/api/pdf/cached', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worksheetId,
        pdf: base64
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Upload failed' };
    }

    return response.json();
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * 캐시된 PDF 삭제
 */
export async function deletePdfCache(worksheetId: string): Promise<boolean> {
  const response = await fetch(`/api/pdf/cached?worksheetId=${worksheetId}`, {
    method: 'DELETE'
  });

  return response.ok;
}

/**
 * 워크시트 PDF 가져오기 (캐시 우선, 없으면 생성)
 *
 * 1. 캐시 확인 → 있으면 CDN URL 반환
 * 2. 없으면 이미지 로드 → PDF 생성 → 캐시 업로드 → URL 반환
 */
export async function getWorksheetPdf(
  params: WorksheetPdfParams,
  onProgress?: (progress: PdfProgress) => void
): Promise<{ url: string; fromCache: boolean }> {
  const { worksheetId, problemIds, title, author, createdAt, includeAnswers = false } = params;

  // 1. 캐시 확인
  onProgress?.({ stage: 'checking_cache', percent: 5, message: '캐시 확인 중...' });
  const cacheResult = await checkPdfCache(worksheetId);

  if (cacheResult.cached && cacheResult.cdnPath) {
    onProgress?.({ stage: 'cache_hit', percent: 100, message: '캐시에서 로드' });
    const url = getCdnUrl(cacheResult.cdnPath);
    return { url, fromCache: true };
  }

  // 2. 이미지 로드
  const totalImages = problemIds.length;
  const problemImageUrls = problemIds.map(id => getProblemImageUrl(id));

  let loadedCount = 0;
  const problemImages: ImageWithDimensions[] = await Promise.all(
    problemImageUrls.map(async (url, i) => {
      try {
        const result = await imageToBase64WithDimensions(url);
        loadedCount++;
        const percent = 5 + Math.round((loadedCount / totalImages) * 50);
        onProgress?.({
          stage: 'loading_images',
          percent,
          message: `이미지 로딩 중... (${loadedCount}/${totalImages})`
        });
        return result;
      } catch (err) {
        console.error(`Failed to load problem image ${i}:`, err);
        loadedCount++;
        return { base64: '', width: 0, height: 0 };
      }
    })
  );

  const base64ProblemImages = problemImages.map(img => img.base64);
  const problemHeights = problemImages.map(img => img.height);

  // 과목 감지
  const detectedSubject = problemIds[0] ? getSubjectFromProblemId(problemIds[0]) : null;
  const subject = detectedSubject || '통합사회';

  // 메타데이터 (solve 모드에서는 빈 값)
  const problemMetadataForPdf = problemIds.map(() => ({
    tags: [],
    difficulty: undefined,
    problem_type: undefined,
    related_subjects: [],
    correct_rate: undefined,
    exam_year: undefined,
  }));

  // 3. PDF 생성
  onProgress?.({ stage: 'generating_pdf', percent: 60, message: 'PDF 생성 중...' });

  const docDefinition = await createWorksheetWithAnswersDocDefinitionClient(
    problemImageUrls,
    base64ProblemImages,
    includeAnswers ? problemImageUrls : [], // 답안 이미지
    includeAnswers ? base64ProblemImages : [],
    title || '학습지',
    author || '',
    createdAt,
    subject,
    problemMetadataForPdf,
    problemHeights,
    includeAnswers ? problemHeights : []
  );

  onProgress?.({ stage: 'generating_pdf', percent: 75, message: 'PDF 렌더링 중...' });

  const pdfBlob = await generatePdfWithWorker(docDefinition, (progress) => {
    if (progress.stage === 'complete') {
      onProgress?.({ stage: 'generating_pdf', percent: 85, message: 'PDF 완료' });
    }
  });

  // Blob URL 생성 (일단 표시용)
  const blobUrl = URL.createObjectURL(pdfBlob);

  // 4. 캐시 업로드 (백그라운드)
  onProgress?.({ stage: 'uploading', percent: 90, message: '캐시 업로드 중...' });

  uploadPdfToCache(worksheetId, pdfBlob)
    .then(result => {
      if (!result.success) {
        console.error('Failed to cache PDF:', result.error);
      }
    })
    .catch(err => {
      console.error('Failed to cache PDF:', err);
    });

  onProgress?.({ stage: 'complete', percent: 100, message: '완료' });

  return { url: blobUrl, fromCache: false };
}
