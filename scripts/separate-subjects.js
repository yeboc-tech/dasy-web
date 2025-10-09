require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { stringify } = require('csv-stringify/sync');

/**
 * Separate 정법생윤.csv into 정법.csv and 생윤.csv based on subject column
 */

const INPUT_FILE = path.join(__dirname, '../public/data/raw/정법생윤.csv');
const OUTPUT_DIR = path.join(__dirname, '../public/data/modified');

// Subject column mappings
const SUBJECT_MAPPINGS = {
  '정치와 법': '정법',
  '생활과 윤리': '생윤'
};

async function separateSubjects() {
  try {
    console.log('🔄 Starting CSV separation process...\n');

    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`Input file not found: ${INPUT_FILE}`);
    }

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Step 1: Read the CSV file using csv-parser with mapHeaders to handle duplicates
    console.log('📖 Reading CSV file...');

    const rows = [];
    let headers = [];
    let originalHeaders = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(INPUT_FILE)
        .pipe(csv({
          mapHeaders: ({ header, index }) => {
            originalHeaders.push(header);
            // Rename duplicate empty headers
            if (header === '' && index === 0) return '__INDEX__';
            if (header === '') return `__EMPTY_${index}__`;
            return header;
          }
        }))
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

    // Step 2: Group rows by subject
    console.log('\n🔍 Grouping rows by subject...');
    const subjectGroups = {};

    // Find the subject column (기존 사탐 범주)
    const subjectColumnKey = headers.find(h => h.includes('기존 사탐 범주'));
    if (!subjectColumnKey) {
      throw new Error('Could not find subject column (기존 사탐 범주)');
    }

    console.log(`  Subject column: "${subjectColumnKey}"`);

    rows.forEach((row, index) => {
      const subject = row[subjectColumnKey];

      if (!subject || subject.trim() === '') {
        console.warn(`  ⚠️  Row ${index + 1} has no subject, skipping`);
        return;
      }

      const subjectKey = SUBJECT_MAPPINGS[subject] || subject;

      if (!subjectGroups[subjectKey]) {
        subjectGroups[subjectKey] = [];
      }

      subjectGroups[subjectKey].push(row);
    });

    console.log('\n📊 Subject breakdown:');
    Object.entries(subjectGroups).forEach(([subject, rows]) => {
      console.log(`  - ${subject}: ${rows.length} rows`);
    });

    // Step 3: Write separate CSV files for each subject
    console.log('\n💾 Writing separate CSV files...');

    for (const [subjectKey, subjectRows] of Object.entries(subjectGroups)) {
      const outputFile = path.join(OUTPUT_DIR, `${subjectKey}.csv`);

      // Rename headers for output: __INDEX__ -> 순번, keep others
      const outputHeaders = headers.map((h) => {
        if (h === '__INDEX__') return '순번';
        if (h.startsWith('__EMPTY_')) return '';
        return h;
      });

      // Map row data to new headers
      const processedRows = subjectRows.map(row => {
        const newRow = {};

        // Special handling for 생윤: use last empty column as index
        if (subjectKey === '생윤') {
          const lastEmptyCol = headers.find(h => h.startsWith('__EMPTY_'));
          if (lastEmptyCol && row[lastEmptyCol]) {
            // Use last column value as index for 생윤
            outputHeaders.forEach((outHeader, idx) => {
              const internalHeader = headers[idx];
              if (outHeader === '순번') {
                newRow[outHeader] = row[lastEmptyCol];
              } else if (internalHeader === lastEmptyCol) {
                newRow[outHeader] = '';
              } else {
                newRow[outHeader] = row[internalHeader] || '';
              }
            });
          } else {
            // No last column - just copy
            outputHeaders.forEach((outHeader, idx) => {
              const internalHeader = headers[idx];
              newRow[outHeader] = row[internalHeader] || '';
            });
          }
        } else {
          // For 정법: use __INDEX__ as-is
          outputHeaders.forEach((outHeader, idx) => {
            const internalHeader = headers[idx];
            newRow[outHeader] = row[internalHeader] || '';
          });
        }

        return newRow;
      });

      const csvContent = stringify(processedRows, {
        header: true,
        columns: outputHeaders,
        quoted: true
      });

      fs.writeFileSync(outputFile, csvContent, 'utf8');
      console.log(`  ✅ ${subjectKey}.csv - ${subjectRows.length} rows written`);
    }

    // Step 4: Summary
    console.log('\n📊 Separation Summary:');
    console.log(`  Input file: ${INPUT_FILE}`);
    console.log(`  Total rows processed: ${rows.length}`);
    console.log(`  Files created: ${Object.keys(subjectGroups).length}`);
    console.log(`  Output directory: ${OUTPUT_DIR}`);

    console.log('\n🎉 CSV separation completed successfully!');

    return subjectGroups;

  } catch (error) {
    console.error('❌ Error separating CSV file:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  separateSubjects();
}

module.exports = { separateSubjects };
