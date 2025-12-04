import { SupabaseClient } from '@supabase/supabase-js';
import { ProblemFilter } from '@/lib/utils/problemFiltering';
import type { ProblemMetadata } from '@/lib/types/problems';
import type { ChapterTreeItem } from '@/lib/types/database';

interface CreateWorksheetParams {
  title: string;
  author: string;
  userId?: string; // Optional: if provided, worksheet is associated with this user
  filters: {
    selectedChapters: string[];
    selectedDifficulties: string[];
    selectedProblemTypes: string[];
    selectedSubjects: string[];
    problemCount: number;
    correctRateRange: [number, number];
  };
  problems: ProblemMetadata[];
  contentTree?: ChapterTreeItem[];
}

interface WorksheetData {
  id: string;
  title: string;
  author: string;
  filters: Record<string, unknown>;
  created_at: string;
  selected_problem_ids: string[];
  is_public: boolean;
}

export async function createWorksheet(
  supabase: SupabaseClient,
  params: CreateWorksheetParams
): Promise<{ id: string; problemCount: number }> {
  const { title, author, userId, filters, problems } = params;

  // Use the provided problems directly (they're already filtered from the preview)
  const selectedProblemIds = problems.map(problem => problem.id);

  if (selectedProblemIds.length === 0) {
    throw new Error('No problems match the selected filters');
  }

  // Insert worksheet with both filters and resolved problem IDs
  const { data: worksheet, error } = await supabase
    .from('worksheets')
    .insert({
      title: title.trim(),
      author: author.trim(),
      selected_problem_ids: selectedProblemIds,
      filters: filters,
      created_by: userId || null
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating worksheet:', error);
    throw new Error('Failed to create worksheet');
  }

  return { 
    id: worksheet.id,
    problemCount: selectedProblemIds.length
  };
}

export async function getWorksheet(
  supabase: SupabaseClient, 
  id: string
): Promise<{ worksheet: WorksheetData; problems: ProblemMetadata[] }> {
  // Fetch worksheet
  const { data: worksheet, error: worksheetError } = await supabase
    .from('worksheets')
    .select('*')
    .eq('id', id)
    .single();

  if (worksheetError) {
    if (worksheetError.code === 'PGRST116') {
      throw new Error('Worksheet not found');
    }
    console.error('Error fetching worksheet:', worksheetError);
    throw new Error('Failed to fetch worksheet');
  }

  // Fetch the actual problems using the stored problem IDs
  // Handle large result sets by batching queries to avoid URL/query limits
  const batchSize = 100; // Safe batch size to avoid URL/query limits
  const problemIds = worksheet.selected_problem_ids;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allProblems: any[] = [];

  // Fetching problems in batches

  for (let i = 0; i < problemIds.length; i += batchSize) {
    const batch = problemIds.slice(i, i + batchSize);
    // Fetching batch
    
    const { data: batchProblems, error: batchError } = await supabase
      .from('problems')
      .select(`
        id,
        problem_filename,
        answer_filename,
        answer,
        chapter_id,
        difficulty,
        problem_type,
        tags,
        correct_rate,
        exam_year,
        created_at,
        updated_at,
        problem_subjects(
          subjects(name)
        )
      `)
      .in('id', batch);

    if (batchError) {
      console.error(`Error fetching problems batch ${Math.floor(i/batchSize) + 1}:`, batchError);
      throw new Error(`Failed to fetch problems batch: ${batchError.message || JSON.stringify(batchError)}`);
    }

    allProblems = allProblems.concat(batchProblems || []);
  }

  const problems = allProblems;

  // Transform problems to match ProblemMetadata interface
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformedProblems = (problems || []).map((problem: any) => ({
    id: problem.id,
    problem_filename: problem.problem_filename,
    answer_filename: problem.answer_filename,
    answer: problem.answer,
    chapter_id: problem.chapter_id,
    difficulty: problem.difficulty,
    problem_type: problem.problem_type,
    tags: problem.tags || [],
    correct_rate: problem.correct_rate,
    exam_year: problem.exam_year,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    related_subjects: problem.problem_subjects?.map((ps: any) => ps.subjects.name) || [],
    created_at: problem.created_at,
    updated_at: problem.updated_at
  }));

  // Preserve the original order from selected_problem_ids
  // Create a map for quick lookup
  const problemMap = new Map(transformedProblems.map(p => [p.id, p]));

  // Sort according to the order in selected_problem_ids
  const sortedProblems = problemIds
    .map((id: string) => problemMap.get(id))
    .filter((p: ProblemMetadata | undefined): p is ProblemMetadata => p !== undefined);

  return {
    worksheet: {
      id: worksheet.id,
      title: worksheet.title,
      author: worksheet.author,
      filters: worksheet.filters,
      created_at: worksheet.created_at,
      selected_problem_ids: worksheet.selected_problem_ids,
      is_public: worksheet.is_public || false
    },
    problems: sortedProblems
  };
}

export async function updateWorksheet(
  supabase: SupabaseClient,
  id: string,
  updates: { title?: string; author?: string }
): Promise<void> {
  const { error } = await supabase
    .from('worksheets')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating worksheet:', error);
    throw new Error('Failed to update worksheet');
  }
}

