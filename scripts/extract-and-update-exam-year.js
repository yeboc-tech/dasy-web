import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Extract year from source string
 * Examples:
 * - "2022학년도 6월 모평 10번" -> 2022
 * - "2023년 7월 학평 3번" -> 2023
 * - "2020학년도 9월 모평11번" -> 2020
 * - "(정) 2012학년도 수능 19번" -> 2012
 * - "(윤사) 2019년 10월 학평 7번" -> 2019
 */
function extractYearFromSource(source) {
  if (!source) return null;

  // Match 4-digit year, optionally after parentheses prefix like "(정) " or "(윤사) "
  const match = source.match(/^(?:\([^)]+\)\s*)?(\d{4})/);

  if (match) {
    const year = parseInt(match[1], 10);
    // Validate year is reasonable (between 2000 and current year + 1)
    if (year >= 2000 && year <= new Date().getFullYear() + 1) {
      return year;
    }
  }

  return null;
}

async function updateExamYears() {
  try {
    console.log('🔍 Fetching problems with source but missing exam_year...\n');

    // Fetch all problems with source
    const { data: problems, error: fetchError } = await supabase
      .from('problems')
      .select('id, source, exam_year')
      .not('source', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch problems: ${fetchError.message}`);
    }

    console.log(`📊 Total problems with source: ${problems.length}`);

    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const failed = [];

    for (const problem of problems) {
      const extractedYear = extractYearFromSource(problem.source);

      // Skip if we couldn't extract a year
      if (!extractedYear) {
        console.log(`⚠️  Could not extract year from: "${problem.source}"`);
        failedCount++;
        failed.push({ id: problem.id, source: problem.source });
        continue;
      }

      // Skip if exam_year already matches
      if (problem.exam_year === extractedYear) {
        skippedCount++;
        continue;
      }

      // Update the exam_year
      const { error: updateError } = await supabase
        .from('problems')
        .update({ exam_year: extractedYear })
        .eq('id', problem.id);

      if (updateError) {
        console.error(`❌ Failed to update problem ${problem.id}: ${updateError.message}`);
        failedCount++;
        failed.push({ id: problem.id, source: problem.source, error: updateError.message });
        continue;
      }

      console.log(`✅ Updated problem ${problem.id}: "${problem.source}" -> ${extractedYear}`);
      updatedCount++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Summary:');
    console.log(`   Total processed: ${problems.length}`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ⏭️  Skipped (already correct): ${skippedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log('='.repeat(60));

    if (failed.length > 0) {
      console.log('\n⚠️  Failed items:');
      failed.forEach(item => {
        console.log(`   - ID: ${item.id}, Source: "${item.source}"${item.error ? `, Error: ${item.error}` : ''}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
updateExamYears();
