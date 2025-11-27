'use client';

import React, { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader } from 'lucide-react';

const PDFViewer = dynamic(() => import('@/components/pdf/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader className="animate-spin w-4 h-4 text-gray-600" />
    </div>
  )
});

interface IsolatedPDFContainerProps {
  pdfUrl: string | null;
  pdfError: string | null;
  loading: boolean;
  showLoader: boolean;
  onError: (error: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onPreview?: () => void;
  subject?: string;
  selectedImagesLength: number;
  worksheetTitle?: string;
  worksheetAuthor?: string;
  isPublic?: boolean;
  worksheetId?: string;
}

const IsolatedPDFContainer = React.memo(function IsolatedPDFContainer({
  pdfUrl,
  pdfError,
  loading,
  showLoader,
  onError,
  onEdit,
  onSave,
  onPreview,
  subject,
  selectedImagesLength,
  worksheetTitle,
  worksheetAuthor,
  isPublic,
  worksheetId
}: IsolatedPDFContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('IsolatedPDFContainer render:', {
      pdfUrl: !!pdfUrl,
      pdfError: !!pdfError,
      loading,
      showLoader,
      selectedImagesLength,
      shouldShowPDF: pdfUrl && !loading && !pdfError
    });
  });

  const prevProps = useRef({
    pdfUrl,
    pdfError,
    loading,
    showLoader,
    selectedImagesLength
  });

  useEffect(() => {
    const prev = prevProps.current;
    const changes = [];
    
    if (prev.pdfUrl !== pdfUrl) changes.push(`pdfUrl: ${!!prev.pdfUrl} -> ${!!pdfUrl}`);
    if (prev.pdfError !== pdfError) changes.push(`pdfError: ${!!prev.pdfError} -> ${!!pdfError}`);
    if (prev.loading !== loading) changes.push(`loading: ${prev.loading} -> ${loading}`);
    if (prev.showLoader !== showLoader) changes.push(`showLoader: ${prev.showLoader} -> ${showLoader}`);
    if (prev.selectedImagesLength !== selectedImagesLength) changes.push(`selectedImagesLength: ${prev.selectedImagesLength} -> ${selectedImagesLength}`);
    
    if (changes.length > 0) {
      console.log('IsolatedPDFContainer prop changes:', changes);
    }
    
    prevProps.current = {
      pdfUrl,
      pdfError,
      loading,
      showLoader,
      selectedImagesLength
    };
  });

  return (
    <div ref={containerRef} className="flex-1 bg-white relative flex flex-col overflow-hidden">
      {loading && showLoader && (
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
                onError('');
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
          key={pdfUrl}
          pdfUrl={pdfUrl}
          onError={onError}
          onEdit={onEdit}
          onSave={onSave}
          onPreview={onPreview}
          subject={subject}
          worksheetTitle={worksheetTitle}
          worksheetAuthor={worksheetAuthor}
          isPublic={isPublic}
          worksheetId={worksheetId}
        />
      )}
      
      {!loading && !pdfError && selectedImagesLength === 0 && (
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
  );
});

export default IsolatedPDFContainer;