import type { ProblemMetadata } from '@/lib/types/problems';
import type { ChapterTreeItem } from '@/lib/types/database';
import type { SortRule, SortField } from '@/lib/types/sorting';

/**
 * Fisher-Yates shuffle for random ordering (실전 mode)
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Build chapter path map from contentTree for 통합사회
 * Maps chapter_id -> path indices like [0, 2, 1]
 */
function buildChapterPathMap(contentTree: ChapterTreeItem[]): Map<string, number[]> {
  const pathMap = new Map<string, number[]>();

  const traverse = (items: ChapterTreeItem[], path: number[]) => {
    items.forEach((item, index) => {
      const currentPath = [...path, index];
      pathMap.set(item.id, currentPath);
      if (item.children && item.children.length > 0) {
        traverse(item.children, currentPath);
      }
    });
  };

  traverse(contentTree, []);
  return pathMap;
}

/**
 * Compare two path arrays lexicographically
 */
function comparePaths(pathA: number[] | undefined, pathB: number[] | undefined): number {
  if (!pathA && !pathB) return 0;
  if (!pathA) return 1;
  if (!pathB) return -1;

  const minLength = Math.min(pathA.length, pathB.length);
  for (let i = 0; i < minLength; i++) {
    if (pathA[i] !== pathB[i]) {
      return pathA[i] - pathB[i];
    }
  }
  return pathA.length - pathB.length;
}

/**
 * Parse exam year from economy problem ID
 * Format: 경제_고3_2022_06_모평_1_문제
 */
