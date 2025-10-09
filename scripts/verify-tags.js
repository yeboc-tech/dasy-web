import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Parse tags from CSV format
 * - Split by comma
 * - Keep tags with + as a single tag (don't split on +)
 * - Trim whitespace
 */
function parseTagsFromCSV(tagsString) {
  if (!tagsString) return [];

  // Split by comma and trim whitespace
  return tagsString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

/**
 * Compare two tag arrays
 * Returns true if they contain the same tags (order doesn't matter)
 */
function tagsMatch(csvTags, dbTags) {
  if (csvTags.length !== dbTags.length) {
    return false;
  }

  // Sort both arrays and compare
  const sortedCsvTags = [...csvTags].sort();
  const sortedDbTags = [...dbTags].sort();

  return sortedCsvTags.every((tag, index) => tag === sortedDbTags[index]);
}

async function verifyTags() {
  console.log('Reading verification CSV...');

  // Read CSV file
  const csvPath = '/Users/joonnam/Workspace/dasy-web/public/data/modified/정법생윤경제-verification.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true
  });

  console.log(`Found ${records.length} records in CSV\n`);

  const mismatches = [];
  const matches = [];
  const errors = [];

  for (const [index, record] of records.entries()) {
    const dbId = record['DB_ID'];
    const csvTags = parseTagsFromCSV(record['태그 (쉼표구분)']);

    if (!dbId) {
      console.log(`Row ${index + 2}: Skipping (no DB_ID)`);
      continue;
    }

    try {
      // Fetch from database
      const { data, error } = await supabase
        .from('problems')
        .select('id, tags')
        .eq('id', dbId)
        .single();

      if (error) {
        errors.push({
          row: index + 2,
          dbId,
          error: error.message
        });
        console.log(`Row ${index + 2}: Error fetching from DB - ${error.message}`);
        continue;
      }

      if (!data) {
        errors.push({
          row: index + 2,
          dbId,
          error: 'Not found in database'
        });
        console.log(`Row ${index + 2}: Problem not found in DB (ID: ${dbId})`);
        continue;
      }

      const dbTags = data.tags || [];

      // Compare tags
      if (tagsMatch(csvTags, dbTags)) {
        matches.push({
          row: index + 2,
          dbId,
          tags: csvTags
        });
        console.log(`Row ${index + 2}: ✓ MATCH (ID: ${dbId})`);
      } else {
        mismatches.push({
          row: index + 2,
          dbId,
          csvTags,
          dbTags
        });
        console.log(`Row ${index + 2}: ✗ MISMATCH (ID: ${dbId})`);
        console.log(`  CSV tags: [${csvTags.join(', ')}]`);
        console.log(`  DB tags:  [${dbTags.join(', ')}]`);
      }
    } catch (err) {
      errors.push({
        row: index + 2,
        dbId,
        error: err.message
      });
      console.log(`Row ${index + 2}: Exception - ${err.message}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total records: ${records.length}`);
  console.log(`Matches: ${matches.length}`);
  console.log(`Mismatches: ${mismatches.length}`);
  console.log(`Errors: ${errors.length}`);

  if (mismatches.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('MISMATCHES DETAILS:');
    console.log('-'.repeat(60));
    mismatches.forEach(({ row, dbId, csvTags, dbTags }) => {
      console.log(`\nRow ${row} (ID: ${dbId}):`);
      console.log(`  CSV: [${csvTags.join(', ')}]`);
      console.log(`  DB:  [${dbTags.join(', ')}]`);
    });
  }

  if (errors.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('ERRORS:');
    console.log('-'.repeat(60));
    errors.forEach(({ row, dbId, error }) => {
      console.log(`Row ${row} (ID: ${dbId}): ${error}`);
    });
  }

  // Write results to file
  const reportPath = `/Users/joonnam/Workspace/dasy-web/scripts/tag-verification-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: records.length,
      matches: matches.length,
      mismatches: mismatches.length,
      errors: errors.length
    },
    mismatches,
    errors
  }, null, 2));

  console.log(`\nReport written to: ${reportPath}`);
}

verifyTags().catch(console.error);
