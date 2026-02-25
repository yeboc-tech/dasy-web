'use client';

import { useCallback } from 'react';
import { ProblemAnalysisTable } from '@/components/ProblemAnalysisTable';
import type { ProblemAnalysis } from '@/lib/api/SupabaseRpc';

export default function WrongAnswerAnalysisPage() {
  const filterWrong = useCallback((items: ProblemAnalysis[]) => {
    return items.filter((item) => item.oxRecord.slice(-1) === 'X');
  }, []);

  return (
    <ProblemAnalysisTable
      title="내 오답 문제 분석"
      filterFn={filterWrong}
      emptyMessage="오답 문제가 없습니다."
      showReport={false}
    />
  );
}
