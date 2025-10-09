require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');

/**
 * Merge all subject CSV files (정법, 생윤, 경제) into one universal table
 * Preserves each subject's local index and all columns
 */

const FILES_TO_MERGE = [
  {
    name: '정법',
    path: path.join(__dirname, '../public/data/modified/정법.csv')
  },
  {
    name: '생윤',
    path: path.join(__dirname, '../public/data/modified/생윤.csv')
  },
  {
    name: '경제',
    path: path.join(__dirname, '../public/data/raw/경제.csv')
  }
];

const OUTPUT_FILE = path.join(__dirname, '../public/data/modified/문제데이터_통합.csv');

async function parseCSVProperly(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = [];

    fs.createReadStream(filePath)
      .pipe(require('csv-parser')({
        mapHeaders: ({ header, index }) => {
          // Rename duplicate empty headers to avoid conflicts
          if (header === '' && index === 0) return '__INDEX__';
          if (header === '') return `__EMPTY_${index}__`;
          return header;
        }
      }))
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

async function mergeAllSubjects() {
  try {
    console.log('🔄 Starting universal CSV merge process...\n');

    // Step 1: Read all CSV files
    console.log('📖 Reading CSV files...');
    const filesData = [];

    for (const file of FILES_TO_MERGE) {
      if (!fs.existsSync(file.path)) {
        console.warn(`⚠️  File not found: ${file.path}, skipping`);
        continue;
      }

      console.log(`  - Reading ${file.name}...`);
      const data = await parseCSVProperly(file.path);
      filesData.push({
        name: file.name,
        headers: data.headers,
        rows: data.rows
      });
      console.log(`    ✅ ${data.rows.length} rows read`);
    }

    if (filesData.length === 0) {
      throw new Error('No CSV files found to merge');
    }

    // Step 2: Determine all unique columns (union of all headers), normalize internal headers
    console.log('\n🔍 Analyzing columns...');
    const allColumns = new Set();
    filesData.forEach(file => {
      file.headers.forEach(header => {
        // Normalize internal headers back to output headers
        if (header === '__INDEX__') allColumns.add('순번');
        else if (header.startsWith('__EMPTY_')) allColumns.add('');
        else allColumns.add(header);
      });
    });

    const mergedColumns = Array.from(allColumns);
    console.log(`  Found ${mergedColumns.length} unique columns across all files`);

    // Step 3: Show column differences
    console.log('\n📊 Column analysis by file:');
    filesData.forEach(file => {
      const missingColumns = mergedColumns.filter(col => !file.headers.includes(col));
      console.log(`  ${file.name}:`);
      console.log(`    - Own columns: ${file.headers.length}`);
      console.log(`    - Missing columns: ${missingColumns.length}`);
      if (missingColumns.length > 0 && missingColumns.length <= 5) {
        missingColumns.forEach(col => console.log(`      • "${col}"`));
      }
    });

    // Step 4: Merge all rows with standardized columns
    console.log('\n🔄 Merging rows...');
    const mergedRows = [];

    filesData.forEach(file => {
      console.log(`  - Processing ${file.name} (${file.rows.length} rows)...`);

      file.rows.forEach(row => {
        const normalizedRow = {};

        // Map internal headers to output headers
        mergedColumns.forEach(outCol => {
          // Find corresponding internal header
          const internalHeader = file.headers.find(h => {
            if (outCol === '순번' && h === '__INDEX__') return true;
            if (outCol === '' && h.startsWith('__EMPTY_')) return true;
            return h === outCol;
          });

          normalizedRow[outCol] = (internalHeader && row[internalHeader]) || '';
        });

        mergedRows.push(normalizedRow);
      });
    });

    console.log(`  ✅ Total merged rows: ${mergedRows.length}`);

    // Step 5: Write merged CSV
    console.log('\n💾 Writing merged CSV file...');

    const csvContent = stringify(mergedRows, {
      header: true,
      columns: mergedColumns,
      quoted: true
    });

    fs.writeFileSync(OUTPUT_FILE, csvContent, 'utf8');
    console.log(`  ✅ Merged CSV saved to: ${OUTPUT_FILE}`);

    // Step 6: Summary
    console.log('\n📊 Merge Summary:');
    console.log(`  Total files merged: ${filesData.length}`);
    console.log(`  Total columns: ${mergedColumns.length}`);
    console.log(`  Total rows: ${mergedRows.length}`);

    filesData.forEach(file => {
      console.log(`\n  ${file.name}:`);
      console.log(`    - Rows: ${file.rows.length}`);
      console.log(`    - Original columns: ${file.headers.length}`);
      console.log(`    - Added columns: ${mergedColumns.length - file.headers.length}`);
    });

    console.log('\n🎉 Universal CSV merge completed successfully!');

    return {
      totalFiles: filesData.length,
      totalColumns: mergedColumns.length,
      totalRows: mergedRows.length,
      outputFile: OUTPUT_FILE
    };

  } catch (error) {
    console.error('❌ Error merging CSV files:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  mergeAllSubjects();
}

module.exports = { mergeAllSubjects };
