'use client';

import Link from 'next/link';
import { AppSidebar } from '@/components/app-sidebar';
import { CustomButton } from '@/components/custom-button';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAuthActions } from '@/lib/hooks/use-auth';
import { AuthBlockerProvider } from '@/lib/contexts/auth-blocker-context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { signOut } = useAuthActions();

  return (
    <AuthBlockerProvider>
      <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--app-bg)' }}>
        {/* Top Navbar */}
        <div className="w-full h-14 flex items-center justify-between px-4 gap-2 shrink-0">
          {/* Logo with subtitle */}
          <Link href="/build" className="flex items-end gap-2">
            <span className="text-xl font-semibold text-[var(--foreground)] leading-none">KIDARI</span>
            <span className="text-xs text-[var(--gray-500)] leading-none pb-0.5">학습지 제작 도구</span>
          </Link>

          {/* Auth Buttons / Profile */}
          <div className="flex gap-2">
            {loading ? (
              <div className="w-8 h-8 flex items-center justify-center">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-md bg-[var(--gray-200)] text-[var(--gray-900)] flex items-center justify-center text-sm font-medium hover:bg-[var(--gray-300)] transition-colors cursor-pointer">
                    {user.email?.[0].toUpperCase() || 'U'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white">
                  <div className="px-2 py-1.5 text-sm text-[var(--gray-500)]">
                    {user.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer hover:bg-[var(--gray-100)] transition-colors">
                      내 프로필
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer hover:bg-[var(--gray-100)] transition-colors">
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
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
