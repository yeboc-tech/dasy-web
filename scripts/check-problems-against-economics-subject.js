require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function extractNumberFromFilename(filename) {
  if (!filename) return null;
  // Extract number from filename like "경제123.png" -> 123
  const match = filename.match(/경제(\d+)/);
  return match ? parseInt(match[1]) : null;
}

async function checkProblemsAgainstEconomicsSubject() {
  try {
    console.log('🔄 Checking JSON problems against database problems linked to 경제 subject...');

    // Read the JSON file
    const jsonPath = path.join(__dirname, '../public/data/경제-problems-metadata-from-converted.json');
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(jsonContent);

    console.log(`📊 Found ${data.problems.length} problems in JSON to check`);

    // 1. Get the subject ID for '경제'
    console.log('🔍 Fetching 경제 subject ID...');
    const { data: economicsSubject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('name', '경제')
      .single();

    if (subjectError) {
      throw new Error(`Failed to get economics subject: ${subjectError.message}`);
    }

    console.log(`📋 Found economics subject: ${economicsSubject.id} - ${economicsSubject.name}`);

    // 2. Get all problem IDs that are linked to economics subject
    console.log('🔍 Fetching all problems linked to economics subject...');
    const { data: economicsProblemRelations, error: relationsError } = await supabase
      .from('problem_subjects')
      .select('problem_id')
      .eq('subject_id', economicsSubject.id);

    if (relationsError) {
      throw new Error(`Failed to get problem-subject relationships: ${relationsError.message}`);
    }

    console.log(`📋 Found ${economicsProblemRelations.length} problems linked to economics subject`);

    // 3. Get all problem details for those problem IDs
    const economicsProblemIds = economicsProblemRelations.map(rel => rel.problem_id);

    if (economicsProblemIds.length === 0) {
      console.log('⚠️  No problems found linked to economics subject');
      return;
    }

    console.log('🔍 Fetching problem details for economics problems (in batches)...');

    // Batch the queries to avoid URL length limits
    const batchSize = 100;
    const economicsProblems = [];

    for (let i = 0; i < economicsProblemIds.length; i += batchSize) {
      const batchIds = economicsProblemIds.slice(i, i + batchSize);
      console.log(`   Fetching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(economicsProblemIds.length/batchSize)} (${batchIds.length} problems)...`);

      const { data: batchProblems, error: problemsError } = await supabase
        .from('problems')
        .select('id, filename, problem_filename, source, chapter_id, difficulty, problem_type, correct_rate, tags')
        .in('id', batchIds);

      if (problemsError) {
        throw new Error(`Failed to get problem details for batch: ${problemsError.message}`);
      }

      economicsProblems.push(...batchProblems);
    }

    console.log(`📋 Fetched ${economicsProblems.length} economics problem details from database`);

    // 4. Create maps for different matching strategies
    const dbByFilenameNumber = new Map(); // filename number -> db problem
    const dbBySource = new Map(); // source -> db problem
    const dbByChapterAndDifficulty = new Map(); // "chapter_id|difficulty" -> db problem

    economicsProblems.forEach(dbProblem => {
      // Map by filename number
      const filenameNumber = extractNumberFromFilename(dbProblem.filename) ||
                            extractNumberFromFilename(dbProblem.problem_filename);
      if (filenameNumber) {
        if (dbByFilenameNumber.has(filenameNumber)) {
          console.warn(`⚠️  Duplicate filename number ${filenameNumber} in economics problems`);
        } else {
          dbByFilenameNumber.set(filenameNumber, dbProblem);
        }
      }

      // Map by source
      if (dbProblem.source && dbProblem.source.trim()) {
        const source = dbProblem.source.trim();
        if (dbBySource.has(source)) {
          console.warn(`⚠️  Duplicate source in economics problems: ${source}`);
        } else {
          dbBySource.set(source, dbProblem);
        }
      }

      // Map by chapter + difficulty
      const chapterDifficultyKey = `${dbProblem.chapter_id}|${dbProblem.difficulty}`;
      if (!dbByChapterAndDifficulty.has(chapterDifficultyKey)) {
        dbByChapterAndDifficulty.set(chapterDifficultyKey, []);
      }
      dbByChapterAndDifficulty.get(chapterDifficultyKey).push(dbProblem);
    });

    console.log(`🎯 Mapped economics problems:`);
    console.log(`   By filename number: ${dbByFilenameNumber.size} problems`);
    console.log(`   By source: ${dbBySource.size} problems`);
    console.log(`   By chapter+difficulty: ${dbByChapterAndDifficulty.size} combinations`);

    // 5. Check each JSON problem against database
    let foundByFilename = 0;
    let foundBySource = 0;
    let foundByBoth = 0;
    let notFoundInDb = 0;

    const results = data.problems.map(jsonProblem => {
      const excelId = jsonProblem._metadata?.excel_id;
      const source = jsonProblem.source?.trim();

      let matchedByFilename = null;
      let matchedBySource = null;

      // Check by filename number (excel_id)
      if (excelId) {
        matchedByFilename = dbByFilenameNumber.get(parseInt(excelId));
      }

      // Check by source
      if (source) {
        matchedBySource = dbBySource.get(source);
      }

      // Determine match status
      let matchStatus = 'not_found';
      let matchedDbProblem = null;
      let matchMethod = null;

      if (matchedByFilename && matchedBySource) {
        // Both methods match
        if (matchedByFilename.id === matchedBySource.id) {
          matchStatus = 'found';
          matchedDbProblem = matchedByFilename;
          matchMethod = 'filename_and_source_match';
          foundByBoth++;
        } else {
          matchStatus = 'conflict';
          matchedDbProblem = matchedByFilename; // Prefer filename match
          matchMethod = 'filename_source_conflict';
        }
      } else if (matchedByFilename) {
        matchStatus = 'found';
        matchedDbProblem = matchedByFilename;
        matchMethod = 'filename_only';
        foundByFilename++;
      } else if (matchedBySource) {
        matchStatus = 'found';
        matchedDbProblem = matchedBySource;
        matchMethod = 'source_only';
        foundBySource++;
      } else {
        notFoundInDb++;
      }

      return {
        ...jsonProblem,
        exists_in_db: matchStatus === 'found',
        match_status: matchStatus,
        match_method: matchMethod,
        matched_db_id: matchedDbProblem?.id || null,
        matched_db_filename: matchedDbProblem?.filename || matchedDbProblem?.problem_filename || null,
        expected_filename: excelId ? `경제${excelId}.png` : null,
        // Comparison fields for conflicts
        db_source: matchedDbProblem?.source || null,
        db_chapter_id: matchedDbProblem?.chapter_id || null,
        db_difficulty: matchedDbProblem?.difficulty || null,
        json_chapter_id: jsonProblem.chapter_id,
        json_difficulty: jsonProblem.difficulty
      };
    });

    // 6. Create updated data structure
    const updatedData = {
      ...data,
      problems: results,
      metadata: {
        ...data.metadata,
        existence_check: {
          total_json_problems: data.problems.length,
          total_db_economics_problems: economicsProblems.length,
          found_by_filename_and_source: foundByBoth,
          found_by_filename_only: foundByFilename,
          found_by_source_only: foundBySource,
          not_found_in_db: notFoundInDb,
          total_found: foundByBoth + foundByFilename + foundBySource,
          check_method: 'economics_subject_comprehensive',
          economics_subject_id: economicsSubject.id,
          checked_at: new Date().toISOString()
        }
      }
    };

    // 7. Write updated JSON file
    const outputPath = path.join(__dirname, '../public/data/경제-problems-metadata-with-economics-subject-check.json');
    fs.writeFileSync(outputPath, JSON.stringify(updatedData, null, 2), 'utf8');

    // 8. Summary and analysis
    console.log('\n📊 Economics Subject Check Results:');
    console.log(`📈 Total JSON problems: ${data.problems.length}`);
    console.log(`📈 Total DB economics problems: ${economicsProblems.length}`);
    console.log(`✅ Found by both filename & source: ${foundByBoth} problems`);
    console.log(`✅ Found by filename only: ${foundByFilename} problems`);
    console.log(`✅ Found by source only: ${foundBySource} problems`);
    console.log(`✅ Total found: ${foundByBoth + foundByFilename + foundBySource} problems`);
    console.log(`❌ Not found in DB: ${notFoundInDb} problems`);
    console.log(`📊 Match rate: ${(((foundByBoth + foundByFilename + foundBySource) / data.problems.length) * 100).toFixed(1)}%`);

    // 9. Show examples
    const foundProblems = results.filter(p => p.exists_in_db);
    const notFoundProblems = results.filter(p => !p.exists_in_db);
    const conflictProblems = results.filter(p => p.match_status === 'conflict');

    if (foundProblems.length > 0) {
      console.log('\n📋 Examples of problems found in DB (first 5):');
      foundProblems.slice(0, 5).forEach((p, index) => {
        console.log(`${index + 1}. Excel ID: ${p._metadata.excel_id}, Method: ${p.match_method}`);
        console.log(`   Expected: ${p.expected_filename}, DB: ${p.matched_db_filename}`);
        console.log(`   Source: "${p.source}"`);
      });
    }

    if (notFoundProblems.length > 0) {
      console.log('\n📋 Examples of problems NOT found in DB (first 10):');
      notFoundProblems.slice(0, 10).forEach((p, index) => {
        console.log(`${index + 1}. Excel ID: ${p._metadata.excel_id}, Expected: ${p.expected_filename}`);
        console.log(`   Source: "${p.source}"`);
      });
    }

    if (conflictProblems.length > 0) {
      console.log('\n⚠️  Conflict cases (filename vs source mismatch):');
      conflictProblems.slice(0, 5).forEach((p, index) => {
        console.log(`${index + 1}. Excel ID: ${p._metadata.excel_id}`);
        console.log(`   JSON Source: "${p.source}"`);
        console.log(`   DB Source: "${p.db_source}"`);
      });
    }

    // 10. Range analysis for missing problems
    const missingIds = notFoundProblems
      .map(p => p._metadata.excel_id)
      .filter(id => id && !isNaN(parseInt(id)))
      .map(id => parseInt(id))
      .sort((a, b) => a - b);

    if (missingIds.length > 0) {
      console.log(`\n📊 Missing problems ID analysis:`);
      console.log(`   Range: ${missingIds[0]} - ${missingIds[missingIds.length - 1]}`);
      console.log(`   First 20 missing: ${missingIds.slice(0, 20).join(', ')}${missingIds.length > 20 ? '...' : ''}`);

      // Count by ranges
      const ranges = [
        [1, 100], [101, 200], [201, 300], [301, 400], [401, 500], [501, 600]
      ];
      ranges.forEach(([start, end]) => {
        const count = missingIds.filter(id => id >= start && id <= end).length;
        console.log(`   ${start}-${end}: ${count} missing`);
      });
    }

    console.log(`\n💾 Updated JSON saved to: ${outputPath}`);

    return {
      totalJsonProblems: data.problems.length,
      totalDbEconomicsProblems: economicsProblems.length,
      foundByBoth: foundByBoth,
      foundByFilename: foundByFilename,
      foundBySource: foundBySource,
      totalFound: foundByBoth + foundByFilename + foundBySource,
      notFound: notFoundInDb,
      matchRate: ((foundByBoth + foundByFilename + foundBySource) / data.problems.length) * 100,
      outputPath
    };

  } catch (error) {
    console.error('❌ Error checking problems against economics subject:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  checkProblemsAgainstEconomicsSubject();
}

module.exports = { checkProblemsAgainstEconomicsSubject };