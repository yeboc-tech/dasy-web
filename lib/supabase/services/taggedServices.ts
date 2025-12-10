import { SupabaseClient } from '@supabase/supabase-js';
import type { ChapterTreeItem, TaggedProblem } from '@/lib/types';

interface TagRow {
  tag_ids: string[];
  tag_labels: string[];
}

interface TaggedFilters {
  selectedChapterIds: string[];
  selectedGrades: string[];
  selectedYears: number[];
  selectedMonths: string[];
  selectedExamTypes: string[];
  selectedDifficulties: string[];
  correctRateRange: [number, number];
}

/**
 * Get the tag type for a given subject
 * e.g., '경제' -> '단원_사회탐구_경제'
 */
function getTagType(subject: string): string {
  return `단원_사회탐구_${subject}`;
}

/**
 * Fetch chapter tags for a subject and build a hierarchical tree structure
 * The subject itself is used as the top-level wrapper (similar to 통합사회 2)
 */
export async function fetchTaggedChapterTree(
  supabase: SupabaseClient,
  subject: string
): Promise<ChapterTreeItem[]> {
  try {
    const tagType = getTagType(subject);

    // Fetch all distinct tag entries for this subject
    const { data, error } = await supabase
      .from('problem_tags')
      .select('tag_ids, tag_labels')
      .eq('type', tagType);

    if (error) {
      console.error(`Error fetching ${subject} tags:`, error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Build tree from tag paths
    const chapters = buildTreeFromTags(data as TagRow[]);

    // Wrap with subject as the top-level parent (similar to 통합사회 2)
    const subjectWrapper: ChapterTreeItem = {
      id: subject, // Use subject name as ID (e.g., '경제', '사회문화')
      label: subject,
      type: 'category',
      expanded: true, // Start expanded so children are visible
      children: chapters
    };

    return [subjectWrapper];
  } catch (error) {
    console.error(`Error in fetchTaggedChapterTree for ${subject}:`, error);
    throw error;
  }
}

/**
 * Build a tree structure from flat tag paths
 * Each tag row represents a path from root to leaf
 */
function buildTreeFromTags(tags: TagRow[]): ChapterTreeItem[] {
  const nodeMap = new Map<string, ChapterTreeItem>();
  const roots: ChapterTreeItem[] = [];

  // Process each tag path
  tags.forEach(({ tag_ids, tag_labels }) => {
    // Filter out subject prefix tags (e.g., "사회탐구_사회문화") that some records have
    // These are inconsistent and cause duplicate parent nodes
    let filteredIds = tag_ids;
    let filteredLabels = tag_labels;
    if (tag_ids[0]?.startsWith('사회탐구_')) {
      filteredIds = tag_ids.slice(1);
      filteredLabels = tag_labels.slice(1);
    }

    // Iterate through each level in the path
    for (let i = 0; i < filteredIds.length; i++) {
      const id = filteredIds[i];
      const label = filteredLabels[i];

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
        const parentId = filteredIds[i - 1];
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
 * Fetch tagged problems with filters for a specific subject
 */
export async function fetchTaggedProblems(
  supabase: SupabaseClient,
  subject: string,
  filters: TaggedFilters
): Promise<TaggedProblem[]> {
  try {
    const tagType = getTagType(subject);

    const {
      selectedChapterIds,
      selectedGrades,
      selectedYears,
      selectedMonths,
      selectedExamTypes,
      selectedDifficulties,
      correctRateRange
    } = filters;

    // Safety checks - ensure all arrays are defined
    const safeGrades = selectedGrades || [];
    const safeYears = selectedYears || [];
    const safeMonths = selectedMonths || [];
    const safeExamTypes = selectedExamTypes || [];
    const safeDifficulties = selectedDifficulties || [];
    const safeChapterIds = selectedChapterIds || [];

    // If no chapters selected, return empty result immediately
    if (safeChapterIds.length === 0) {
      return [];
    }

    // Check if the subject itself is selected (top-level wrapper)
    // If so, fetch all problems for this subject without chapter filter
    const isSubjectSelected = safeChapterIds.includes(subject);

    // Fetch problem_tags
    let tagsQuery = supabase
      .from('problem_tags')
      .select('problem_id, tag_ids, tag_labels')
      .eq('type', tagType);

    // Filter by selected chapters (tag_ids overlap) - only if subject itself is not selected
    if (!isSubjectSelected) {
      tagsQuery = tagsQuery.overlaps('tag_ids', safeChapterIds);
    }

    const { data: tagsData, error: tagsError } = await tagsQuery;

    if (tagsError) {
      console.error('Error fetching problem tags:', tagsError);
      throw tagsError;
    }

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
    batchResults.forEach((result) => {
      if (result.error) {
        console.error('Error fetching accuracy data:', result.error);
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
    const problems: TaggedProblem[] = data
      .map((item: DataItem) => {
        const parsed = parseProblemId(item.problem_id);
        if (!parsed) {
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
        } as TaggedProblem;
      })
      .filter((item): item is TaggedProblem => item !== null) as TaggedProblem[];

    const filteredProblems = problems
      .filter((item) => {
        // Only include problems with accuracy_rate data
        if (item.accuracy_rate === undefined) {
          return false;
        }

        // Filter by grade
        if (safeGrades.length > 0 && !safeGrades.includes(item.grade)) {
          return false;
        }

        // Filter by year
        if (safeYears.length > 0 && !safeYears.includes(parseInt(item.year, 10))) {
          return false;
        }

        // Filter by month
        if (safeMonths.length > 0 && !safeMonths.includes(item.month)) {
          return false;
        }

        // Filter by exam type
        if (safeExamTypes.length > 0 && !safeExamTypes.includes(item.exam_type)) {
          return false;
        }

        // Filter by difficulty
        // When all difficulties are selected, include all problems regardless of specific difficulty value
        // This handles non-standard difficulty values like '중상', '중하', '최상'
        if (safeDifficulties.length > 0 && safeDifficulties.length < 3 && item.difficulty) {
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

          if (!difficultyMatches(item.difficulty, safeDifficulties)) {
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

    return filteredProblems;
  } catch (error) {
    console.error(`Error in fetchTaggedProblems for ${subject}:`, error);
    throw error;
  }
}
