require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fields to update
const UPDATE_FIELDS = ['chapter_id', 'difficulty', 'problem_type', 'correct_rate', 'source', 'tags'];

// Parse command line arguments
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 50; // Process in batches

function compareValues(jsonValue, dbValue, fieldName) {
  if (fieldName === 'tags') {
    // Compare arrays
    if (!Array.isArray(jsonValue) && !Array.isArray(dbValue)) {
      return jsonValue === dbValue;
    }
    if (!Array.isArray(jsonValue) || !Array.isArray(dbValue)) {
      return false;
    }
    if (jsonValue.length !== dbValue.length) {
      return false;
    }
    const sortedJson = [...jsonValue].sort();
    const sortedDb = [...dbValue].sort();
    return sortedJson.every((val, index) => val === sortedDb[index]);
  }

  // Handle null/undefined comparisons
  if (jsonValue == null && dbValue == null) return true;
  if (jsonValue == null || dbValue == null) return false;

  return jsonValue === dbValue;
}

async function fetchCurrentDbValues(problemIds) {
  console.log(`🔍 Fetching current DB values for ${problemIds.length} problems...`);

  const batchSize = 100;
  const allDbProblems = [];

  for (let i = 0; i < problemIds.length; i += batchSize) {
    const batchIds = problemIds.slice(i, i + batchSize);

    const { data: batchProblems, error } = await supabase
      .from('problems')
      .select(`id, ${UPDATE_FIELDS.join(', ')}`)
      .in('id', batchIds);

    if (error) {
      throw new Error(`Failed to fetch DB values for batch: ${error.message}`);
    }

    allDbProblems.push(...batchProblems);
  }

  // Create map for easier lookup
  const dbMap = new Map();
  allDbProblems.forEach(problem => {
    dbMap.set(problem.id, problem);
  });

  return dbMap;
}

