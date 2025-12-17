/**
 * General XLSX to JSON converter
 *
 * Usage:
 *   node xlsx-to-json.js <input.xlsx> [options]
 *
 * Options:
 *   --sheet <name>    Only export specific sheet
 *   --output <path>   Output file path (default: same name as input with .json)
 *   --list            List all sheet names and exit
 *
 * Examples:
 *   node xlsx-to-json.js ../../data/imports/yotongsa.xlsx --list
 *   node xlsx-to-json.js ../../data/imports/yotongsa.xlsx --sheet "1권 3단원"
 *   node xlsx-to-json.js ../../data/imports/yotongsa.xlsx --sheet "1권 3단원" --output ../../data/imports/1권3단원.json
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Normalize Korean text to NFC (composed form)
 * This ensures consistent string comparison with database
 */
function normalizeKorean(str) {
  if (typeof str !== 'string') return str;
  return str.normalize('NFC');
}

/**
 * Clean column name: remove spaces, normalize Korean
 */
function cleanColumnName(name) {
  if (typeof name !== 'string') return name;
  return normalizeKorean(name.replace(/\s+/g, '').replace(/\./g, ''));
}

/**
 * Process a single row, normalizing all string values
 */
function processRow(row, rowIndex, sheetName) {
  const processed = {
    sheet: sheetName,
    row: rowIndex + 1
  };

  for (const [key, value] of Object.entries(row)) {
    const cleanKey = cleanColumnName(key);
    processed[cleanKey] = typeof value === 'string' ? normalizeKorean(value) : value;
  }

  return processed;
}

/**
 * Convert xlsx to JSON
 */
function xlsxToJson(inputPath, options = {}) {
  const { sheetName, listOnly } = options;

  if (!fs.existsSync(inputPath)) {
    console.error('File not found:', inputPath);
    process.exit(1);
  }

  console.log('Reading:', inputPath);
  const workbook = XLSX.readFile(inputPath);

  // List sheets mode
  if (listOnly) {
    console.log('\nSheets in workbook:');
    workbook.SheetNames.forEach((name, idx) => {
      const sheet = workbook.Sheets[name];
      const data = XLSX.utils.sheet_to_json(sheet);
      console.log(`  ${idx + 1}. "${name}" (${data.length} rows)`);
    });
    return null;
  }

  // Validate sheet name if specified
  if (sheetName && !workbook.SheetNames.includes(sheetName)) {
    console.error(`Sheet "${sheetName}" not found.`);
    console.log('Available sheets:', workbook.SheetNames.join(', '));
    process.exit(1);
  }

  const sheetsToProcess = sheetName ? [sheetName] : workbook.SheetNames;
  const allData = [];

  sheetsToProcess.forEach(name => {
    console.log('Processing sheet:', name);
    const sheet = workbook.Sheets[name];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    rawData.forEach((row, idx) => {
      allData.push(processRow(row, idx, name));
    });

    console.log(`  ${rawData.length} rows`);
  });

  const result = {
    source: path.basename(inputPath),
    exportedAt: new Date().toISOString(),
    sheet: sheetName || 'all',
    totalRows: allData.length,
    data: allData
  };

  return result;
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    inputPath: null,
    outputPath: null,
    sheetName: null,
    listOnly: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--sheet' && args[i + 1]) {
      options.sheetName = args[++i];
    } else if (arg === '--output' && args[i + 1]) {
      options.outputPath = args[++i];
    } else if (arg === '--list') {
      options.listOnly = true;
    } else if (!arg.startsWith('--') && !options.inputPath) {
      options.inputPath = arg;
    }
  }

  return options;
}

// Main
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node xlsx-to-json.js <input.xlsx> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --sheet <name>    Only export specific sheet');
    console.log('  --output <path>   Output file path');
    console.log('  --list            List all sheet names');
    process.exit(0);
  }

  const options = parseArgs(args);

  if (!options.inputPath) {
    console.error('No input file specified');
    process.exit(1);
  }

  // Resolve path relative to script location or cwd
  const inputPath = path.isAbsolute(options.inputPath)
    ? options.inputPath
    : path.resolve(process.cwd(), options.inputPath);

  const result = xlsxToJson(inputPath, {
    sheetName: options.sheetName,
    listOnly: options.listOnly
  });

  if (result) {
    // Determine output path
    const outputPath = options.outputPath
      ? (path.isAbsolute(options.outputPath)
          ? options.outputPath
          : path.resolve(process.cwd(), options.outputPath))
      : inputPath.replace(/\.xlsx$/i, '.json');

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
    console.log('\nSaved:', outputPath);
    console.log('Total rows:', result.totalRows);
  }
}

module.exports = { xlsxToJson, normalizeKorean, cleanColumnName };
