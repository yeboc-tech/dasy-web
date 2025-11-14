'use client';

import { createClient } from '@/lib/supabase/client';
import { fetchChapters, fetchSubjects, fetchChapterTree } from './services';
import { fetchMTChapterTree, fetchEconomyProblems } from './economyServices';
import type { Chapter, Subject, ChapterTreeItem, EconomyProblem } from '@/lib/types';

/**
 * Fetch edited content for multiple resource IDs
 */
export async function getEditedContents(resourceIds: string[]): Promise<Map<string, string>> {
  if (resourceIds.length === 0) return new Map();

  const supabase = createClient();

  try {
    console.log(`[Edited Content] Fetching edited content for ${resourceIds.length} resources...`);

    const { data, error } = await supabase
      .from('edited_contents')
      .select('resource_id, base64')
      .in('resource_id', resourceIds);

    if (error) {
      console.warn('[Edited Content] Query error:', error.message, error.code);
      return new Map();
    }

    const editedMap = new Map<string, string>();
    (data || []).forEach(item => {
      if (item.base64) {
        editedMap.set(item.resource_id, item.base64);
      }
    });

    console.log(`[Edited Content] Successfully fetched ${editedMap.size} edited images`);
    return editedMap;
  } catch (error) {
    console.warn('[Edited Content] Exception while fetching:', error instanceof Error ? error.message : String(error));
    return new Map();
  }
}

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

/**
 * Client-side function to fetch MT chapter tree (for 경제 mode)
 */
export async function getMTChapterTree(): Promise<ChapterTreeItem[]> {
  const supabase = createClient();
  return fetchMTChapterTree(supabase);
}

/**
 * Client-side function to fetch economy problems with filters
 */
export async function getEconomyProblems(filters: {
  selectedChapterIds: string[];
  selectedGrades: string[];
  selectedYears: number[];
  selectedMonths: string[];
  selectedExamTypes: string[];
  selectedDifficulties: string[];
  correctRateRange: [number, number];
}): Promise<EconomyProblem[]> {
  const supabase = createClient();
  return fetchEconomyProblems(supabase, filters);
}
