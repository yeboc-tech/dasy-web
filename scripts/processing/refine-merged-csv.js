require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { stringify } = require('csv-stringify/sync');

/**
 * Refine 정법생윤경제.csv:
 * 1. Remove rows where index column is not a number
 * 2. Add real global index starting from 1
 * 3. Remove columns: empty header, 비고, 작업 상태값
 */

const INPUT_FILE = path.join(__dirname, '../data/archive/csv/modified/정법생윤경제.csv');
const OUTPUT_FILE = path.join(__dirname, '../data/archive/csv/modified/정법생윤경제-refined.csv');

async function refineCSV() {
  try {
    console.log('🔄 Starting CSV refinement process...\n');

    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`Input file not found: ${INPUT_FILE}`);
    }

    // Step 1: Read CSV
    console.log('📖 Reading CSV file...');
    const rows = [];
    let headers = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(INPUT_FILE)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers = headerList;
          console.log(`  ✅ Found ${headers.length} columns`);
        })
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`  ✅ Read ${rows.length} rows`);

    // Step 2: Filter rows where 순번 is a number
    console.log('\n🔍 Filtering rows with numeric index...');
    const indexColumn = '순번';

    const filteredRows = rows.filter(row => {
      const indexValue = row[indexColumn];
      return indexValue && /^\d+$/.test(indexValue.trim());
    });

    const removedCount = rows.length - filteredRows.length;
    console.log(`  ✅ Kept ${filteredRows.length} rows`);
    console.log(`  ❌ Removed ${removedCount} rows (non-numeric index)`);

    // Step 3: Remove unwanted columns and add global index
    console.log('\n🔧 Removing unwanted columns and adding global index...');

    const columnsToRemove = ['', '비고', '작업 상태값'];
    const filteredHeaders = headers.filter(h => !columnsToRemove.includes(h));

    // Add global_index as first column, keep 순번 as second column
    const outputHeaders = ['global_index', ...filteredHeaders];

    console.log(`  Removed columns: ${columnsToRemove.filter(c => headers.includes(c)).join(', ')}`);
    console.log(`  Final column count: ${outputHeaders.length}`);

    // Step 4: Add global index starting from 1
    console.log('\n🔢 Adding global index...');
    const refinedRows = filteredRows.map((row, idx) => {
      const newRow = { global_index: idx + 1 };

      filteredHeaders.forEach(header => {
        if (!columnsToRemove.includes(header)) {
          newRow[header] = row[header] || '';
        }
      });

      return newRow;
    });

    // Step 5: Write refined CSV
    console.log('\n💾 Writing refined CSV file...');

    const csvContent = stringify(refinedRows, {
      header: true,
      columns: outputHeaders,
      quoted: true
    });

    fs.writeFileSync(OUTPUT_FILE, csvContent, 'utf8');
    console.log(`  ✅ Refined CSV saved to: ${OUTPUT_FILE}`);

    // Step 6: Summary
    console.log('\n📊 Refinement Summary:');
    console.log(`  Input file: ${INPUT_FILE}`);
    console.log(`  Output file: ${OUTPUT_FILE}`);
    console.log(`  Original rows: ${rows.length}`);
    console.log(`  Filtered rows: ${filteredRows.length}`);
    console.log(`  Removed rows: ${removedCount}`);
    console.log(`  Original columns: ${headers.length}`);
    console.log(`  Final columns: ${outputHeaders.length}`);
    console.log(`  Global index range: 1-${refinedRows.length}`);

    console.log('\n🎉 CSV refinement completed successfully!');

    return {
      totalRows: refinedRows.length,
      totalColumns: outputHeaders.length,
      outputFile: OUTPUT_FILE
    };

  } catch (error) {
    console.error('❌ Error refining CSV file:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  refineCSV();
}

module.exports = { refineCSV };
