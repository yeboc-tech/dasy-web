'use client';

import { useState, useEffect, useCallback } from 'react';
import { OneProblemSolverDialog } from '@/components/OneProblemSolverDialog';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';
import { useAuth } from '@/lib/contexts/auth-context';
import { fetchTodayProblem } from '@/lib/api/SupabaseRpc';

interface TodayProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TodayProblemDialog({ open, onOpenChange }: TodayProblemDialogProps) {
  const { user } = useAuth();
  const { interestSubjectIds, problemRange, currentGrade, fetchSettings, initialized } = useUserAppSettingStore();
  const [ready, setReady] = useState(false);

  // 사용자 설정 로드
  useEffect(() => {
    if (open && user) {
      if (!initialized || interestSubjectIds.length === 0) {
        fetchSettings(user.id);
      }
    }
  }, [open, user, initialized, interestSubjectIds, fetchSettings]);

  // 설정이 로드되면 ready 상태로 전환
  useEffect(() => {
    if (initialized && interestSubjectIds.length > 0) {
      setReady(true);
    }
  }, [initialized, interestSubjectIds]);

  // 문제 가져오기 함수
  const handleFetchProblem = useCallback(async (subjectFilter?: string) => {
    if (interestSubjectIds.length === 0) {
      return { data: null, error: new Error('앱 설정에서 학습 과목을 선택해주세요.') };
    }

    return await fetchTodayProblem({
      // 과목 필터가 있으면 해당 과목만, 없으면 전체 관심 과목
      interestSubjectIds: subjectFilter ? [subjectFilter] : interestSubjectIds,
      problemRange,
      currentGrade,
    });
  }, [interestSubjectIds, problemRange, currentGrade]);

  // 세션 ID 생성 (today-problem-YYMMDD)
  const getSessionId = useCallback(() => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `today-problem-${yy}${mm}${dd}`;
  }, []);

  // ready 상태가 아니면 다이얼로그를 열지 않음
  if (!ready && open) {
    return null;
  }

  return (
    <OneProblemSolverDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="today"
      title="오늘의 문제"
      fetchProblem={handleFetchProblem}
      showHideToday={true}
      hideLocalStorageKey="hideTodayProblem"
      getSessionId={getSessionId}
    />
  );
}

// 세션 중 다이얼로그가 이미 표시되었는지 추적
let hasShownThisSession = false;

export function useTodayProblemDialog() {
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // 이미 이 세션에서 보여줬으면 스킵
    if (hasShownThisSession) return;

    const hiddenDate = localStorage.getItem('hideTodayProblem');
    const today = new Date().toDateString();
    if (hiddenDate !== today) {
      setShowDialog(true);
      hasShownThisSession = true;
    }
  }, []);

  return { showDialog, setShowDialog };
}
