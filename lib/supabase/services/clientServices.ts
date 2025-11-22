'use client';

import { createClient } from '@/lib/supabase/client';
import { fetchChapters, fetchSubjects, fetchChapterTree } from './services';
import { fetchMTChapterTree, fetchEconomyProblems } from './economyServices';
import type { Chapter, Subject, ChapterTreeItem, EconomyProblem } from '@/lib/types';

/**
 * Fetch edited content for multiple resource IDs with batching and retry logic
 * Uses RPC function to send IDs in POST body, avoiding URL length limits
 * Automatically batches large requests to prevent timeouts
 * @throws Error when all retry attempts fail - caller should handle and show error to user
 * @returns Map of resource_id -> base64 string (empty Map is valid when no content is edited)
 */
export async function getEditedContents(resourceIds: string[]): Promise<Map<string, string>> {
  if (resourceIds.length === 0) return new Map();

  const BATCH_SIZE = 50; // Fetch 50 IDs per batch (50 × ~171KB = ~8.5MB per batch)
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [0, 1000, 2000]; // 0ms, 1s, 2s

  console.log(`[Edited Content] Fetching edited content for ${resourceIds.length} resources...`);
  console.log(`[Edited Content] Sample IDs:`, resourceIds.slice(0, 3));

  // Split into batches
  const batches: string[][] = [];
  for (let i = 0; i < resourceIds.length; i += BATCH_SIZE) {
    batches.push(resourceIds.slice(i, i + BATCH_SIZE));
  }

  console.log(`[Edited Content] Split into ${batches.length} batches of max ${BATCH_SIZE} IDs each`);

  // Fetch all batches with retry logic
  const allResults = new Map<string, string>();
  let successfulBatches = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchNum = batchIndex + 1;

    console.log(`[Edited Content] Fetching batch ${batchNum}/${batches.length} (${batch.length} IDs)...`);

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
          .rpc('fetch_edited_contents_by_ids', {
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

        // Success! Add to results
        (data || []).forEach((item: { resource_id: string; base64: string }) => {
          if (item.base64) {
            allResults.set(item.resource_id, item.base64);
          }
        });

        console.log(`[Edited Content] ✅ Batch ${batchNum}/${batches.length} completed: ${data?.length || 0} items`);
        successfulBatches++;
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

  console.log(`[Edited Content] ✅ All ${batches.length} batches completed successfully`);
  console.log(`[Edited Content] Total fetched: ${allResults.size} edited images from ${resourceIds.length} requested IDs`);

  if (allResults.size === 0) {
    console.log(`[Edited Content] ℹ️ No edited content found (this is OK if no problems have been edited)`);
  } else {
    console.log(`[Edited Content] Sample resource IDs:`, Array.from(allResults.keys()).slice(0, 5));
  }

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
