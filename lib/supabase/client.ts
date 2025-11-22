import { createBrowserClient } from '@supabase/ssr'

function getSupabaseConfig() {
  const useLocalDb = process.env.NEXT_PUBLIC_USE_LOCAL_DB === 'true';

  if (useLocalDb) {
    return {
      url: process.env.NEXT_PUBLIC_LOCAL_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY!
    };
  }

  return {
    url: process.env.NEXT_PUBLIC_REMOTE_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_REMOTE_SUPABASE_ANON_KEY!
  };
}

export function createClient() {
  const config = getSupabaseConfig();
  console.log('[Supabase Client] Connecting to:', config.url);
  return createBrowserClient(config.url, config.anonKey);
}