interface UpdateWorksheetFullParams {
  title: string;
  author: string;
  filters: {
    selectedChapters: string[];
    selectedDifficulties: string[];
    selectedProblemTypes: string[];
    selectedSubjects: string[];
    problemCount: number;
    correctRateRange: [number, number];
  };
  problems: ProblemMetadata[];
}

export async function updateWorksheetFull(
  supabase: SupabaseClient,
  id: string,
  params: UpdateWorksheetFullParams
): Promise<void> {
  const { title, author, filters, problems } = params;

  const selectedProblemIds = problems.map(problem => problem.id);

  if (selectedProblemIds.length === 0) {
    throw new Error('No problems to save');
  }

  const { error } = await supabase
    .from('worksheets')
    .update({
      title: title.trim(),
      author: author.trim(),
      selected_problem_ids: selectedProblemIds,
      filters: filters
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating worksheet:', error);
    throw new Error('Failed to update worksheet');
  }
}

export async function publishWorksheet(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('worksheets')
    .update({ is_public: true })
    .eq('id', id);

  if (error) {
    console.error('Error publishing worksheet:', error);
    throw new Error('Failed to publish worksheet');
  }
}

export interface MyWorksheetItem {
  id: string;
  title: string;
  author: string;
  created_at: string;
  selected_problem_ids: string[];
  is_public: boolean;
}

export async function getMyWorksheets(
  supabase: SupabaseClient,
  userId: string,
  options?: { limit?: number; offset?: number; search?: string }
): Promise<{ worksheets: MyWorksheetItem[]; total: number }> {
  const { limit = 20, offset = 0, search } = options || {};

  let query = supabase
    .from('worksheets')
    .select('id, title, author, created_at, selected_problem_ids, is_public', { count: 'exact' })
    .eq('created_by', userId);

  if (search?.trim()) {
    query = query.ilike('title', `%${search.trim()}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching user worksheets:', error);
    throw new Error('Failed to fetch worksheets');
  }

  return {
    worksheets: data || [],
    total: count || 0
  };
}

export async function deleteWorksheet(
  supabase: SupabaseClient,
  worksheetId: string,
  userId: string
): Promise<void> {
  // Verify ownership before deleting
  const { data: worksheet, error: fetchError } = await supabase
    .from('worksheets')
    .select('created_by')
    .eq('id', worksheetId)
    .single();

  if (fetchError) {
    console.error('Error fetching worksheet:', fetchError);
    throw new Error('Worksheet not found');
  }

  if (worksheet.created_by !== userId) {
    throw new Error('Not authorized to delete this worksheet');
  }

  const { error } = await supabase
    .from('worksheets')
    .delete()
    .eq('id', worksheetId);

  if (error) {
    console.error('Error deleting worksheet:', error);
    throw new Error('Failed to delete worksheet');
  }
}