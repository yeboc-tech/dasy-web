import type { ProblemMetadata } from '@/lib/types/problems';
import type { ChapterTreeItem } from '@/lib/types';

interface FilterOptions {
  selectedChapters: string[];
  selectedDifficulties: string[];
  selectedProblemTypes: string[];
  selectedSubjects: string[];
  problemCount: number;
  contentTree: ChapterTreeItem[];
  correctRateRange: [number, number]; // [min, max] correct rate percentage (0-100)
  selectedYears: number[]; // Selected exam years for filtering
}

export class ProblemFilter {
  // Removed seeded random function - using truly random selection

  /**
   * Get difficulty level based on correct rate
   * 상: 0-39%, 중: 40-59%, 하: 60-100%
   */
  private static getDifficultyFromCorrectRate(problem: ProblemMetadata): string {
    const correctRate = problem.correct_rate ?? 50;

    if (correctRate <= 39) return '상';
    if (correctRate <= 59) return '중';
    return '하';
  }

  private static getDifficultyWeight(difficulty: string): number {
    switch (difficulty) {
      case '하': return 1;
      case '중': return 3;
      case '상': return 5;
      default: return 3; // Default to middle difficulty
    }
  }

  /**
   * Build a map of chapter_id to its hierarchical path indices
   * e.g., { 'chapter-id-1': [0, 2, 1] } means: root[0] -> children[2] -> children[1]
   */
  private static buildChapterPathMap(contentTree: ChapterTreeItem[]): Map<string, number[]> {
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
   * Compare two chapter paths for sorting
   * Returns: -1 if a < b, 1 if a > b, 0 if equal
   */
  private static compareChapterPaths(pathA: number[], pathB: number[]): number {
    const minLength = Math.min(pathA.length, pathB.length);

    for (let i = 0; i < minLength; i++) {
      if (pathA[i] !== pathB[i]) {
        return pathA[i] - pathB[i];
      }
    }

    // If all common levels are equal, shorter path comes first
    return pathA.length - pathB.length;
  }

  static filterProblems(problems: ProblemMetadata[], filters: FilterOptions): ProblemMetadata[] {
    let filtered = [...problems];

    // Filter by selected chapters - ONLY show problems for selected chapters
    if (filters.selectedChapters.length > 0) {
      const selectedChapterIds = this.getSelectedChapterIds(filters.contentTree, filters.selectedChapters);

      if (selectedChapterIds.length > 0) {
        filtered = filtered.filter(problem =>
          problem.chapter_id && selectedChapterIds.includes(problem.chapter_id)
        );
      } else {
        // No valid chapters found, return empty
        filtered = [];
      }
    } else {
      // No chapters selected, return empty
      filtered = [];
    }

    // Filter by selected difficulties (using correct rate based difficulty)
    if (filters.selectedDifficulties.length > 0) {
      filtered = filtered.filter(problem => {
        const calculatedDifficulty = this.getDifficultyFromCorrectRate(problem);
        return filters.selectedDifficulties.includes(calculatedDifficulty);
      });
    }

    // Filter by selected problem types
    if (filters.selectedProblemTypes.length > 0) {
      filtered = filtered.filter(problem =>
        filters.selectedProblemTypes.includes(problem.problem_type)
      );
    }

    // Filter by selected subjects (using related_subjects)
    if (filters.selectedSubjects.length > 0) {
      filtered = filtered.filter(problem =>
        problem.related_subjects.some(subject =>
          filters.selectedSubjects.includes(subject)
        )
      );
    }

    // Filter by correct rate range
    if (filters.correctRateRange) {
      const [minRate, maxRate] = filters.correctRateRange;
      filtered = filtered.filter(problem => {
        const rate = problem.correct_rate ?? 0;
        return rate >= minRate && rate <= maxRate;
      });
    }

    // Filter by selected exam years
    // Only filter by years if not all years are selected
    const allYears = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    const allYearsSelected = filters.selectedYears.length === allYears.length &&
                            allYears.every(year => filters.selectedYears.includes(year));

    if (filters.selectedYears.length > 0 && !allYearsSelected) {
      filtered = filtered.filter(problem =>
        problem.exam_year && filters.selectedYears.includes(problem.exam_year)
      );
    }
    // When all years are selected, include problems with null exam_year (no filtering)

    // Randomly select problems if count is specified and positive
    if (filters.problemCount > 0 && filtered.length > filters.problemCount) {
      // Shuffle array using Fisher-Yates algorithm with TRUE randomization
      const shuffled = [...filtered];

      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      filtered = shuffled.slice(0, filters.problemCount);
    }

    // Build chapter path map for hierarchical sorting
    const chapterPathMap = this.buildChapterPathMap(filters.contentTree);

    // Sort hierarchically: root chapter -> sub-chapters -> correct rate
    filtered.sort((a, b) => {
      // Get chapter paths
      const pathA = a.chapter_id ? chapterPathMap.get(a.chapter_id) : undefined;
      const pathB = b.chapter_id ? chapterPathMap.get(b.chapter_id) : undefined;

      // If one problem has no chapter path, put it at the end
      if (!pathA && !pathB) return 0;
      if (!pathA) return 1;
      if (!pathB) return -1;

      // Compare chapter hierarchy first
      const chapterComparison = this.compareChapterPaths(pathA, pathB);
      if (chapterComparison !== 0) {
        return chapterComparison;
      }

      // If in same chapter, sort by correct rate descending (highest first = easiest first)
      const aCorrectRate = a.correct_rate ?? 0;
      const bCorrectRate = b.correct_rate ?? 0;
      return bCorrectRate - aCorrectRate;
    });

    return filtered;
  }

  private static getSelectedChapterIds(contentTree: ChapterTreeItem[], selectedChapters: string[]): string[] {
    const chapterIds: string[] = [];
    
    const traverse = (items: ChapterTreeItem[]) => {
      items.forEach(item => {
        if (selectedChapters.includes(item.id)) {
          chapterIds.push(item.id);
        }
        if (item.children) {
          traverse(item.children);
        }
      });
    };
    
    traverse(contentTree);
    return chapterIds;
  }
}
