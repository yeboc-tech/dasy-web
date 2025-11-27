'use client';

import { createClient } from '@/lib/supabase/client';
import { fetchChapters, fetchSubjects, fetchChapterTree } from './services';
import { fetchMTChapterTree, fetchEconomyProblems } from './economyServices';
import type { Chapter, Subject, ChapterTreeItem, EconomyProblem } from '@/lib/types';

const CDN_BASE_URL = 'https://cdn.y3c.kr/tongkidari/edited-contents';

/**
 * Get CDN URL for edited content
 */
export function getEditedContentUrl(resourceId: string): string {
  return `${CDN_BASE_URL}/${encodeURIComponent(resourceId)}.png`;
}

/**
 * Fetch edited content IDs for multiple resource IDs with batching and retry logic
 * Uses RPC function to get IDs that have edited content, then returns CDN URLs
 * @throws Error when all retry attempts fail - caller should handle and show error to user
 * @returns Map of resource_id -> CDN URL string (empty Map is valid when no content is edited)
 */
export async function getEditedContents(resourceIds: string[]): Promise<Map<string, string>> {
  if (resourceIds.length === 0) return new Map();

  const BATCH_SIZE = 100;
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [0, 1000, 2000]; // 0ms, 1s, 2s

  console.log(`[Edited Content] Fetching edited content for ${resourceIds.length} resources...`);
  console.log(`[Edited Content] Sample IDs:`, resourceIds.slice(0, 3));

  // Split into batches for RPC call
  const batches: string[][] = [];
  for (let i = 0; i < resourceIds.length; i += BATCH_SIZE) {
    batches.push(resourceIds.slice(i, i + BATCH_SIZE));
  }

  console.log(`[Edited Content] Split into ${batches.length} batches of max ${BATCH_SIZE} IDs each`);

  // Get all resource IDs that have edited content (without base64)
  const editedResourceIds: string[] = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchNum = batchIndex + 1;

    console.log(`[Edited Content] Checking batch ${batchNum}/${batches.length} (${batch.length} IDs)...`);

    // Retry logic for this batch
    let batchSuccess = false;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = RETRY_DELAYS[attempt];
          console.log(`[Edited Content] ⏳ Batch ${batchNum} retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const supabase = createClient();
        const { data, error } = await supabase
          .rpc('fetch_edited_contents_without_base64_by_ids', {
            p_resource_ids: batch
          });

        if (error) {
          console.error(`[Edited Content] ❌ Batch ${batchNum} RPC error (attempt ${attempt + 1}/${MAX_RETRIES}):`, error);
          console.error('[Edited Content] Error details:', {
            message: error.message,
            code: error.code,
            hint: error.hint,
            details: error.details
          });

          // If this was the last attempt, throw
          if (attempt === MAX_RETRIES - 1) {
            throw new Error(`Batch ${batchNum}/${batches.length} failed after ${MAX_RETRIES} attempts: ${error.message} (code: ${error.code})`);
          }

          // Otherwise continue to next retry
          continue;
        }

        // Success! Collect resource IDs that have edited content
        (data || []).forEach((item: { resource_id: string }) => {
          if (item.resource_id) {
            editedResourceIds.push(item.resource_id);
          }
        });

        console.log(`[Edited Content] ✅ Batch ${batchNum}/${batches.length} completed: ${data?.length || 0} edited items found`);
        batchSuccess = true;
        break; // Exit retry loop on success

      } catch (error) {
        // Network exception or other error
        console.error(`[Edited Content] ❌ Batch ${batchNum} exception (attempt ${attempt + 1}/${MAX_RETRIES}):`,
          error instanceof Error ? error.message : String(error));

        // If this was the last attempt, throw
        if (attempt === MAX_RETRIES - 1) {
          throw new Error(`Batch ${batchNum}/${batches.length} failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Otherwise continue to next retry
      }
    }

    if (!batchSuccess) {
      // This should never happen due to throw above, but just in case
      throw new Error(`Batch ${batchNum}/${batches.length} failed after all retries`);
    }
  }

  console.log(`[Edited Content] ✅ RPC completed: ${editedResourceIds.length} resources have edited content`);

  if (editedResourceIds.length === 0) {
    console.log(`[Edited Content] ℹ️ No edited content found (this is OK if no problems have been edited)`);
    return new Map();
  }

  // Build map of resource_id -> CDN URL
  const allResults = new Map<string, string>();
  editedResourceIds.forEach((resourceId) => {
    allResults.set(resourceId, getEditedContentUrl(resourceId));
  });

  console.log(`[Edited Content] ✅ Generated ${allResults.size} CDN URLs`);
  console.log(`[Edited Content] Sample URLs:`, Array.from(allResults.values()).slice(0, 2));

  return allResults;
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
