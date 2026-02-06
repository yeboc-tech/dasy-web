'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader } from 'lucide-react';
import { OMRSheet } from '@/components/solve/OMRSheet';
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
