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
}

export class ProblemFilter {
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

    // Filter by selected subjects (using tags)
    if (filters.selectedSubjects.length > 0) {
      filtered = filtered.filter(problem => 
        problem.tags.some(tag => 
          filters.selectedSubjects.includes(tag)
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

    // Sort by correct rate (highest first = easiest problems first)
    filtered.sort((a, b) => {
      const aCorrectRate = a.correct_rate ?? 0;
      const bCorrectRate = b.correct_rate ?? 0;
      
      // Sort by correct rate descending (highest correct rate first)
      return bCorrectRate - aCorrectRate;
    });

    // Limit by problem count (skip limit if -1 = show all)
    if (filters.problemCount > 0) {
      filtered = filtered.slice(0, filters.problemCount);
    }

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
