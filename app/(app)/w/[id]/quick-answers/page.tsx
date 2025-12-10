'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader } from 'lucide-react';
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

// Convert answer number to circled number character
function getCircledNumber(answer: string | number | undefined): string {
  if (!answer) return '-';

  const num = typeof answer === 'string' ? parseInt(answer) : answer;

  // Unicode circled numbers: ① = U+2460, ② = U+2461, etc.
  if (num >= 1 && num <= 20) {
    return String.fromCharCode(0x2460 + num - 1);
  }

  // For numbers > 20, just return the number
  return String(answer);
}

export default function QuickAnswersPage() {
  const params = useParams();
  const worksheetId = params.id as string;

  const [worksheetData, setWorksheetData] = useState<WorksheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorksheet = async () => {
      try {
        setLoading(true);
        setError(null);

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

        // Detect if it's a tagged worksheet by checking problem ID format
        const { isTaggedWorksheet } = await import('@/lib/supabase/services/taggedWorksheetService');
        const isTagged = isTaggedWorksheet(worksheetMeta.selected_problem_ids);

        let data;
        if (isTagged) {
          // Use tagged worksheet service
          const { getTaggedWorksheet } = await import('@/lib/supabase/services/taggedWorksheetService');
          data = await getTaggedWorksheet(supabase, worksheetId);
        } else {
          // Use regular worksheet service
          const { getWorksheet } = await import('@/lib/supabase/services/worksheetService');
          data = await getWorksheet(supabase, worksheetId);
        }

        setWorksheetData(data);

      } catch (error) {
        console.error('Error fetching worksheet:', error);
        setError(error instanceof Error ? error.message : '워크시트를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (worksheetId) {
      fetchWorksheet();
    }
  }, [worksheetId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="animate-spin w-4 h-4 text-gray-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-gray-600">
          {error}
        </div>
      </div>
    );
  }

  if (!worksheetData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-gray-600">
          워크시트를 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">빠른 정답</h1>

        {/* Worksheet Metadata - One-liner */}
        <div className="mb-6 text-sm text-gray-600">
          {worksheetData.worksheet.title} - {worksheetData.worksheet.author}, {worksheetData.problems.length}문제, {new Date(worksheetData.worksheet.created_at).toLocaleDateString('ko-KR')}
        </div>

        <div className="bg-white shadow overflow-hidden border border-gray-300">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {Array.from({ length: Math.ceil(worksheetData.problems.length / 10) }, (_, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 1 ? 'bg-pink-50/30' : 'bg-white'}
                >
                  {Array.from({ length: 10 }, (_, colIndex) => {
                    const problemIndex = rowIndex * 10 + colIndex;
                    const problem = worksheetData.problems[problemIndex];

                    if (!problem) {
                      return <td key={colIndex} className="px-2 py-1.5 text-xs border border-gray-300"></td>;
                    }

                    return (
                      <td key={colIndex} className="px-2 py-1.5 text-xs border border-gray-300">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-bold text-xs text-right min-w-[2ch]" style={{ color: '#FF00A1' }}>{problemIndex + 1}</span>
                          <span className="text-base text-gray-700 text-left">
                            {getCircledNumber(problem.answer)}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
