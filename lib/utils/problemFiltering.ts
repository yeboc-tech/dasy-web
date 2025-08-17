import type { ProblemMetadata } from '@/lib/types/problems';
import type { ChapterTreeItem } from '@/lib/types';

interface FilterOptions {
  selectedChapters: string[];
  selectedDifficulties: string[];
  selectedProblemTypes: string[];
  selectedSubjects: string[];
  problemCount: number;
  contentTree: ChapterTreeItem[];
}

export class ProblemFilter {
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

    // Filter by selected difficulties
    if (filters.selectedDifficulties.length > 0) {
      filtered = filtered.filter(problem => 
        filters.selectedDifficulties.includes(problem.difficulty)
      );
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

    // Limit by problem count
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
