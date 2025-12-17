/**
 * Refine yotongsa JSON - generate 통키다리No from 요통사교재No
 *
 * Usage:
 *   node refine-yotongsa-json.js <input.json> [--output <path>]
 *
 * Example:
 *   node refine-yotongsa-json.js ../../data/imports/1권3단원_raw.json
 */

const fs = require('fs');
const path = require('path');

/**
 * Normalize Korean text to NFC
 */
function normalizeKorean(str) {
  if (typeof str !== 'string') return str;
  return str.normalize('NFC');
}

/**
 * Generate 통키다리No from 요통사교재No
 *
 * Rules:
 * - 학년도 + 모평/수능 → year - 1
 * - 년 + 학평 → year as-is
 * - 수능 → month = 11
 *
 * Examples:
 * - "2021학년도 6월 모평 세계지리 9번" → "세계지리_고3_2020_06_모평_9_문제"
 * - "2020년 4월 학평 세계지리 9번" → "세계지리_고3_2020_04_학평_9_문제"
 * - "2022학년도 수능 세계지리 16번" → "세계지리_고3_2021_11_수능_16_문제"
 */
function generateProblemId(yotongsa) {
  if (!yotongsa || yotongsa === 'X' || yotongsa === '-') {
    return { id: null, error: 'empty_input' };
  }

  const normalized = normalizeKorean(yotongsa);

  // Pattern 1: 학년도 format (모평/수능)
  // "2021학년도 6월 모평 세계지리 9번"
  // "2022학년도 수능 세계지리 16번"
  const haknyundoPattern = /(\d{4})학년도\s*(?:(\d{1,2})월\s*)?(모평|수능)\s+(.+?)\s+(\d+)번/;

  // Pattern 2: 년 format (학평/모평)
  // "2020년 4월 학평 세계지리 9번"
  const nyunPattern = /(\d{4})년\s*(\d{1,2})월\s*(학평|모평)\s+(.+?)\s+(\d+)번/;

  let year, month, examType, subject, number;

  const haknyundoMatch = normalized.match(haknyundoPattern);
  const nyunMatch = normalized.match(nyunPattern);

  if (haknyundoMatch) {
    const haknyundo = parseInt(haknyundoMatch[1]);
    month = haknyundoMatch[2] ? haknyundoMatch[2].padStart(2, '0') : null;
    examType = haknyundoMatch[3];
    subject = haknyundoMatch[4].trim();
    number = haknyundoMatch[5];

    // 학년도 → year - 1 (actual exam year)
    year = haknyundo - 1;

    // For 수능, month is always 11
    if (examType === '수능') {
      month = '11';
    }
  } else if (nyunMatch) {
    year = parseInt(nyunMatch[1]);
    month = nyunMatch[2].padStart(2, '0');
    examType = nyunMatch[3];
    subject = nyunMatch[4].trim();
    number = nyunMatch[5];
  } else {
    return { id: null, error: 'parse_failed', input: yotongsa };
  }

  // Normalize subject name (remove spaces, match DB format)
  const subjectMap = {
    '세계지리': '세계지리',
    '한국지리': '한국지리',
    '생활과 윤리': '생활과윤리',
    '생활과윤리': '생활과윤리',
    '윤리와 사상': '윤리와사상',
    '사회문화': '사회문화',
    '사회 문화': '사회문화',
    '정치와 법': '정치와법',
    '경제': '경제'
  };

  const normalizedSubject = subjectMap[subject] || subject.replace(/\s+/g, '');

  const id = `${normalizedSubject}_고3_${year}_${month}_${examType}_${number}_문제`;

  return { id: normalizeKorean(id), error: null };
}

/**
 * Refine the raw JSON data
 */
