'use client';

import { createClient } from '@/lib/supabase/client';
import { fetchChapters, fetchSubjects, fetchChapterTree, type Chapter, type Subject, type ChapterTreeItem } from './services';

/**
 * Client-side function to fetch all chapters
 */
export async function getChapters(): Promise<Chapter[]> {
  const supabase = createClient();
  return fetchChapters(supabase);
}

/**
 * Client-side function to fetch all subjects
 */
export async function getSubjects(): Promise<Subject[]> {
  const supabase = createClient();
  return fetchSubjects(supabase);
}

/**
 * Client-side function to fetch the complete chapter tree
 */
export async function getChapterTree(): Promise<ChapterTreeItem[]> {
  const supabase = createClient();
  return fetchChapterTree(supabase);
}

/**
 * Client-side function to fetch chapters by subject
 */
export async function getChaptersBySubject(subjectName: string): Promise<Chapter[]> {
  const supabase = createClient();
  
  // First get the subject ID
  const { data: subject, error: subjectError } = await supabase
    .from('subjects')
    .select('id')
    .eq('name', subjectName)
    .single();

  if (subjectError || !subject) {
    throw new Error(`Subject not found: ${subjectName}`);
  }

  // Then get chapters for that subject
  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, name, chapter_number, parent_id, subject_id')
    .eq('subject_id', subject.id)
    .order('chapter_number');

  if (chaptersError) {
    throw new Error(`Error fetching chapters for subject ${subjectName}: ${chaptersError.message}`);
  }

  return chapters || [];
}
