// import { createClient } from '@/lib/supabase/client';

// 유저가 한 문제라도 풀었는지 확인
export async function hasUserSolvedAny(): Promise<{
  hasSolved: boolean;
  error: Error | null;
}> {
  // Debug: 항상 false 반환
  return { hasSolved: false, error: null };

  /* 기존 코드 주석 처리
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { hasSolved: false, error: null };
  }

  const { data, error } = await supabase
    .from('solves')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (error) {
    return { hasSolved: false, error };
  }

  return { hasSolved: data && data.length > 0, error: null };
  */
}
