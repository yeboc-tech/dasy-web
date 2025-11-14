import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./components/logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/signin');
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    // Sign out the user and redirect to admin signin page
    await supabase.auth.signOut();
    redirect('/admin/signin');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple top navbar with KIDARI logo and navigation */}
      <div className="w-full h-[60px] border-b bg-white shrink-0">
        <div className="max-w-4xl mx-auto p-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/label-types" className="text-lg font-medium">
              KIDARI 관리자
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/admin/problems"
                className="text-gray-600 hover:text-black transition-colors"
              >
                문제
              </Link>
              <Link
                href="/admin/label-types"
                className="text-gray-600 hover:text-black transition-colors"
              >
                라벨 타입
              </Link>
              <Link
                href="/admin/labels"
                className="text-gray-600 hover:text-black transition-colors"
              >
                라벨
              </Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
