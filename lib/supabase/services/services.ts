import { SupabaseClient } from '@supabase/supabase-js';

export interface Chapter {
  id: string;
  name: string;
  chapter_number: number;
  parent_id: string | null;
  subject_id: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface ChapterTreeItem {
  id: string;
  label: string;
  type: 'category' | 'item';
  expanded: boolean;
  children?: ChapterTreeItem[];
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
      id: subject.name === '통합사회 1' ? '통합사회_1' : '통합사회_2',
      label: subject.name,
      type: 'category',
      expanded: true,
      children: []
    };

    // Process each main unit
    for (const mainUnit of mainUnits) {
      const subChapters = subjectChapters.filter(ch => ch.parent_id === mainUnit.id);
      
      const mainUnitTree: ChapterTreeItem = {
        id: `${subject.name === '통합사회 1' ? '통합사회_1권' : '통합사회_2권'}_${mainUnit.chapter_number}단원`,
        label: formatMainUnitName(mainUnit.chapter_number, mainUnit.name),
        type: 'category',
        expanded: true,
        children: subChapters.map(subChapter => ({
          id: `${subject.name === '통합사회 1' ? '통합사회_1권' : '통합사회_2권'}_${mainUnit.chapter_number}단원_${subChapter.chapter_number}`,
          label: formatSubChapterName(subChapter.chapter_number, subChapter.name),
          type: 'item' as const,
          expanded: false
        }))
      };

      subjectTree.children!.push(mainUnitTree);
    }

    tree.push(subjectTree);
  }

  return tree;
}

/**
 * Format main unit name with Roman numerals
 */
function formatMainUnitName(chapterNumber: number, name: string): string {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
  return `${romanNumerals[chapterNumber - 1]}. ${name}`;
}

/**
 * Format sub-chapter name with zero-padded numbers
 */
function formatSubChapterName(chapterNumber: number, name: string): string {
  return `${chapterNumber.toString().padStart(2, '0')}. ${name}`;
}
