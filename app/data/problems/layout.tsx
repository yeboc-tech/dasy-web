import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./components/logout-button";

export default async function DataProblemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/data/signin');
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    // Sign out the user and redirect to data signin page
    await supabase.auth.signOut();
    redirect('/data/signin');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple top navbar with KIDARI logo */}
      <div className="w-full h-[60px] border-b bg-white shrink-0">
        <div className="max-w-4xl mx-auto p-4 h-full flex items-center justify-between">
          <Link href="/data/problems" className="text-lg font-medium">
            KIDARI 데이터
          </Link>
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
