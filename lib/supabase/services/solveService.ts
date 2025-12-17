import { SupabaseClient } from '@supabase/supabase-js';

// Result for each problem in a solve attempt
export interface ProblemResult {
  user_answer: number;
  correct_answer: number;
  is_correct: boolean;
  score: number; // 2 or 3 points
}

// Full solve record
export interface SolveRecord {
  id: string;
  worksheet_id: string;
  user_id: string;
  score: number;
  max_score: number;
  correct_count: number;
  total_problems: number;
  results: Record<string, ProblemResult>; // problem_id -> result
  created_at: string;
}

// For saving a new solve
interface SaveSolveParams {
  worksheetId: string;
  userId: string;
  score: number;
  maxScore: number;
  correctCount: number;
  totalProblems: number;
  results: Record<string, ProblemResult>;
}

// Save a new solve record
export async function saveSolve(
  supabase: SupabaseClient,
  params: SaveSolveParams
): Promise<{ id: string }> {
  const { worksheetId, userId, score, maxScore, correctCount, totalProblems, results } = params;

  const { data, error } = await supabase
    .from('solves')
    .insert({
      worksheet_id: worksheetId,
      user_id: userId,
      score,
      max_score: maxScore,
      correct_count: correctCount,
      total_problems: totalProblems,
      results
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving solve:', error);
    throw new Error('Failed to save solve record');
  }

  return { id: data.id };
}

// Update an existing solve record
interface UpdateSolveParams {
  solveId: string;
  userId: string;
  score: number;
  maxScore: number;
  correctCount: number;
  totalProblems: number;
  results: Record<string, ProblemResult>;
}

export async function updateSolve(
  supabase: SupabaseClient,
  params: UpdateSolveParams
): Promise<void> {
  const { solveId, userId, score, maxScore, correctCount, totalProblems, results } = params;

  const { error } = await supabase
    .from('solves')
    .update({
      score,
      max_score: maxScore,
      correct_count: correctCount,
      total_problems: totalProblems,
      results
    })
    .eq('id', solveId)
    .eq('user_id', userId); // Ensure user owns this solve

  if (error) {
    console.error('Error updating solve:', error);
    throw new Error('Failed to update solve record');
  }
}

// Get all solves for a specific worksheet by a user
export async function getSolvesByWorksheet(
  supabase: SupabaseClient,
  worksheetId: string,
  userId: string
): Promise<SolveRecord[]> {
  const { data, error } = await supabase
    .from('solves')
    .select('*')
    .eq('worksheet_id', worksheetId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching solves:', error);
    throw new Error('Failed to fetch solve records');
  }

  return data || [];
}

// Get all solves by a user (with worksheet info)
export async function getSolvesByUser(
  supabase: SupabaseClient,
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ solves: (SolveRecord & { worksheet_title: string })[]; total: number }> {
  const { limit = 50, offset = 0 } = options || {};

  const { data, error, count } = await supabase
    .from('solves')
    .select(`
      *,
      worksheets!inner(title)
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching user solves:', error);
    throw new Error('Failed to fetch solve records');
  }

  // Transform to include worksheet_title at top level
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solves = (data || []).map((solve: any) => {
    const wsData = solve.worksheets;
    const ws = Array.isArray(wsData) ? wsData[0] : wsData;
    return {
      ...solve,
      worksheet_title: ws?.title || 'Unknown'
    };
  });

  return { solves, total: count || 0 };
}

// Get unique wrong problem IDs for a user (for 오답 feature)
export async function getWrongProblemIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('solves')
    .select('results')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching wrong problems:', error);
    throw new Error('Failed to fetch wrong problems');
  }

  // Extract unique problem IDs where is_correct = false
  const wrongProblemIds = new Set<string>();

  for (const solve of data || []) {
    const results = solve.results as Record<string, ProblemResult>;
    for (const [problemId, result] of Object.entries(results)) {
      if (!result.is_correct) {
        wrongProblemIds.add(problemId);
      }
    }
  }

  return Array.from(wrongProblemIds);
}

// Get solve count for a worksheet (for displaying in 내 학습지)
export async function getSolveCountByWorksheet(
  supabase: SupabaseClient,
  worksheetId: string,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('solves')
    .select('*', { count: 'exact', head: true })
    .eq('worksheet_id', worksheetId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error counting solves:', error);
    return 0;
  }

  return count || 0;
}

// Get worksheets that user has solved (for "내가 푼" tab)
export async function getSolvedWorksheets(
  supabase: SupabaseClient,
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ worksheets: { id: string; title: string; author: string; solve_count: number; last_solve_at: string; thumbnail_path?: string | null }[]; total: number }> {
  const { limit = 20, offset = 0 } = options || {};

  // Get distinct worksheet IDs with solve counts
  const { data, error, count } = await supabase
    .from('solves')
    .select(`
      worksheet_id,
      created_at,
      worksheets!inner(id, title, author, thumbnail_path)
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching solved worksheets:', error);
    throw new Error('Failed to fetch solved worksheets');
  }

  // Group by worksheet and count solves
  const worksheetMap = new Map<string, { id: string; title: string; author: string; solve_count: number; last_solve_at: string; thumbnail_path?: string | null }>();

  for (const solve of data || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wsData = solve.worksheets as any;
    // Handle both array and object cases from Supabase
    const ws = Array.isArray(wsData) ? wsData[0] : wsData;
    if (!ws) continue;

    if (!worksheetMap.has(ws.id)) {
      worksheetMap.set(ws.id, {
        id: ws.id,
        title: ws.title,
        author: ws.author,
        solve_count: 1,
        last_solve_at: solve.created_at,
        thumbnail_path: ws.thumbnail_path
      });
    } else {
      const existing = worksheetMap.get(ws.id)!;
      existing.solve_count++;
    }
  }

  const worksheets = Array.from(worksheetMap.values())
    .slice(offset, offset + limit);

  return { worksheets, total: worksheetMap.size };
}

// Delete a solve record
export async function deleteSolve(
  supabase: SupabaseClient,
  solveId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('solves')
    .delete()
    .eq('id', solveId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting solve:', error);
    throw new Error('Failed to delete solve record');
  }
}
