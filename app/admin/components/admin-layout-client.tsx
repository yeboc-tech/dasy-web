'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader } from 'lucide-react';
import { AdminNav } from './admin-nav';
import { LogoutButton } from './logout-button';

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const isSigninPage = pathname === '/admin/signin';

  // Check if we're in local development
  const isLocalDev = process.env.NODE_ENV === 'development' &&
    (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') ||
     process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost'));

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for local development
      if (isLocalDev) {
        setIsAuthorized(true);
        setIsChecking(false);
        return;
      }

      // Skip auth check for signin page
      if (isSigninPage) {
        setIsAuthorized(true);
        setIsChecking(false);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/admin/signin');
        setIsChecking(false);
        return;
      }

      // Check admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        router.push('/admin/signin');
        setIsChecking(false);
        return;
      }

      setIsAuthorized(true);
      setIsChecking(false);
    };

    checkAuth();
  }, [pathname, router, isSigninPage, isLocalDev]);

  // Show loading during auth check
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin w-4 h-4" />
      </div>
    );
  }

  // If not authorized and not on signin page, show nothing (redirect will happen)
  if (!isAuthorized && !isSigninPage) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Show navbar only when authorized and not on signin page */}
      {!isSigninPage && isAuthorized && (
        <div className="w-full h-[60px] border-b bg-white shrink-0 sticky top-0 z-[10000]">
          <div className="max-w-4xl mx-auto p-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin/label-types" className="text-lg font-medium">
                KIDARI 관리자
              </Link>
              <AdminNav />
            </div>
            <LogoutButton />
          </div>
        </div>
      )}

      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
