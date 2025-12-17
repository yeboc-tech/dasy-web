require('dotenv').config();
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function convertEconomicsToExcelToJsonFormat() {
  console.log('🔄 Converting 통합사회 문제 은행 프로젝트_경제.xlsx to excel-to-json-economics.js compatible format...');

  const dataDir = path.join(__dirname, '../data');
  const originalExcelPath = path.join(dataDir, '통합사회 문제 은행 프로젝트_경제.xlsx');
  const outputExcelPath = path.join(dataDir, '통합사회 문제 은행 프로젝트_경제_for_excel_to_json.xlsx');

  // Read original Excel file
  console.log('📖 Reading original Excel file...');
  const workbook = xlsx.readFile(originalExcelPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  console.log(`📊 Found ${rawData.length} rows in original Excel`);

  // Find header row
  let headerRowIndex = -1;
  let headers = [];

  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && Array.isArray(row) && row.length > 0) {
      const rowStr = row.join('').toLowerCase();
      if (rowStr.includes('문제') || rowStr.includes('정답') || rowStr.includes('대단원')) {
        headerRowIndex = i;
        headers = row.map(h => h ? h.toString().trim() : '');
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    console.error('❌ Could not find header row');
    return;
  }

  console.log(`📋 Header row found at index ${headerRowIndex}`);
  console.log(`📋 Original headers: ${headers.slice(0, 5).join(' | ')}...`);

  // Find column indices in original Excel
  const findColumnIndex = (searchTerms) => {
    for (let i = 0; i < headers.length; i++) {
      if (!headers[i]) continue; // Skip undefined/null headers
      const header = headers[i].toString().toLowerCase();
      if (searchTerms.some(term => header.includes(term))) {
        return i;
      }
    }
    return -1;
  };

  const majorUnitCol = findColumnIndex(['대단원', '대']);
  const subUnitCol = findColumnIndex(['소단원', '소']);
  const difficultyCol = findColumnIndex(['난이도', '내신']);
  const successRateCol = findColumnIndex(['정답률', '%']);
  const pastExamCol = findColumnIndex(['기출', 'y/n']);
  const tagsCol = findColumnIndex(['태그', '쉼표']);
  const sourceCol = findColumnIndex(['출처']);

  console.log('📍 Column mapping:');
  console.log(`  대단원: ${majorUnitCol >= 0 ? majorUnitCol : 'NOT FOUND'}`);
  console.log(`  소단원: ${subUnitCol >= 0 ? subUnitCol : 'NOT FOUND'}`);
  console.log(`  난이도: ${difficultyCol >= 0 ? difficultyCol : 'NOT FOUND'}`);

  // Create new Excel data in the format expected by excel-to-json-economics.js
  const newExcelData = [];

  // Header row (matching excel-to-json-economics.js expectations)
  newExcelData.push([
    'ID',           // Column 0: Problem number
    '문제파일명',    // Column 1: Problem filename (will be blank)
    '정답파일명',    // Column 2: Answer filename (will be blank)
    '통합사회권',    // Column 3: Volume (통합사회2)
    '대단원',       // Column 4: Major chapter
    '소단원',       // Column 5: Sub-chapter (maps to DB)
    '출제유형',     // Column 6
    '문제유형',     // Column 7
    '키워드',       // Column 8
    '과목',         // Column 9: Subject (경제)
    '난이도',       // Column 10: Difficulty
    '정답률',       // Column 11: Success rate
    '기출여부',     // Column 12: Past exam Y/N
    '태그',         // Column 13: Tags
    '출처',         // Column 14: Source
    '비고'          // Column 15: Notes
  ]);

  // Process data rows - only include rows with numeric values in column A
  const dataRows = rawData.slice(headerRowIndex + 1);
  let processedCount = 0;

  dataRows.forEach((row, index) => {
    if (!row || row.length === 0) return;

    // Check if column A (index 0) has a numeric value (this should be our problem ID)
    const columnAValue = row[0];
    if (!columnAValue || isNaN(parseInt(columnAValue))) return;

    const problemId = parseInt(columnAValue);

    // Extract data from the row
    const majorUnit = majorUnitCol >= 0 ? row[majorUnitCol] : '';
    const subUnit = subUnitCol >= 0 ? row[subUnitCol] : '';
    const difficulty = difficultyCol >= 0 ? row[difficultyCol] : '중';
    const successRate = successRateCol >= 0 ? row[successRateCol] : null;
    const pastExam = pastExamCol >= 0 ? row[pastExamCol] : 'N';
    const tags = tagsCol >= 0 ? row[tagsCol] : '';
    const source = sourceCol >= 0 ? row[sourceCol] : '';

    // Create row in excel-to-json-economics.js format
    newExcelData.push([
      problemId,          // Column 0: ID (problem number)
      '',                 // Column 1: 문제파일명 (blank - will be filled by excel-to-json script)
      '',                 // Column 2: 정답파일명 (blank - will be filled by excel-to-json script)
      '통합사회2',         // Column 3: 통합사회권
      majorUnit || '시장 경제와 지속가능발전',  // Column 4: 대단원
      subUnit || '합리적 선택과 경제 주체의 역할',  // Column 5: 소단원 (maps to DB)
      '',                 // Column 6: 출제유형
      '',                 // Column 7: 문제유형
      '',                 // Column 8: 키워드
      '경제',             // Column 9: 과목 (subject)
      difficulty,         // Column 10: 난이도
      successRate,        // Column 11: 정답률
      pastExam,           // Column 12: 기출여부
      tags,               // Column 13: 태그
      source,             // Column 14: 출처
      ''                  // Column 15: 비고
    ]);

    processedCount++;
  });

  console.log(`📊 Created Excel data with ${processedCount} problem entries`);

  // Create new workbook
  const newWorkbook = xlsx.utils.book_new();
  const newWorksheet = xlsx.utils.aoa_to_sheet(newExcelData);

  // Set column widths
  const colWidths = [
    { wch: 5 },   // ID
    { wch: 10 },  // 구분1
    { wch: 10 },  // 구분2
    { wch: 12 },  // 통합사회권
    { wch: 25 },  // 대단원
    { wch: 30 },  // 소단원
    { wch: 12 },  // 출제유형
    { wch: 12 },  // 문제유형
    { wch: 15 },  // 키워드
    { wch: 8 },   // 과목
    { wch: 8 },   // 난이도
    { wch: 10 },  // 정답률
    { wch: 8 },   // 기출여부
    { wch: 20 },  // 태그
    { wch: 20 },  // 출처
    { wch: 15 }   // 비고
  ];

  newWorksheet['!cols'] = colWidths;

  xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, '경제문제');

  // Save new Excel file
  xlsx.writeFile(newWorkbook, outputExcelPath);

  console.log(`✅ Converted Excel file created: ${outputExcelPath}`);
  console.log(`📊 Contains ${processedCount} problems compatible with excel-to-json-economics.js`);

  // Show sample of converted data
  console.log('\n📋 Sample converted data (first 5 problems):');
  newExcelData.slice(1, 6).forEach(row => {
    console.log(`  경제${row[0]}: ${row[4]} > ${row[5]} (${row[10]})`);
  });

  console.log(`\n💡 Now you can use this file with excel-to-json-economics.js:`);
  console.log(`   node scripts/excel-to-json-economics.js`);
  console.log(`   (Make sure to update the script to point to the new file path)`);

  return {
    originalFile: originalExcelPath,
    convertedFile: outputExcelPath,
    totalProblems: processedCount
  };
}

// Run conversion
if (require.main === module) {
  convertEconomicsToExcelToJsonFormat();
}

module.exports = { convertEconomicsToExcelToJsonFormat };