'use client';

import { useCallback } from 'react';
import { OneProblemSolverDialog } from '@/components/OneProblemSolverDialog';
import { OneProblemRecommender } from '@/lib/service/OneProblemRecommender';

interface WrongAnswerReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WrongAnswerReviewDialog({ open, onOpenChange }: WrongAnswerReviewDialogProps) {
  // 오답 문제 가져오기 함수
  const handleFetchProblem = useCallback(async (subjectFilter?: string) => {
    return await OneProblemRecommender.fetchWrongAnswerProblem({
      subjectFilter,
    });
  }, []);

  // 세션 ID 생성 (wrong-review-YYMMDD)
  const getSessionId = useCallback(() => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `wrong-review-${yy}${mm}${dd}`;
  }, []);

  return (
    <OneProblemSolverDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="review"
      title="오답복습"
      fetchProblem={handleFetchProblem}
      showHideToday={false}
      getSessionId={getSessionId}
    />
  );
}
