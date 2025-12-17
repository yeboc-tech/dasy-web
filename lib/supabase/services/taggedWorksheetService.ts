import { SupabaseClient } from '@supabase/supabase-js';
import type { ProblemMetadata } from '@/lib/types/problems';
import type { SortRule } from '@/lib/types/sorting';

// List of tagged subject prefixes
const TAGGED_SUBJECT_PREFIXES = ['경제_', '사회문화_', '생활과윤리_', '세계지리_', '한국지리_'];

interface CreateTaggedWorksheetParams {
  title: string;
  author: string;
  userId?: string; // Optional: if provided, worksheet is associated with this user
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
  problems: ProblemMetadata[]; // Already converted problems
  sorting?: SortRule[];
}

interface TaggedWorksheetData {
  id: string;
  title: string;
  author: string;
  filters: Record<string, unknown>;
  created_at: string;
  selected_problem_ids: string[];
  is_public: boolean;
  sorting: SortRule[];
}

/**
 * Get the tag type for a given subject
 * e.g., '경제' -> '단원_사회탐구_경제'
 */
function getTagType(subject: string): string {
  return `단원_사회탐구_${subject}`;
}

/**
 * Detect subject from problem ID
 * e.g., '경제_고3_2024_03_학평_1_문제' -> '경제'
 */
export function getSubjectFromProblemId(problemId: string): string | null {
  for (const prefix of TAGGED_SUBJECT_PREFIXES) {
    if (problemId.startsWith(prefix)) {
      return prefix.slice(0, -1); // Remove trailing '_'
    }
  }
  return null;
}

/**
 * Create a worksheet for tagged problems
 * Stores problem IDs (like "경제_고3_2024_03_학평_1_문제")
 */
export async function createTaggedWorksheet(
  supabase: SupabaseClient,
  params: CreateTaggedWorksheetParams
): Promise<{ id: string; problemCount: number }> {
  const { title, author, userId, filters, problems, sorting } = params;

  const selectedProblemIds = problems.map(problem => problem.id);

  if (selectedProblemIds.length === 0) {
    throw new Error('No problems match the selected filters');
  }

  // Insert worksheet
  const { data: worksheet, error } = await supabase
    .from('worksheets')
    .insert({
      title: title.trim(),
      author: author.trim(),
      selected_problem_ids: selectedProblemIds,
      filters: filters,
      created_by: userId || null,
      sorting: sorting || []
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating tagged worksheet:', error);
    throw new Error('Failed to create worksheet');
  }

  return {
    id: worksheet.id,
    problemCount: selectedProblemIds.length
  };
}

/**
 * Get a tagged worksheet and its problems
 * Fetches from problem_tags + accuracy_rate tables
 */
export async function getTaggedWorksheet(
  supabase: SupabaseClient,
  id: string
): Promise<{ worksheet: TaggedWorksheetData; problems: ProblemMetadata[] }> {
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
    console.error('Error fetching tagged worksheet:', worksheetError);
    throw new Error('Failed to fetch worksheet');
  }

  const problemIds = worksheet.selected_problem_ids as string[];

  // Detect subject from first problem ID
  const subject = problemIds.length > 0 ? getSubjectFromProblemId(problemIds[0]) : null;
  const tagType = subject ? getTagType(subject) : null;

  // Fetch problems from problem_tags and accuracy_rate
  const BATCH_SIZE = 50;
  const allProblems: ProblemMetadata[] = [];

  for (let i = 0; i < problemIds.length; i += BATCH_SIZE) {
    const batch = problemIds.slice(i, i + BATCH_SIZE);

    // Fetch problem tags - don't filter by type since worksheets can have mixed subjects
    const { data: tagsData, error: tagsError } = await supabase
      .from('problem_tags')
      .select('problem_id, tag_ids, tag_labels')
      .in('problem_id', batch);

    if (tagsError) {
      console.error('Error fetching problem tags:', tagsError);
      throw new Error('Failed to fetch problems');
    }

    // Fetch accuracy data
    const { data: accuracyData, error: accuracyError } = await supabase
      .from('accuracy_rate')
      .select('problem_id, difficulty, accuracy_rate, correct_answer, score')
      .in('problem_id', batch);

    if (accuracyError) {
      console.error('Error fetching problem accuracy:', accuracyError);
      throw new Error('Failed to fetch problem data');
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
        tags: [parsed.subject, ...tagItem.tag_labels],
        related_subjects: [parsed.subject],
        correct_rate: accuracyInfo?.accuracy_rate,
        exam_year: parseInt(parsed.year),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
  }

  // Preserve original order from selected_problem_ids
  // For missing problems, create a placeholder with isMissing flag
  const problemMap = new Map(allProblems.map(p => [p.id, p]));
  const sortedProblems = problemIds
    .map(id => {
      const problem = problemMap.get(id);
      if (problem) {
        return problem;
      }
      // Create placeholder for missing problem
      const parsed = parseProblemId(id);
      return {
        id,
        problem_filename: '',
        answer_filename: '',
        chapter_id: null,
        difficulty: '-',
        problem_type: parsed ? `${parsed.exam_type} ${parsed.year}년 ${parseInt(parsed.month)}월` : '-',
        tags: parsed ? [parsed.subject] : [],
        related_subjects: parsed ? [parsed.subject] : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isMissing: true
      } as ProblemMetadata;
    });

  return {
    worksheet: {
      id: worksheet.id,
      title: worksheet.title,
      author: worksheet.author,
      filters: worksheet.filters,
      created_at: worksheet.created_at,
      selected_problem_ids: worksheet.selected_problem_ids,
      is_public: worksheet.is_public || false,
      sorting: worksheet.sorting || []
    },
    problems: sortedProblems
  };
}

/**
 * Parse problem ID to extract metadata
 * Format: {subject}_고3_2024_03_학평_1_문제
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
 * Detect if problem IDs are from tagged subjects
 * Tagged problems have format: {subject}_고3_2024_03_학평_1_문제
 */
export function isTaggedWorksheet(problemIds: string[]): boolean {
  if (problemIds.length === 0) return false;

  // Check first problem ID - if it starts with any tagged subject prefix
  return TAGGED_SUBJECT_PREFIXES.some(prefix => problemIds[0].startsWith(prefix));
}


interface UpdateTaggedWorksheetParams {
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
  problems: ProblemMetadata[];
  sorting?: SortRule[];
}

/**
 * Update an existing tagged worksheet
 */
export async function updateTaggedWorksheet(
  supabase: SupabaseClient,
  id: string,
  params: UpdateTaggedWorksheetParams
): Promise<void> {
  const { title, author, filters, problems, sorting } = params;

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
      filters: filters,
      sorting: sorting || []
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating tagged worksheet:', error);
    throw new Error('Failed to update worksheet');
  }
}