function refineData(rawData) {
  const refined = rawData.data.map(row => {
    const generated = generateProblemId(row.요통사교재No);
    const original = row.통키다리No || null;

    // Determine match status
    let initialMatch = null;
    if (original && generated.id) {
      initialMatch = normalizeKorean(original) === generated.id;
    }

    // Determine final ID and source
    let finalId = null;
    let idSource = 'none';

    if (original && original !== 'X' && original !== '-') {
      finalId = normalizeKorean(original);
      idSource = 'original';
    } else if (generated.id) {
      finalId = generated.id;
      idSource = 'generated';
    }

    return {
      row: row.row,
      단원명: row.단원명,
      페이지: row.페이지,
      문항: row.문항,
      난이도: row.난이도,
      정답률: row.정답률,
      요통사교재No: row.요통사교재No,
      통키다리No_original: original,
      통키다리No_generated: generated.id,
      initialMatch: initialMatch,
      통키다리No_final: finalId,
      idSource: idSource,
      generateError: generated.error || null,
      특이사항: row.특이사항 || null
    };
  });

  return refined;
}

/**
 * Generate summary statistics
 */
function generateSummary(refined) {
  const total = refined.length;
  const withOriginal = refined.filter(r => r.통키다리No_original).length;
  const withGenerated = refined.filter(r => r.통키다리No_generated).length;
  const matched = refined.filter(r => r.initialMatch === true).length;
  const mismatched = refined.filter(r => r.initialMatch === false).length;
  const noId = refined.filter(r => r.idSource === 'none').length;
  const fromOriginal = refined.filter(r => r.idSource === 'original').length;
  const fromGenerated = refined.filter(r => r.idSource === 'generated').length;
  const parseErrors = refined.filter(r => r.generateError).length;

  return {
    total,
    withOriginal,
    withGenerated,
    matched,
    mismatched,
    noId,
    fromOriginal,
    fromGenerated,
    parseErrors
  };
}

// Main
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node refine-yotongsa-json.js <input.json> [--output <path>]');
    process.exit(0);
  }

  const inputPath = path.resolve(process.cwd(), args[0]);
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx !== -1 && args[outputIdx + 1]
    ? path.resolve(process.cwd(), args[outputIdx + 1])
    : inputPath.replace('_raw.json', '_refined.json');

  if (!fs.existsSync(inputPath)) {
    console.error('File not found:', inputPath);
    process.exit(1);
  }

  console.log('Reading:', inputPath);
  const rawData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  console.log('Refining data...');
  const refined = refineData(rawData);
  const summary = generateSummary(refined);

  const output = {
    source: rawData.source,
    sheet: rawData.sheet,
    refinedAt: new Date().toISOString(),
    summary: summary,
    data: refined
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log('Saved:', outputPath);

  // Print summary
  console.log('\n=== Summary ===');
  console.log('Total rows:', summary.total);
  console.log('With original ID:', summary.withOriginal);
  console.log('With generated ID:', summary.withGenerated);
  console.log('Matched (original = generated):', summary.matched);
  console.log('Mismatched:', summary.mismatched);
  console.log('Final ID from original:', summary.fromOriginal);
  console.log('Final ID from generated:', summary.fromGenerated);
  console.log('No ID (needs manual):', summary.noId);
  console.log('Parse errors:', summary.parseErrors);

  // Show mismatches
  if (summary.mismatched > 0) {
    console.log('\n=== Mismatched IDs ===');
    refined.filter(r => r.initialMatch === false).forEach(r => {
      console.log(`Row ${r.row}:`);
      console.log(`  요통사: ${r.요통사교재No}`);
      console.log(`  original: ${r.통키다리No_original}`);
      console.log(`  generated: ${r.통키다리No_generated}`);
    });
  }

  // Show no ID rows
  if (summary.noId > 0) {
    console.log('\n=== No ID (needs manual) ===');
    refined.filter(r => r.idSource === 'none').forEach(r => {
      console.log(`Row ${r.row}: page ${r.페이지}, problem ${r.문항}`);
      console.log(`  요통사: ${r.요통사교재No}`);
      console.log(`  error: ${r.generateError}`);
    });
  }

  // Show parse errors
  if (summary.parseErrors > 0) {
    console.log('\n=== Parse Errors ===');
    refined.filter(r => r.generateError && r.generateError !== 'empty_input').forEach(r => {
      console.log(`Row ${r.row}: ${r.generateError}`);
      console.log(`  요통사: ${r.요통사교재No}`);
    });
  }
}

module.exports = { generateProblemId, refineData, generateSummary };
