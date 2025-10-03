import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProblemsTableStatus() {
  try {
    console.log('📊 Checking problems table status...\n');

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('problems')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to get total count: ${countError.message}`);
    }

    console.log(`Total rows: ${totalCount}\n`);
    console.log('='.repeat(70));
    console.log('Missing Values Summary:');
    console.log('='.repeat(70));

    // List of columns to check (nullable or potentially missing columns)
    const columnsToCheck = [
      'chapter_id',
      'filename',
      'difficulty',
      'correct_rate',
      'tags',
      'source',
      'problem_text',
      'problem_embedding',
      'exam_year',
      'problem_type',
      'problem_filename',
      'answer_filename',
      'answer',
      'answer_text',
      'answer_embedding'
    ];

    const results = [];

    for (const column of columnsToCheck) {
      // Count NULL values
      const { count: nullCount, error } = await supabase
        .from('problems')
        .select('*', { count: 'exact', head: true })
        .is(column, null);

      if (error) {
        console.error(`❌ Error checking ${column}: ${error.message}`);
        continue;
      }

      const missingCount = nullCount || 0;
      const presentCount = totalCount - missingCount;
      const missingPercentage = ((missingCount / totalCount) * 100).toFixed(1);

      results.push({
        column,
        missing: missingCount,
        present: presentCount,
        percentage: missingPercentage
      });
    }

    // Sort by missing count (descending)
    results.sort((a, b) => b.missing - a.missing);

    // Display results
    console.log(`${'Column'.padEnd(25)} | ${'Missing'.padStart(7)} | ${'Present'.padStart(7)} | ${'Missing %'.padStart(10)}`);
    console.log('-'.repeat(70));

    results.forEach(({ column, missing, present, percentage }) => {
      const icon = missing === 0 ? '✅' : missing > totalCount / 2 ? '🔴' : '⚠️';
      console.log(
        `${icon} ${column.padEnd(22)} | ${String(missing).padStart(7)} | ${String(present).padStart(7)} | ${String(percentage + '%').padStart(10)}`
      );
    });

    console.log('='.repeat(70));

    // Summary
    const fullyPopulated = results.filter(r => r.missing === 0);
    const partiallyMissing = results.filter(r => r.missing > 0 && r.missing <= totalCount / 2);
    const mostlyMissing = results.filter(r => r.missing > totalCount / 2);

    console.log('\n📈 Summary:');
    console.log(`   ✅ Fully populated columns: ${fullyPopulated.length}`);
    console.log(`   ⚠️  Partially missing columns: ${partiallyMissing.length}`);
    console.log(`   🔴 Mostly missing columns: ${mostlyMissing.length}`);

    if (mostlyMissing.length > 0) {
      console.log('\n🔴 Columns with >50% missing data:');
      mostlyMissing.forEach(({ column, missing, percentage }) => {
        console.log(`   - ${column}: ${missing} missing (${percentage}%)`);
      });
    }

    if (partiallyMissing.length > 0) {
      console.log('\n⚠️  Columns with some missing data:');
      partiallyMissing.forEach(({ column, missing, percentage }) => {
        console.log(`   - ${column}: ${missing} missing (${percentage}%)`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
checkProblemsTableStatus();
