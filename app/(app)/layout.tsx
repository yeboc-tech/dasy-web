'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { CustomButton } from '@/components/custom-button';
import { useAuth } from '@/lib/contexts/auth-context';
import { AuthBlockerProvider } from '@/lib/contexts/auth-blocker-context';
import { TodayProblemDialog, useTodayProblemDialog } from '@/components/TodayProblemDialog';
import { WrongAnswerReviewDialog } from '@/components/WrongAnswerReviewDialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { showDialog, setShowDialog } = useTodayProblemDialog();
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  const handleTodayProblemClick = () => {
    if (!user) {
      setShowLoginDialog(true);
    } else {
      setShowDialog(true);
    }
  };

  const handleReviewClick = () => {
    if (!user) {
      setShowLoginDialog(true);
    } else {
      setShowReviewDialog(true);
    }
  };

  return (
    <AuthBlockerProvider>
      {/* 오늘의 문제 다이얼로그 */}
      <TodayProblemDialog open={showDialog} onOpenChange={setShowDialog} />

      {/* 오답복습 다이얼로그 */}
      <WrongAnswerReviewDialog open={showReviewDialog} onOpenChange={setShowReviewDialog} />

      {/* 로그인 안내 다이얼로그 */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogTitle className="sr-only">로그인 필요</DialogTitle>
          <div className="flex flex-col items-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
              <Lock className="w-6 h-6 text-[var(--gray-600)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              로그인이 필요합니다
            </h2>
            <p className="text-sm text-[var(--gray-600)] text-center">
              이 기능을 이용하려면 로그인해주세요
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link href="/auth/signin" onClick={() => setShowLoginDialog(false)}>
                <CustomButton variant="outline" size="sm">
                  로그인
                </CustomButton>
              </Link>
              <Link href="/auth/signup" onClick={() => setShowLoginDialog(false)}>
                <CustomButton variant="secondary" size="sm">
                  회원가입
                </CustomButton>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--app-bg)' }}>
        {/* Top Navbar */}
        <div className="w-full h-14 flex items-center justify-between px-4 gap-2 shrink-0">
          {/* Logo with subtitle */}
          <Link href="/home" className="flex items-end gap-2">
            <span className="text-4xl font-bold text-[var(--foreground)] leading-none">KIDARI</span>
            <div className="flex flex-col leading-none pb-0.5">
              <span className="text-xs text-[var(--gray-500)]">사회탐구 기출문제</span>
              <span className="text-xs text-[var(--gray-500)]">꼼꼼히 빈틈없이 공부하자</span>
            </div>
          </Link>

          {/* Auth Buttons / Profile */}
          <div className="flex gap-2 items-center">
            {/* 오늘의 문제 버튼 */}
            <button
              onClick={handleTodayProblemClick}
              className="px-3 h-8 rounded-md bg-[#FFF0F7] text-[#FF00A1] text-sm font-medium hover:bg-[#FFE0F0] transition-colors cursor-pointer"
            >
              오늘의 문제
            </button>

            {/* 오답복습 버튼 */}
            <button
              onClick={handleReviewClick}
              className="px-3 h-8 rounded-md bg-[#FFF0F7] text-[#FF00A1] text-sm font-medium hover:bg-[#FFE0F0] transition-colors cursor-pointer"
            >
              오답복습
            </button>

            {!loading && !user && (
              <>
                <Link href="/auth/signin">
                  <CustomButton variant="outline" size="sm">
                    로그인
                  </CustomButton>
                </Link>
                <Link href="/auth/signup">
                  <CustomButton variant="secondary" size="sm">
                    회원가입
                  </CustomButton>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Wrapper for Sidebar + Card with padding on bottom and sides (no top) */}
        <div className="flex-1 flex overflow-hidden px-2 pb-2 gap-2">
          {/* Sidebar */}
          <AppSidebar />

          {/* Main Content Area with Card */}
          <main className="flex-1">
            {/* White card container */}
            <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden w-full h-full flex flex-col">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthBlockerProvider>
  );
}
