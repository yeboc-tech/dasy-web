import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabaseConfig() {
  const useLocalDb = process.env.NEXT_PUBLIC_USE_LOCAL_DB === 'true';

  if (useLocalDb) {
    return {
      url: process.env.NEXT_PUBLIC_LOCAL_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY!
    };
  }

  // Use new remote variables if available, otherwise fall back to legacy variables
  return {
    url: process.env.NEXT_PUBLIC_REMOTE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_REMOTE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  };
}

export async function createClient() {
  const cookieStore = await cookies()
  const config = getSupabaseConfig();

  return createServerClient(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}