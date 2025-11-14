import { SupabaseClient } from '@supabase/supabase-js';
import type { ChapterTreeItem, EconomyProblem } from '@/lib/types';

interface MTTagRow {
  tag_ids: string[];
  tag_labels: string[];
}

interface EconomyFilters {
  selectedChapterIds: string[];
  selectedGrades: string[];
  selectedYears: number[];
  selectedMonths: string[];
  selectedExamTypes: string[];
  selectedDifficulties: string[];
  correctRateRange: [number, number];
}

/**
 * Fetch MT chapter tags and build a hierarchical tree structure
 */
export async function fetchMTChapterTree(supabase: SupabaseClient): Promise<ChapterTreeItem[]> {
  try {
    // Fetch all distinct MT_단원_태그 entries
    const { data, error } = await supabase
      .from('problem_tags')
      .select('tag_ids, tag_labels')
      .eq('type', 'MT_단원_태그');

    if (error) {
      console.error('Error fetching MT tags:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Build tree from tag paths
    return buildTreeFromTags(data as MTTagRow[]);
  } catch (error) {
    console.error('Error in fetchMTChapterTree:', error);
    throw error;
  }
}

/**
 * Build a tree structure from flat tag paths
 * Each tag row represents a path from root to leaf
 */
function buildTreeFromTags(tags: MTTagRow[]): ChapterTreeItem[] {
  const nodeMap = new Map<string, ChapterTreeItem>();
  const roots: ChapterTreeItem[] = [];

  // Process each tag path
  tags.forEach(({ tag_ids, tag_labels }) => {
    // Iterate through each level in the path
    for (let i = 0; i < tag_ids.length; i++) {
      const id = tag_ids[i];
      const label = tag_labels[i];

      // Skip if node already exists
      if (nodeMap.has(id)) {
        continue;
      }

      // Create new node
      const node: ChapterTreeItem = {
        id,
        label,
        type: 'category',
        expanded: false,
        children: []
      };

      nodeMap.set(id, node);

      // Determine parent and add to tree
      if (i === 0) {
        // Root level
        if (!roots.some(r => r.id === id)) {
          roots.push(node);
        }
      } else {
        // Child level - add to parent
        const parentId = tag_ids[i - 1];
        const parent = nodeMap.get(parentId);
        if (parent && !parent.children?.some(c => c.id === id)) {
          parent.children?.push(node);
        }
      }
    }
  });

  // Sort children at each level using natural/numeric ordering
  const sortTree = (nodes: ChapterTreeItem[]): ChapterTreeItem[] => {
    return nodes
      .sort((a, b) => {
        // Extract numeric parts from IDs like "경제-1", "경제-10", "경제-1-1"
        const extractNumbers = (id: string): number[] => {
          // Split by '-' and filter out non-numeric parts
          return id
            .split('-')
            .map(part => parseInt(part, 10))
            .filter(num => !isNaN(num));
        };

        const numsA = extractNumbers(a.id);
        const numsB = extractNumbers(b.id);

        // Compare each numeric level
        for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
          const numA = numsA[i] || 0;
          const numB = numsB[i] || 0;

          if (numA !== numB) {
            return numA - numB;
          }
        }

        // If all numbers are equal, fallback to string comparison
        return a.id.localeCompare(b.id);
      })
      .map(node => ({
        ...node,
        children: node.children && node.children.length > 0
          ? sortTree(node.children)
          : []
      }));
  };

  return sortTree(roots);
}

/**
 * Parse problem_id to extract metadata
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
    // Remove _문제 or _해설 suffix if present
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
 * Fetch economy problems with filters
 * Only fetches problems with type = 'MT_단원_태그'
 */
export async function fetchEconomyProblems(
  supabase: SupabaseClient,
  filters: EconomyFilters
): Promise<EconomyProblem[]> {
  try {
    const {
      selectedChapterIds,
      selectedGrades,
      selectedYears,
      selectedMonths,
      selectedExamTypes,
      selectedDifficulties,
      correctRateRange
    } = filters;

    // If no chapters selected, return empty result immediately
    if (selectedChapterIds.length === 0) {
      console.log('[Economy Debug] No chapters selected, returning empty result');
      return [];
    }

    // Fetch problem_tags
    let tagsQuery = supabase
      .from('problem_tags')
      .select('problem_id, tag_ids, tag_labels')
      .eq('type', 'MT_단원_태그');

    // Filter by selected chapters (tag_ids overlap)
    tagsQuery = tagsQuery.overlaps('tag_ids', selectedChapterIds);

    const { data: tagsData, error: tagsError } = await tagsQuery;

    if (tagsError) {
      console.error('Error fetching problem tags:', tagsError);
      console.error('Error details:', JSON.stringify(tagsError, null, 2));
      throw tagsError;
    }

    console.log(`[Economy Debug] Fetched ${tagsData?.length || 0} problems with MT_단원_태그`);

    if (!tagsData || tagsData.length === 0) {
      return [];
    }

    // Fetch accuracy_rate data for all problem_ids
    // Batch requests to avoid URL length limits
    const problemIds = tagsData.map(item => item.problem_id);
    const BATCH_SIZE = 50; // Fetch 50 problems at a time to avoid URL length issues
    const batches: string[][] = [];

    for (let i = 0; i < problemIds.length; i += BATCH_SIZE) {
      batches.push(problemIds.slice(i, i + BATCH_SIZE));
    }

    // Fetch all batches in parallel
    const batchResults = await Promise.all(
      batches.map(batch =>
        supabase
          .from('accuracy_rate')
          .select('problem_id, difficulty, accuracy_rate, correct_answer, score')
          .in('problem_id', batch)
      )
    );

    // Check for errors and combine results
    interface AccuracyData {
      problem_id: string;
      difficulty: string | null;
      accuracy_rate: number | null;
      correct_answer: string | null;
      score: number | null;
    }
    const allAccuracyData: AccuracyData[] = [];
    batchResults.forEach((result, index) => {
      if (result.error) {
        console.error(`Error fetching accuracy data for batch ${index}:`, result.error);
        console.error('Error details:', JSON.stringify(result.error, null, 2));
      } else if (result.data) {
        allAccuracyData.push(...result.data);
      }
    });

    // Create a map of problem_id to accuracy data
    const accuracyMap = new Map();
    allAccuracyData.forEach(item => {
      accuracyMap.set(item.problem_id, item);
    });

    // Merge the data
    const data = tagsData.map(tagItem => ({
      ...tagItem,
      accuracy_rate: accuracyMap.get(tagItem.problem_id) || null
    }));

    // Parse and filter client-side
    interface DataItem {
      problem_id: string;
      tag_labels: string[];
      tag_ids: string[];
      accuracy_rate: AccuracyData | null;
    }
    const problems: EconomyProblem[] = data
      .map((item: DataItem) => {
        const parsed = parseProblemId(item.problem_id);
        if (!parsed) {
          console.warn(`[Economy Debug] Failed to parse problem_id: ${item.problem_id}`);
          return null;
        }

        const accuracyData = item.accuracy_rate;

        return {
          problem_id: item.problem_id,
          tag_ids: item.tag_ids,
          tag_labels: item.tag_labels,
          difficulty: accuracyData?.difficulty,
          accuracy_rate: accuracyData?.accuracy_rate,
          correct_answer: accuracyData?.correct_answer,
          score: accuracyData?.score,
          ...parsed
        } as EconomyProblem;
      })
      .filter((item): item is EconomyProblem => item !== null) as EconomyProblem[];

    console.log(`[Economy Debug] After parsing: ${problems.length} problems`);

    const filteredProblems = problems
      .filter((item) => {
        // Only include problems with accuracy_rate data
        if (item.accuracy_rate === undefined) {
          return false;
        }

        // Filter by grade
        if (selectedGrades.length > 0 && !selectedGrades.includes(item.grade)) {
          return false;
        }

        // Filter by year
        if (selectedYears.length > 0 && !selectedYears.includes(parseInt(item.year, 10))) {
          return false;
        }

        // Filter by month
        if (selectedMonths.length > 0 && !selectedMonths.includes(item.month)) {
          return false;
        }

        // Filter by exam type
        if (selectedExamTypes.length > 0 && !selectedExamTypes.includes(item.exam_type)) {
          return false;
        }

        // Filter by difficulty
        // When all difficulties are selected, include all problems regardless of specific difficulty value
        // This handles non-standard difficulty values like '중상', '중하', '최상'
        if (selectedDifficulties.length > 0 && selectedDifficulties.length < 3 && item.difficulty) {
          // Map non-standard difficulty values to standard ones for filtering
          const difficultyMatches = (difficulty: string, selectedDiffs: string[]): boolean => {
            // Exact match
            if (selectedDiffs.includes(difficulty)) return true;

            // Map non-standard difficulties
            if (difficulty === '중상' && (selectedDiffs.includes('중') || selectedDiffs.includes('상'))) return true;
            if (difficulty === '중하' && (selectedDiffs.includes('중') || selectedDiffs.includes('하'))) return true;
            if (difficulty === '최상' && selectedDiffs.includes('상')) return true;

            return false;
          };

          if (!difficultyMatches(item.difficulty, selectedDifficulties)) {
            return false;
          }
        }

        // Filter by accuracy rate
        if (item.accuracy_rate !== undefined) {
          const [minRate, maxRate] = correctRateRange;
          if (item.accuracy_rate < minRate || item.accuracy_rate > maxRate) {
            return false;
          }
        }

        return true;
      });

    // Count filtered out by each criteria
    const gradeFiltered = problems.filter(p => selectedGrades.length > 0 && !selectedGrades.includes(p.grade));
    const yearFiltered = problems.filter(p => selectedYears.length > 0 && !selectedYears.includes(parseInt(p.year, 10)));
    const monthFiltered = problems.filter(p => selectedMonths.length > 0 && !selectedMonths.includes(p.month));
    const examTypeFiltered = problems.filter(p => selectedExamTypes.length > 0 && !selectedExamTypes.includes(p.exam_type));
    const difficultyFiltered = problems.filter(p => selectedDifficulties.length > 0 && p.difficulty && !selectedDifficulties.includes(p.difficulty));

    console.log(`[Economy Debug] Filtered out counts:`, {
      byGrade: gradeFiltered.length,
      byYear: yearFiltered.length,
      byMonth: monthFiltered.length,
      byExamType: examTypeFiltered.length,
      byDifficulty: difficultyFiltered.length
    });

    console.log(`[Economy Debug] After filtering: ${filteredProblems.length} problems`);
    console.log(`[Economy Debug] Filters applied:`, {
      selectedChapterIds: selectedChapterIds.length,
      selectedGrades,
      selectedYears,
      selectedMonths,
      selectedExamTypes,
      selectedDifficulties,
      correctRateRange
    });

    return filteredProblems;
  } catch (error) {
    console.error('Error in fetchEconomyProblems:', error);
    throw error;
  }
}
