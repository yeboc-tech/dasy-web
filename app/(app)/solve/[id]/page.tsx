'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader } from 'lucide-react';
import { OMRSheet } from '@/components/solve/OMRSheet';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CustomButton } from '@/components/custom-button';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { getWorksheetPdf, type PdfProgress } from '@/lib/pdf/pdfCache';

const SimplePDFViewer = dynamic(() => import('@/components/solve/SimplePDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader className="animate-spin w-4 h-4 text-gray-600" />
    </div>
  )
});

interface WorksheetData {
  id: string;
  title: string;
  author: string;
  selected_problem_ids: string[];
  created_at: string;
}

export default function SolvePage() {
  const params = useParams();
  const router = useRouter();
  const worksheetId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [worksheet, setWorksheet] = useState<WorksheetData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfProgress, setPdfProgress] = useState<PdfProgress>({ stage: 'checking_cache', percent: 0 });
  const [answers, setAnswers] = useState<{[problemNumber: number]: number}>({});
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(true);

  // Load worksheet data and PDF
  useEffect(() => {
    const loadWorksheetAndPdf = async () => {
      try {
        const supabase = createClient();

        // Load worksheet data
        const { data, error } = await supabase
          .from('worksheets')
          .select('id, title, author, selected_problem_ids, created_at')
          .eq('id', worksheetId)
          .single();

        if (error || !data) {
          console.error('Error loading worksheet:', error);
          setLoading(false);
          setPdfLoading(false);
          return;
        }

        setWorksheet(data);
        setLoading(false);

        // Get PDF (from cache or generate)
        const result = await getWorksheetPdf(
          {
            worksheetId: data.id,
            problemIds: data.selected_problem_ids,
            title: data.title,
            author: data.author,
            createdAt: data.created_at,
          },
          (progress) => setPdfProgress(progress)
        );

        setPdfUrl(result.url);
        setPdfLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
        setPdfLoading(false);
      }
    };

    if (worksheetId) {
      loadWorksheetAndPdf();
    }
  }, [worksheetId]);

  const handleAnswerChange = (problemNumber: number, answer: number) => {
    setAnswers(prev => ({
      ...prev,
      [problemNumber]: answer
    }));
  };

  const handleBack = () => {
    router.back();
  };

  const handleStartExam = () => {
    setShowInstructionsDialog(false);
  };

  const problemCount = worksheet?.selected_problem_ids?.length ?? 0;

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <Loader className="animate-spin w-6 h-6 text-gray-600" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Instructions Dialog */}
      <Dialog open={showInstructionsDialog} onOpenChange={setShowInstructionsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-lg font-semibold text-center">
            시험 유의사항
          </DialogTitle>
          <div className="py-4">
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="text-[#FF00A1] font-medium">1.</span>
                <span>문제를 꼼꼼히 읽고 정답을 선택하세요.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#FF00A1] font-medium">2.</span>
                <span>왼쪽 OMR 카드에서 답안을 마킹하세요.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#FF00A1] font-medium">3.</span>
                <span>모든 문제를 풀고 나면 제출 버튼을 눌러주세요.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#FF00A1] font-medium">4.</span>
                <span>시험 중 페이지를 벗어나면 진행 상황이 저장되지 않을 수 있습니다.</span>
              </li>
            </ul>
          </div>
          <div className="flex gap-2 pt-2">
            <CustomButton
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleBack}
            >
              돌아가기
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={handleStartExam}
            >
              시험 시작하기
            </CustomButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--gray-100)] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">
            풀기
          </h1>
          <span className="text-xs text-[var(--gray-500)]">
            {problemCount}문제
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Buttons will be added later */}
        </div>
      </div>

      {/* Content - OMR left, PDF right */}
      <div className="flex-1 flex overflow-hidden bg-gray-100">
        {/* OMR Sheet - Left Side */}
        <div className="w-52 shrink-0 p-4 pr-0 overflow-hidden flex flex-col">
          <OMRSheet
            problemCount={problemCount}
            answers={answers}
            onAnswerChange={handleAnswerChange}
          />
        </div>

        {/* PDF Viewer - Right Side */}
        <div className="flex-1 overflow-hidden">
          {pdfLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <Loader className="animate-spin w-4 h-4" />
                {pdfProgress.message && (
                  <div className="w-64 text-center">
                    <div className="text-xs text-gray-500 mb-2">{pdfProgress.message}</div>
                    <div className="w-full h-1 bg-gray-200 rounded">
                      <div
                        className="h-1 bg-[#FF00A1] rounded transition-all duration-300"
                        style={{ width: `${pdfProgress.percent}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{pdfProgress.percent}%</div>
                  </div>
                )}
              </div>
            </div>
          ) : pdfUrl ? (
            <SimplePDFViewer
              pdfUrl={pdfUrl}
              onError={(error) => console.error('PDF error:', error)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-500">PDF를 불러올 수 없습니다.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
