'use client';

import { useState, useEffect, useCallback } from 'react';
import { OneProblemSolverDialog } from '@/components/OneProblemSolverDialog';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';
import { useAuth } from '@/lib/contexts/auth-context';
import { OneProblemRecommender } from '@/lib/service/OneProblemRecommender';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

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

    // 고2는 problem_id 과목명(경제 등)과 관심 과목(통합사회_1 등)이 다르므로
    // subjectFilter를 적용할 수 없어 항상 전체 관심 과목으로 조회한다.
    const subjects = (subjectFilter && currentGrade !== '고2')
      ? [subjectFilter]
      : interestSubjectIds;

    return await OneProblemRecommender.fetchTodayProblem({
      interestSubjectIds: subjects,
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

  const [hideToday, setHideToday] = useState(false);

  const handleClose = () => {
    if (hideToday) {
      localStorage.setItem('hideTodayProblem', new Date().toDateString());
    }
    onOpenChange(false);
  };

  // 설정 로드 완료했는데 관심과목이 없으면 안내 다이얼로그
  if (initialized && interestSubjectIds.length === 0 && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md gap-1" showCloseButton={false}>
          <DialogTitle><span className="font-light">오늘의 문제</span></DialogTitle>
          <div className="mt-1 min-h-[380px] flex flex-col items-center justify-center">
            <p className="text-gray-500 text-sm">관심 과목을 설정하면 오늘의 문제를 받을 수 있어요</p>
            <Link
              href="/settings/subjects"
              onClick={() => onOpenChange(false)}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#FF00A1] rounded-lg hover:bg-[#E0008E] transition-colors"
            >
              설정하러 가기
            </Link>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={hideToday}
                onCheckedChange={(checked) => setHideToday(checked === true)}
                className="border-gray-300"
              />
              <span className="text-sm text-gray-500">오늘 하루 보지 않기</span>
            </label>
            <button
              onClick={handleClose}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              확인
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // 설정 로드 중이면 렌더링하지 않음
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