function parseEconomyExamYear(problemId: string): number {
  const match = problemId.match(/경제_고\d_(\d{4})_/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Parse problem type from economy problem ID
 * Returns: 학평, 모평, 수능
 */
function parseEconomyProblemType(problemId: string): string {
  const match = problemId.match(/경제_고\d_\d{4}_\d{2}_([^_]+)_/);
  return match ? match[1] : '';
}

/**
 * Get field value for comparison - 통합사회
 */
function getTonghapsahoeFieldValue(
  problem: ProblemMetadata,
  field: SortField,
  pathMap: Map<string, number[]>
): number | number[] | string | string[] {
  switch (field) {
    case 'chapter':
      return problem.chapter_id ? (pathMap.get(problem.chapter_id) || []) : [];
    case 'tags':
      return problem.tags || [];
    case 'correct_rate':
      return problem.correct_rate ?? 50;
    case 'exam_year':
      return problem.exam_year ?? 0;
    case 'problem_type':
      return problem.problem_type || '';
    case 'related_subjects':
      return problem.related_subjects || [];
    default:
      return 0;
  }
}

/**
 * Get field value for comparison - 경제
 */
function getEconomyFieldValue(
  problem: ProblemMetadata,
  field: SortField
): number | string[] | string {
  switch (field) {
    case 'chapter':
      // Use tags array for chapter sorting in economy mode
      return problem.tags || [];
    case 'tags':
      // For 경제, tags is same as chapter (both use tags array)
      return problem.tags || [];
    case 'correct_rate':
      return problem.correct_rate ?? 50;
    case 'exam_year':
      // Parse from problem ID if not available
      return problem.exam_year ?? parseEconomyExamYear(problem.id);
    case 'problem_type':
      // Parse from problem ID if not available
      return problem.problem_type || parseEconomyProblemType(problem.id);
    default:
      return 0;
  }
}

/**
 * Compare two economy tag arrays (chapter hierarchy)
 * Tags are like ["1 시장경제의 기본 원리", "1-1 시장과 경쟁"]
 */
function compareEconomyTags(tagsA: string[], tagsB: string[]): number {
  const minLength = Math.min(tagsA.length, tagsB.length);

  for (let i = 0; i < minLength; i++) {
    // Extract leading number for numeric comparison
    const numA = parseInt(tagsA[i].match(/^[\d-]+/)?.[0]?.replace('-', '.') || '0', 10);
    const numB = parseInt(tagsB[i].match(/^[\d-]+/)?.[0]?.replace('-', '.') || '0', 10);

    if (numA !== numB) {
      return numA - numB;
    }

    // If numbers are equal, compare full string
    const comparison = tagsA[i].localeCompare(tagsB[i]);
    if (comparison !== 0) {
      return comparison;
    }
  }

  return tagsA.length - tagsB.length;
}

/**
 * Compare two string arrays (tags)
 * For 통합사회 tags like ["태그1", "태그2"]
 */
function compareTags(tagsA: string[], tagsB: string[]): number {
  const minLength = Math.min(tagsA.length, tagsB.length);

  for (let i = 0; i < minLength; i++) {
    const comparison = tagsA[i].localeCompare(tagsB[i]);
    if (comparison !== 0) {
      return comparison;
    }
  }

  return tagsA.length - tagsB.length;
}

/**
 * Compare two values based on field type
 */
function compareValues(
  valueA: number | number[] | string | string[],
  valueB: number | number[] | string | string[],
  field: SortField,
  isEconomyMode: boolean
): number {
  // Handle chapter field specially
  if (field === 'chapter') {
    if (isEconomyMode) {
      return compareEconomyTags(valueA as string[], valueB as string[]);
    } else {
      return comparePaths(valueA as number[], valueB as number[]);
    }
  }

  // Handle tags field (string arrays)
  if (field === 'tags') {
    if (isEconomyMode) {
      // For 경제, tags uses same comparison as chapter
      return compareEconomyTags(valueA as string[], valueB as string[]);
    } else {
      // For 통합사회, use simple string array comparison
      return compareTags(valueA as string[], valueB as string[]);
    }
  }

  // Handle related_subjects field (string arrays, 통합사회 only)
  if (field === 'related_subjects') {
    return compareTags(valueA as string[], valueB as string[]);
  }

  // Handle numeric fields
  if (typeof valueA === 'number' && typeof valueB === 'number') {
    return valueA - valueB;
  }

  // Handle string fields
  if (typeof valueA === 'string' && typeof valueB === 'string') {
    return valueA.localeCompare(valueB);
  }

  return 0;
}

/**
 * Create comparator function for 통합사회 problems
 */
function createTonghapsahoeComparator(
  rules: SortRule[],
  contentTree: ChapterTreeItem[]
): (a: ProblemMetadata, b: ProblemMetadata) => number {
  const pathMap = buildChapterPathMap(contentTree);

  return (a: ProblemMetadata, b: ProblemMetadata): number => {
    for (const rule of rules) {
      const valueA = getTonghapsahoeFieldValue(a, rule.field, pathMap);
      const valueB = getTonghapsahoeFieldValue(b, rule.field, pathMap);

      let comparison = compareValues(valueA, valueB, rule.field, false);

      if (rule.direction === 'desc') {
        comparison = -comparison;
      }

      if (comparison !== 0) {
        return comparison;
      }
    }
    return 0;
  };
}

/**
 * Create comparator function for 경제 problems
 */
function createEconomyComparator(
  rules: SortRule[]
): (a: ProblemMetadata, b: ProblemMetadata) => number {
  return (a: ProblemMetadata, b: ProblemMetadata): number => {
    for (const rule of rules) {
      const valueA = getEconomyFieldValue(a, rule.field);
      const valueB = getEconomyFieldValue(b, rule.field);

      let comparison = compareValues(valueA, valueB, rule.field, true);

      if (rule.direction === 'desc') {
        comparison = -comparison;
      }

      if (comparison !== 0) {
        return comparison;
      }
    }
    return 0;
  };
}

export interface ApplySortRulesOptions {
  isEconomyMode: boolean;
  contentTree?: ChapterTreeItem[];
}

/**
 * Main sorting function - applies sort rules to problems list
 *
 * @param problems - Array of problems to sort
 * @param rules - Array of sort rules
 *   - Empty array [] = keep original order (no sorting)
 *   - [{ field: 'random' }] = shuffle (무작위 mode)
 *   - Other rules = sort by those rules
 * @param options - Mode and contentTree for 통합사회
 * @returns Sorted copy of problems array
 */
export function applySortRules(
  problems: ProblemMetadata[],
  rules: SortRule[],
  options: ApplySortRulesOptions
): ProblemMetadata[] {
  if (problems.length === 0) {
    return [];
  }

  // Empty rules = keep original order (no sorting)
  if (rules.length === 0) {
    return [...problems];
  }

  // Check for random marker (무작위 mode)
  if (rules.length === 1 && rules[0].field === 'random') {
    return shuffle(problems);
  }

  const { isEconomyMode, contentTree } = options;

  // Create appropriate comparator based on mode
  const comparator = isEconomyMode
    ? createEconomyComparator(rules)
    : createTonghapsahoeComparator(rules, contentTree || []);

  return [...problems].sort(comparator);
}

/**
 * Check if the problem list contains economy problems
 */
export function isEconomyProblemList(problems: ProblemMetadata[]): boolean {
  return problems.length > 0 && problems[0].id.startsWith('경제_');
}