function detectChanges(jsonProblems, dbProblemsMap) {
  console.log('🔍 Detecting changes needed...');

  const changes = [];
  const fieldChangeCount = {};
  UPDATE_FIELDS.forEach(field => fieldChangeCount[field] = 0);

  jsonProblems.forEach(jsonProblem => {
    const dbProblem = dbProblemsMap.get(jsonProblem.matched_db_id);
    if (!dbProblem) {
      console.warn(`⚠️  DB problem not found for ${jsonProblem._metadata.excel_id}`);
      return;
    }

    const problemChanges = {};
    let hasChanges = false;

    UPDATE_FIELDS.forEach(field => {
      const jsonValue = jsonProblem[field];
      const dbValue = dbProblem[field];

      if (!compareValues(jsonValue, dbValue, field)) {
        problemChanges[field] = {
          from: dbValue,
          to: jsonValue
        };
        fieldChangeCount[field]++;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      changes.push({
        db_id: jsonProblem.matched_db_id,
        excel_id: jsonProblem._metadata.excel_id,
        expected_filename: jsonProblem.expected_filename,
        match_method: jsonProblem.match_method,
        changes: problemChanges
      });
    }
  });

  return { changes, fieldChangeCount };
}

function generatePreviewReport(changes, fieldChangeCount, totalProblems) {
  const report = {
    summary: {
      total_problems_checked: totalProblems,
      problems_needing_updates: changes.length,
      problems_no_changes: totalProblems - changes.length,
      field_change_counts: fieldChangeCount,
      dry_run: true,
      timestamp: new Date().toISOString()
    },
    field_statistics: fieldChangeCount,
    sample_changes: changes.slice(0, 10), // First 10 changes
    all_changes: changes
  };

  return report;
}

async function executeUpdates(changes) {
  console.log(`🔄 Executing ${changes.length} updates in batches of ${BATCH_SIZE}...`);

  const results = {
    successful: 0,
    failed: 0,
    errors: [],
    updated_problems: []
  };

  // Process in batches
  for (let i = 0; i < changes.length; i += BATCH_SIZE) {
    const batch = changes.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(changes.length / BATCH_SIZE);

    console.log(`   Processing batch ${batchNum}/${totalBatches} (${batch.length} problems)...`);

    // Process each problem in the batch
    for (const change of batch) {
      try {
        // Build update object with only changed fields
        const updateData = {};
        Object.keys(change.changes).forEach(field => {
          updateData[field] = change.changes[field].to;
        });

        // Add updated timestamp
        updateData.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from('problems')
          .update(updateData)
          .eq('id', change.db_id);

        if (error) {
          throw error;
        }

        results.successful++;
        results.updated_problems.push({
          db_id: change.db_id,
          excel_id: change.excel_id,
          updated_fields: Object.keys(change.changes)
        });

      } catch (error) {
        results.failed++;
        results.errors.push({
          db_id: change.db_id,
          excel_id: change.excel_id,
          error: error.message
        });
        console.error(`❌ Failed to update 경제${change.excel_id}: ${error.message}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  return results;
}

async function main() {
  try {
    console.log('🚀 Starting database update from JSON...');

    if (DRY_RUN) {
      console.log('🔍 [DRY RUN MODE] - No actual changes will be made');
    }

    // 1. Load input data
    const inputPath = path.join(__dirname, '../data/archive/intermediate/경제-problems-metadata-with-economics-subject-check.json');
    console.log('📖 Loading input data...');

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    console.log(`📊 Loaded ${inputData.problems.length} problems from JSON`);

    // 2. Filter to problems that exist in DB
    const problemsInDb = inputData.problems.filter(p =>
      p.exists_in_db || p.match_status === 'conflict'
    );

    console.log(`📋 Found ${problemsInDb.length} problems that exist in database`);

    if (problemsInDb.length === 0) {
      console.log('✅ No problems to update');
      return;
    }

    // 3. Fetch current DB values
    const problemIds = problemsInDb.map(p => p.matched_db_id);
    const dbProblemsMap = await fetchCurrentDbValues(problemIds);

    // 4. Detect changes
    const { changes, fieldChangeCount } = detectChanges(problemsInDb, dbProblemsMap);

    // 5. Generate summary
    console.log('\n📊 Change Detection Summary:');
    console.log(`✅ Total problems checked: ${problemsInDb.length}`);
    console.log(`🔄 Problems needing updates: ${changes.length}`);
    console.log(`✨ Problems with no changes: ${problemsInDb.length - changes.length}`);

    if (changes.length === 0) {
      console.log('🎉 All problems are already up to date!');
      return;
    }

    console.log('\n📊 Field Change Statistics:');
    Object.entries(fieldChangeCount).forEach(([field, count]) => {
      if (count > 0) {
        console.log(`  ${field}: ${count} changes`);
      }
    });

    // 6. Show sample changes
    if (changes.length > 0) {
      console.log('\n📋 Sample changes (first 5):');
      changes.slice(0, 5).forEach((change, index) => {
        console.log(`\n${index + 1}. 경제${change.excel_id} (${change.match_method})`);
        Object.entries(change.changes).forEach(([field, { from, to }]) => {
          console.log(`   ${field}:`);
          console.log(`     From: ${JSON.stringify(from)}`);
          console.log(`     To:   ${JSON.stringify(to)}`);
        });
      });
    }

    // 7. Handle dry-run vs actual execution
    if (DRY_RUN) {
      // Generate and save preview
      const preview = generatePreviewReport(changes, fieldChangeCount, problemsInDb.length);
      const previewPath = path.join(__dirname, 'db-update-preview.json');

      fs.writeFileSync(previewPath, JSON.stringify(preview, null, 2));

      console.log(`\n💾 Dry-run preview saved to: ${previewPath}`);
      console.log('\n✨ To execute actual updates, run:');
      console.log('   node scripts/update-db-problems-from-json.js');

      return preview;
    } else {
      // Actual execution
      console.log(`\n⚠️  You are about to update ${changes.length} problems in the database.`);
      console.log('This will override existing values with JSON data.');

      // In a real scenario, you might want to add a confirmation prompt here
      // For now, proceeding automatically

      console.log('\n🔄 Proceeding with updates...');
      const results = await executeUpdates(changes);

      // Generate final report
      const finalReport = {
        summary: {
          total_attempted: changes.length,
          successful_updates: results.successful,
          failed_updates: results.failed,
          success_rate: ((results.successful / changes.length) * 100).toFixed(1) + '%',
          field_change_counts: fieldChangeCount,
          execution_time: new Date().toISOString()
        },
        results: results,
        original_changes: changes
      };

      // Save results
      const resultsPath = path.join(__dirname, 'db-update-results.json');
      fs.writeFileSync(resultsPath, JSON.stringify(finalReport, null, 2));

      console.log('\n📊 Final Results:');
      console.log(`✅ Successfully updated: ${results.successful} problems`);
      console.log(`❌ Failed updates: ${results.failed} problems`);
      console.log(`📈 Success rate: ${finalReport.summary.success_rate}`);

      if (results.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        results.errors.slice(0, 5).forEach(err => {
          console.log(`  경제${err.excel_id}: ${err.error}`);
        });

        if (results.errors.length > 5) {
          console.log(`  ... and ${results.errors.length - 5} more errors`);
        }
      }

      console.log(`\n💾 Detailed results saved to: ${resultsPath}`);

      if (results.successful > 0) {
        console.log('\n🎉 Database update completed successfully!');
      }

      return finalReport;
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };