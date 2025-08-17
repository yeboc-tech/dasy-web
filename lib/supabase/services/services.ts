import { SupabaseClient } from '@supabase/supabase-js';
import type { Chapter, Subject, ChapterTreeItem } from '@/lib/types';

/**
 * Convert number to Roman numeral
 */
function toRomanNumeral(num: number): string {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return romanNumerals[num - 1] || num.toString();
}

/**
 * Format chapter number to "01", "02" format
 */
function formatChapterNumber(num: number): string {
  return num.toString().padStart(2, '0');
}

/**
 * Fetch all chapters from the database
 */
export async function fetchChapters(supabase: SupabaseClient): Promise<Chapter[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select('id, name, chapter_number, parent_id, subject_id')
    .order('chapter_number');

  if (error) {
    throw new Error(`Error fetching chapters: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch all subjects from the database
 */
export async function fetchSubjects(supabase: SupabaseClient): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name')
    .order('name');

  if (error) {
    throw new Error(`Error fetching subjects: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch chapters and subjects, then build the tree structure
 */
export async function fetchChapterTree(supabase: SupabaseClient): Promise<ChapterTreeItem[]> {
  const [chapters, subjects] = await Promise.all([
    fetchChapters(supabase),
    fetchSubjects(supabase)
  ]);

  // Create a map of subjects
  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  
  // Group chapters by subject
  const chaptersBySubject = new Map<string, Chapter[]>();
  
  chapters.forEach(chapter => {
    if (!chaptersBySubject.has(chapter.subject_id)) {
      chaptersBySubject.set(chapter.subject_id, []);
    }
    chaptersBySubject.get(chapter.subject_id)!.push(chapter);
  });

  // Build the tree structure
  const tree: ChapterTreeItem[] = [];

  for (const [subjectId, subjectChapters] of chaptersBySubject) {
    const subject = subjectMap.get(subjectId);
    if (!subject) continue;

    // Get main units (chapters without parent_id)
    const mainUnits = subjectChapters.filter(ch => ch.parent_id === null);
    
    const subjectTree: ChapterTreeItem = {
      id: subject.id, // Use actual database ID
      label: subject.name, // Use actual database name
      type: 'category',
      expanded: true,
      children: []
    };

    // Process each main unit
    for (const mainUnit of mainUnits) {
      const subChapters = subjectChapters.filter(ch => ch.parent_id === mainUnit.id);
      
      // Format main unit label with Roman numeral
      const mainUnitLabel = `${toRomanNumeral(mainUnit.chapter_number)}. ${mainUnit.name}`;
      
      const mainUnitTree: ChapterTreeItem = {
        id: mainUnit.id, // Use actual database ID
        label: mainUnitLabel, // Format with Roman numeral
        type: 'category',
        expanded: true,
        children: subChapters.map(subChapter => {
          // Format sub-chapter label with "01", "02" format
          const subChapterLabel = `${formatChapterNumber(subChapter.chapter_number)}. ${subChapter.name}`;
          return {
            id: subChapter.id, // Use actual database ID
            label: subChapterLabel, // Format with "01", "02"
            type: 'item' as const,
            expanded: false
          };
        })
      };

      subjectTree.children!.push(mainUnitTree);
    }

    tree.push(subjectTree);
  }

  return tree;
}
