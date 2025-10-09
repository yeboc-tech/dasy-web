require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { stringify } = require('csv-stringify/sync');

/**
 * Create verification file by merging refined CSV with DB data
 * Matching: 순번 (refined) + 기존 사탐 범주 (refined) == filename number + 관련 과목 (DB)
 */

const REFINED_FILE = path.join(__dirname, '../public/data/modified/정법생윤경제-refined.csv');
const DB_FILE = path.join(__dirname, '../public/data/raw/문제데이터_2025-10-03.csv');
const OUTPUT_FILE = path.join(__dirname, '../public/data/modified/정법생윤경제-verification.csv');

async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headerList) => {
        headers = headerList;
      })
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve({ headers, rows });
      })
      .on('error', reject);
  });
}

/**
 * Extract number from filename like "版力454.png" -> "454"
 */
function extractNumberFromFilename(filename) {
  if (!filename) return null;
  const match = filename.match(/(\d+)/);
  return match ? match[1] : null;
}

async function createVerificationFile() {
  try {
    console.log('🔄 Creating verification file...\n');

    // Step 1: Read both CSV files
    console.log('📖 Reading CSV files...');
    const refined = await readCSV(REFINED_FILE);
    const db = await readCSV(DB_FILE);

    console.log(`  ✅ Refined CSV: ${refined.rows.length} rows, ${refined.headers.length} columns`);
    console.log(`  ✅ DB CSV: ${db.rows.length} rows, ${db.headers.length} columns`);

    // Step 2: Create lookup map from DB data
    // Key: "subject|number" -> row data
    console.log('\n🗂️  Building DB lookup map...');
    const dbMap = new Map();

    db.rows.forEach(row => {
      const subject = row['관련 과목'];
      const filename = row['문제 파일명'];
      const number = extractNumberFromFilename(filename);

      if (subject && number) {
        const key = `${subject}|${number}`;
        dbMap.set(key, row);
      }
    });

    console.log(`  ✅ Created lookup map with ${dbMap.size} entries`);

    // Step 3: Prepare output headers
    // All refined headers + DB headers with DB_ prefix (except 번호)
    // Note: 번호 column may have BOM character, so filter by trimming
    const dbHeadersToAdd = db.headers
      .filter(h => h.trim().replace(/^\uFEFF/, '') !== '번호')
      .map(h => `DB_${h.trim().replace(/^\uFEFF/, '')}`);
    const outputHeaders = [...refined.headers, ...dbHeadersToAdd];

    console.log(`\n📋 Output will have ${outputHeaders.length} columns`);
    console.log(`  - Refined columns: ${refined.headers.length}`);
    console.log(`  - Added DB columns: ${dbHeadersToAdd.length}`);

    // Step 4: Merge data
    console.log('\n🔗 Merging data...');
    let matchedCount = 0;
    let unmatchedCount = 0;

    const mergedRows = refined.rows.map(refinedRow => {
      const subject = refinedRow['기존 사탐 범주'];
      const number = refinedRow['순번'];
      const key = `${subject}|${number}`;

      const mergedRow = { ...refinedRow };

      // Try to find matching DB row
      const dbRow = dbMap.get(key);

      if (dbRow) {
        // Add all DB columns with DB_ prefix
        db.headers.forEach(dbHeader => {
          const cleanHeader = dbHeader.trim().replace(/^\uFEFF/, '');
          if (cleanHeader !== '번호') {
            mergedRow[`DB_${cleanHeader}`] = dbRow[dbHeader] || '';
          }
        });
        matchedCount++;
      } else {
        // No match found - add empty DB columns
        dbHeadersToAdd.forEach(header => {
          mergedRow[header] = '';
        });
        unmatchedCount++;
      }

      return mergedRow;
    });

    console.log(`\n  ✅ Matched: ${matchedCount} rows`);
    console.log(`  ⚠️  Unmatched: ${unmatchedCount} rows`);

    // Show all unmatched rows
    if (unmatchedCount > 0) {
      console.log('\n  Unmatched rows:');
      refined.rows.forEach(row => {
        const subject = row['기존 사탐 범주'];
        const number = row['순번'];
        const key = `${subject}|${number}`;
        if (!dbMap.has(key)) {
          console.log(`    - ${subject} #${number}`);
        }
      });
    }

    // Step 5: Write verification CSV
    console.log('\n💾 Writing verification file...');

    const csvContent = stringify(mergedRows, {
      header: true,
      columns: outputHeaders,
      quoted: true
    });

    fs.writeFileSync(OUTPUT_FILE, csvContent, 'utf8');
    console.log(`  ✅ Verification file saved to: ${OUTPUT_FILE}`);

    // Step 6: Summary
    console.log('\n📊 Verification File Summary:');
    console.log(`  Total rows: ${mergedRows.length}`);
    console.log(`  Total columns: ${outputHeaders.length}`);
    console.log(`  Matched with DB: ${matchedCount} (${(matchedCount/mergedRows.length*100).toFixed(1)}%)`);
    console.log(`  Unmatched: ${unmatchedCount} (${(unmatchedCount/mergedRows.length*100).toFixed(1)}%)`);

    console.log('\n🎉 Verification file created successfully!');

    return {
      totalRows: mergedRows.length,
      totalColumns: outputHeaders.length,
      matched: matchedCount,
      unmatched: unmatchedCount,
      outputFile: OUTPUT_FILE
    };

  } catch (error) {
    console.error('❌ Error creating verification file:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createVerificationFile();
}

module.exports = { createVerificationFile };
