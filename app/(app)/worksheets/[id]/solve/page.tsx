'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { OMRSheet } from '@/components/solve/OMRSheet';
import { SolvePDFViewer } from '@/components/solve/SolvePDFViewer';
import type { ProblemMetadata } from '@/lib/types/problems';

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

export default function SolvePage() {
  const params = useParams();
  const worksheetId = params.id as string;

  const [worksheetData, setWorksheetData] = useState<WorksheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{[problemNumber: number]: number}>({});
  const [gradingResults, setGradingResults] = useState<{[problemNumber: number]: { isCorrect: boolean; correctAnswer: number }} | null>(null);

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

      } catch (error) {
        console.error('Error fetching worksheet:', error);
        setFetchError(error instanceof Error ? error.message : '워크시트를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (worksheetId) {
      fetchWorksheet();
    }
  }, [worksheetId]);

  const handleAnswerChange = (problemNumber: number, answer: number) => {
    setAnswers(prev => ({
      ...prev,
      [problemNumber]: answer
    }));
  };

  const handleAutoGrade = async () => {
    if (!worksheetData) return;

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Get the correct answers from the database
      const { data: problems, error } = await supabase
        .from('problems')
        .select('id, answer')
        .in('id', worksheetData.worksheet.selected_problem_ids);

      if (error) {
        console.error('Error fetching correct answers:', error);
        toast.error('채점 중 오류가 발생했습니다.');
        return;
      }

      // Create a map of problem ID to correct answer
      const correctAnswersMap = new Map();
      problems?.forEach(problem => {
        correctAnswersMap.set(problem.id, problem.answer);
      });

      // Grade each answer
      const results: {[problemNumber: number]: { isCorrect: boolean; correctAnswer: number }} = {};
      let correctCount = 0;

      worksheetData.problems.forEach((problem, index) => {
        const problemNumber = index + 1;
        const userAnswer = answers[problemNumber];
        const correctAnswer = correctAnswersMap.get(problem.id);

        if (correctAnswer !== null && correctAnswer !== undefined) {
          const isCorrect = userAnswer === correctAnswer;
          if (isCorrect) correctCount++;

          results[problemNumber] = {
            isCorrect,
            correctAnswer
          };
        }
      });

      setGradingResults(results);

      // Show results
      const totalProblems = worksheetData.problems.length;
      const percentage = Math.round((correctCount / totalProblems) * 100);

      toast.success('채점 완료!', {
        description: `정답: ${correctCount}개 / 전체: ${totalProblems}개\n정답률: ${percentage}%`,
        duration: 5000,
      });

    } catch (error) {
      console.error('Error during auto-grading:', error);
      toast.error('채점 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="animate-spin w-4 h-4" />
      </div>
    );
  }

  if (fetchError || !worksheetData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <div className="font-medium mb-2">오류 발생</div>
          <div className="text-sm">{fetchError}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50 max-w-7xl mx-auto">
      {/* Main Content - Full Height */}
      {/* OMR Sheet - Left Side */}
      <div className="w-48 bg-white border-r overflow-hidden">
        <OMRSheet
          problemCount={worksheetData.problems.length}
          answers={answers}
          onAnswerChange={handleAnswerChange}
          onAutoGrade={handleAutoGrade}
          gradingResults={gradingResults}
        />
      </div>

      {/* PDF Viewer - Right Side */}
      <div className="flex-1 bg-white">
        <SolvePDFViewer
          worksheetData={worksheetData}
        />
      </div>
    </div>
  );
}