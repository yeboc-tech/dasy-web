/**
 * PDF 캐시 유틸리티
 * S3에 저장된 PDF를 조회하거나 새로 생성하여 캐시합니다.
 */

import { getCdnUrl } from '@/lib/utils/s3Utils';

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
 * PDF 조회 또는 생성 (캐시 우선)
 *
 * @param worksheetId - 워크시트 ID
 * @param generatePdf - 캐시 미스 시 PDF 생성 함수
 * @param onProgress - 진행 상황 콜백
 * @returns PDF URL (CDN 또는 로컬 Blob URL) 및 캐시 여부
 */
export async function getPdfWithCache(
  worksheetId: string,
  generatePdf: () => Promise<Blob>,
  onProgress?: (stage: 'checking_cache' | 'cache_hit' | 'generating' | 'uploading' | 'complete', percent: number) => void
): Promise<{ url: string; fromCache: boolean }> {
  // 1. 캐시 확인
  onProgress?.('checking_cache', 5);
  const cacheResult = await checkPdfCache(worksheetId);

  if (cacheResult.cached && cacheResult.cdnPath) {
    onProgress?.('cache_hit', 100);
    const url = getCdnUrl(cacheResult.cdnPath);
    return { url, fromCache: true };
  }

  // 2. 캐시 미스 - PDF 생성
  onProgress?.('generating', 20);
  const pdfBlob = await generatePdf();

  // 3. S3에 업로드
  onProgress?.('uploading', 80);
  const uploadResult = await uploadPdfToCache(worksheetId, pdfBlob);

  if (uploadResult.success && uploadResult.cdnPath) {
    onProgress?.('complete', 100);
    const url = getCdnUrl(uploadResult.cdnPath);
    return { url, fromCache: false };
  }

  // 4. 업로드 실패 시 로컬 Blob URL 반환
  onProgress?.('complete', 100);
  const localUrl = URL.createObjectURL(pdfBlob);
  return { url: localUrl, fromCache: false };
}
