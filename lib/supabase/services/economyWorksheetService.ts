import { SupabaseClient } from '@supabase/supabase-js';
import type { ProblemMetadata } from '@/lib/types/problems';
import type { EconomyProblem } from '@/lib/types';

interface CreateEconomyWorksheetParams {
  title: string;
  author: string;
  filters: {
    selectedChapters: string[];
    selectedDifficulties: string[];
    selectedGrades: string[];
    selectedYears: number[];
    selectedMonths: string[];
    selectedExamTypes: string[];
    correctRateRange: [number, number];
    problemCount: number;
  };
  problems: ProblemMetadata[]; // Already converted economy problems
}

interface EconomyWorksheetData {
  id: string;
  title: string;
  author: string;
  filters: Record<string, unknown>;
  created_at: string;
  selected_problem_ids: string[];
  is_public: boolean;
  worksheet_type: 'economy'; // Mark as economy worksheet
}

/**
 * Create a worksheet for economy problems
 * Stores economy problem IDs (like "경제_고3_2024_03_학평_1_문제")
 */
export async function createEconomyWorksheet(
  supabase: SupabaseClient,
  params: CreateEconomyWorksheetParams
): Promise<{ id: string; problemCount: number }> {
  const { title, author, filters, problems } = params;

  const selectedProblemIds = problems.map(problem => problem.id);

  if (selectedProblemIds.length === 0) {
    throw new Error('No problems match the selected filters');
  }

  // Insert worksheet with economy-specific filters
  const { data: worksheet, error } = await supabase
    .from('worksheets')
    .insert({
      title: title.trim(),
      author: author.trim(),
      selected_problem_ids: selectedProblemIds,
      filters: {
        ...filters,
        worksheet_type: 'economy' // Mark as economy worksheet
      }
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating economy worksheet:', error);
    throw new Error('Failed to create economy worksheet');
  }

  return {
    id: worksheet.id,
    problemCount: selectedProblemIds.length
  };
}

/**
 * Get an economy worksheet and its problems
 * Fetches from problem_tags + accuracy_rate tables
 */
export async function getEconomyWorksheet(
  supabase: SupabaseClient,
  id: string
): Promise<{ worksheet: EconomyWorksheetData; problems: ProblemMetadata[] }> {
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
    console.error('Error fetching economy worksheet:', worksheetError);
    throw new Error('Failed to fetch economy worksheet');
  }

  const problemIds = worksheet.selected_problem_ids as string[];

  // Fetch problems from problem_tags and accuracy_rate
  const BATCH_SIZE = 50;
  const allProblems: ProblemMetadata[] = [];

  for (let i = 0; i < problemIds.length; i += BATCH_SIZE) {
    const batch = problemIds.slice(i, i + BATCH_SIZE);

    // Fetch problem tags
    const { data: tagsData, error: tagsError } = await supabase
      .from('problem_tags')
      .select('problem_id, tag_ids, tag_labels')
      .in('problem_id', batch)
      .eq('type', 'MT_단원_태그');

    if (tagsError) {
      console.error('Error fetching economy problem tags:', tagsError);
      throw new Error('Failed to fetch economy problems');
    }

    // Fetch accuracy data
    const { data: accuracyData, error: accuracyError } = await supabase
      .from('accuracy_rate')
      .select('problem_id, difficulty, accuracy_rate, correct_answer, score')
      .in('problem_id', batch);

    if (accuracyError) {
      console.error('Error fetching economy problem accuracy:', accuracyError);
      throw new Error('Failed to fetch economy problem data');
    }

    // Create accuracy map
    const accuracyMap = new Map();
    (accuracyData || []).forEach(item => {
      accuracyMap.set(item.problem_id, item);
    });

    // Merge data and convert to ProblemMetadata
    (tagsData || []).forEach(tagItem => {
      const parsed = parseProblemId(tagItem.problem_id);
      if (!parsed) return;

      const accuracyInfo = accuracyMap.get(tagItem.problem_id);

      allProblems.push({
        id: tagItem.problem_id,
        problem_filename: `${tagItem.problem_id}.png`,
        answer_filename: tagItem.problem_id.replace('_문제', '_해설') + '.png',
        answer: accuracyInfo?.correct_answer,
        chapter_id: tagItem.tag_ids[tagItem.tag_ids.length - 1] || null,
        difficulty: accuracyInfo?.difficulty || '중',
        problem_type: `${parsed.exam_type} ${parsed.year}년 ${parseInt(parsed.month)}월`,
        tags: tagItem.tag_labels,
        related_subjects: ['경제'],
        correct_rate: accuracyInfo?.accuracy_rate,
        exam_year: parseInt(parsed.year),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
  }

  // Preserve original order from selected_problem_ids
  const problemMap = new Map(allProblems.map(p => [p.id, p]));
  const sortedProblems = problemIds
    .map(id => problemMap.get(id))
    .filter((p): p is ProblemMetadata => p !== undefined);

  return {
    worksheet: {
      id: worksheet.id,
      title: worksheet.title,
      author: worksheet.author,
      filters: worksheet.filters,
      created_at: worksheet.created_at,
      selected_problem_ids: worksheet.selected_problem_ids,
      is_public: worksheet.is_public || false,
      worksheet_type: 'economy'
    },
    problems: sortedProblems
  };
}

/**
 * Parse economy problem ID to extract metadata
 * Format: 경제_고3_2024_03_학평_1_문제
 */
function parseProblemId(problemId: string): {
  subject: string;
  grade: string;
  year: string;
  month: string;
  exam_type: string;
  question_number: number;
} | null {
  try {
    const cleaned = problemId.replace(/_(문제|해설)$/, '');
    const parts = cleaned.split('_');

    if (parts.length < 6) {
      console.warn('Invalid problem_id format:', problemId);
      return null;
    }

    const [subject, grade, year, month, exam_type, ...rest] = parts;
    const question_number = parseInt(rest[0], 10);

    if (isNaN(question_number)) {
      console.warn('Invalid question number in problem_id:', problemId);
      return null;
    }

    return {
      subject,
      grade,
      year,
      month,
      exam_type,
      question_number
    };
  } catch (error) {
    console.error('Error parsing problem_id:', problemId, error);
    return null;
  }
}

/**
 * Detect if problem IDs are economy problems
 * Economy problems have format: 경제_고3_2024_03_학평_1_문제
 */
export function isEconomyWorksheet(problemIds: string[]): boolean {
  if (problemIds.length === 0) return false;

  // Check first problem ID - if it starts with '경제_', it's an economy worksheet
  return problemIds[0].startsWith('경제_');
}
