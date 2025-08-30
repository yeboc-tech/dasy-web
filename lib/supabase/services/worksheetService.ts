import { SupabaseClient } from '@supabase/supabase-js';
import { ProblemFilter } from '@/lib/utils/problemFiltering';
import type { ProblemMetadata } from '@/lib/types/problems';
import type { ChapterTreeItem } from '@/lib/types/database';

interface CreateWorksheetParams {
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
  const { title, author, filters, problems, contentTree = [] } = params;
  
  // Filter problems to get the exact selection
  const filteredProblems = ProblemFilter.filterProblems(problems, {
    ...filters,
    contentTree
  });
  
  const selectedProblemIds = filteredProblems.map(problem => problem.id);

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
      filters: filters
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

  console.log(`Fetching ${problemIds.length} problems in batches of ${batchSize}`);

  for (let i = 0; i < problemIds.length; i += batchSize) {
    const batch = problemIds.slice(i, i + batchSize);
    console.log(`Fetching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(problemIds.length/batchSize)} (${batch.length} problems)`);
    
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
        correct_rate,
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
    correct_rate: problem.correct_rate,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tags: problem.problem_subjects?.map((ps: any) => ps.subjects.name) || [],
    created_at: problem.created_at,
    updated_at: problem.updated_at
  }));

  // Sort problems by correct rate (highest first = easiest problems first)
  transformedProblems.sort((a, b) => {
    const aCorrectRate = a.correct_rate ?? 0;
    const bCorrectRate = b.correct_rate ?? 0;
    return bCorrectRate - aCorrectRate;
  });

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
    problems: transformedProblems
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