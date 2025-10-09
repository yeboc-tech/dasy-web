require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Fix CSV where index numbers are in the last column instead of first column
 * Move last column numbers to first column if present
 */

const INPUT_FILE = path.join(__dirname, '../public/data/raw/정법생윤.csv');
const OUTPUT_FILE = path.join(__dirname, '../public/data/modified/정법생윤-fixed.csv');

function fixIndexColumn() {
  try {
    console.log('🔄 Fixing index column placement...\n');

    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`Input file not found: ${INPUT_FILE}`);
    }

    // Read the file content
    const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
    const lines = fileContent.split('\n');

    console.log(`📖 Read ${lines.length} lines`);

    // Process each line
    const fixedLines = [];
    let fixedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        continue; // Skip empty lines
      }

      if (i === 0) {
        // Header row - keep as is
        fixedLines.push(line);
        continue;
      }

      // Split by comma to get columns
      const columns = line.split(',');

      // Check if first column is empty and last column has a number
      const firstCol = columns[0]?.trim();
      const lastCol = columns[columns.length - 1]?.trim();

      // If first column is empty/number and last column has a number, move it
      if (lastCol && /^\d+$/.test(lastCol)) {
        // Last column is a number
        if (!firstCol || firstCol === '') {
          // First column is empty - move last to first
          columns[0] = lastCol;
          columns[columns.length - 1] = '';
          fixedCount++;
          console.log(`  ✅ Row ${i}: Moved index ${lastCol} from last to first column`);
        }
      }

      // Rejoin and add to fixed lines
      fixedLines.push(columns.join(','));
    }

    // Write fixed file
    const outputContent = fixedLines.join('\n') + '\n';
    fs.writeFileSync(OUTPUT_FILE, outputContent, 'utf8');

    console.log(`\n📊 Summary:`);
    console.log(`  Input file: ${INPUT_FILE}`);
    console.log(`  Output file: ${OUTPUT_FILE}`);
    console.log(`  Total lines: ${lines.length}`);
    console.log(`  Fixed rows: ${fixedCount}`);
    console.log(`  Unchanged rows: ${lines.length - fixedCount - 1}`); // -1 for header

    console.log('\n🎉 Index column fixed successfully!');

    return { fixedCount, totalLines: lines.length };

  } catch (error) {
    console.error('❌ Error fixing index column:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  fixIndexColumn();
}

module.exports = { fixIndexColumn };
