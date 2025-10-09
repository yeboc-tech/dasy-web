require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { stringify } = require('csv-stringify/sync');

/**
 * Analyze verification CSV to generate status report
 */

const VERIFICATION_FILE = path.join(__dirname, '../public/data/modified/정법생윤경제-verification.csv');
const OUTPUT_FILE = path.join(__dirname, '../public/data/modified/검증상태보고서.csv');

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

async function analyzeVerification() {
  try {
    console.log('🔍 Analyzing verification file...\n');

    const { rows } = await readCSV(VERIFICATION_FILE);
    console.log(`📊 Total rows: ${rows.length}\n`);

    // Analysis 1: Count by subject
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 분석 1: 항목 개수');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const subjectStats = {};
    rows.forEach(row => {
      const subject = row['기존 사탐 범주'];
      if (!subjectStats[subject]) {
        subjectStats[subject] = {
          total: 0,
          matchedRows: 0,
          unmatchedRows: 0,
          uniqueMatched: new Set()
        };
      }
      subjectStats[subject].total++;

      const hasDBID = row['DB_ID'] && row['DB_ID'].trim() !== '';
      if (hasDBID) {
        subjectStats[subject].matchedRows++;
        subjectStats[subject].uniqueMatched.add(row['DB_ID']);
      } else {
        subjectStats[subject].unmatchedRows++;
      }
    });

    console.log('전체 합계:', rows.length, '행');
    console.log('\n과목별:');
    Object.entries(subjectStats).forEach(([subject, stats]) => {
      console.log(`  ${subject}:`);
      console.log(`    컨텐츠팀 파일 행 수: ${stats.total}`);
      console.log(`    DB 매칭된 행 수: ${stats.matchedRows}`);
      console.log(`    DB 고유 항목 수: ${stats.uniqueMatched.size}`);
      console.log(`    DB 미매칭 행 수: ${stats.unmatchedRows}`);
    });

    // Analysis 2: Check for missing/duplicate indices per subject
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔢 분석 2: 순번 무결성 검사');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const indexIssues = {};

    Object.keys(subjectStats).forEach(subject => {
      const subjectRows = rows.filter(row => row['기존 사탐 범주'] === subject);
      const indices = subjectRows.map(row => parseInt(row['순번'])).filter(n => !isNaN(n));
      indices.sort((a, b) => a - b);

      const min = indices[0];
      const max = indices[indices.length - 1];

      // Check for duplicates
      const counts = {};
      indices.forEach(n => {
        counts[n] = (counts[n] || 0) + 1;
      });
      const duplicates = Object.entries(counts)
        .filter(([n, c]) => c > 1)
        .map(([n, c]) => `#${n} (${c} times)`);

      // Check for missing numbers
      const missing = [];
      for (let i = min; i <= max; i++) {
        if (!counts[i]) {
          missing.push(i);
        }
      }

      console.log(`${subject}:`);
      console.log(`  범위: ${min} - ${max}`);
      console.log(`  예상 개수: ${max - min + 1}`);
      console.log(`  실제 개수: ${indices.length}`);

      if (duplicates.length > 0) {
        console.log(`  ⚠️  중복: ${duplicates.join(', ')}`);
      } else {
        console.log(`  ✅ 중복 없음`);
      }

      if (missing.length > 0) {
        console.log(`  ⚠️  누락된 순번: ${missing.join(', ')}`);
      } else {
        console.log(`  ✅ 순번 연속`);
      }

      indexIssues[subject] = {
        range: `${min}-${max}`,
        expected: max - min + 1,
        actual: indices.length,
        duplicates: duplicates,
        missing: missing
      };
      console.log('');
    });

    // Analysis 3: Items not in DB
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ 분석 3: DB 미매칭 항목');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const missingInDB = rows.filter(row => !row['DB_ID'] || row['DB_ID'].trim() === '');

    console.log(`DB에 없는 항목: ${missingInDB.length}개\n`);

    if (missingInDB.length > 0) {
      console.log('상세 내용:');
      missingInDB.forEach(row => {
        console.log(`  - ${row['기존 사탐 범주']} #${row['순번']}`);
        console.log(`    출처: ${row['출처'] || '없음'}`);
        console.log(`    태그: ${row['태그 (쉼표구분)'] || '없음'}`);
        console.log('');
      });
    } else {
      console.log('✅ 모든 항목이 DB에 존재합니다!');
    }

    // Generate CSV report
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 CSV 보고서 생성 중');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const reportRows = [];

    // Summary section
    reportRows.push({
      구분: '요약',
      과목: '전체',
      항목: '컨텐츠팀 파일 총 행 수',
      값: rows.length,
      상세: ''
    });

    Object.entries(subjectStats).forEach(([subject, stats]) => {
      reportRows.push({
        구분: '요약',
        과목: subject,
        항목: '컨텐츠팀 파일 행 수',
        값: stats.total,
        상세: ''
      });
      reportRows.push({
        구분: '요약',
        과목: subject,
        항목: 'DB 매칭된 행 수',
        값: stats.matchedRows,
        상세: stats.matchedRows !== stats.uniqueMatched.size ? `(고유 항목 ${stats.uniqueMatched.size}개)` : ''
      });
      reportRows.push({
        구분: '요약',
        과목: subject,
        항목: 'DB 미매칭 행 수',
        값: stats.unmatchedRows,
        상세: ''
      });
    });

    // Index integrity section
    Object.entries(indexIssues).forEach(([subject, issues]) => {
      reportRows.push({
        구분: '순번무결성',
        과목: subject,
        항목: '순번 범위',
        값: issues.range,
        상세: ''
      });
      reportRows.push({
        구분: '순번무결성',
        과목: subject,
        항목: '예상 개수',
        값: issues.expected,
        상세: ''
      });
      reportRows.push({
        구분: '순번무결성',
        과목: subject,
        항목: '실제 개수',
        값: issues.actual,
        상세: ''
      });
      reportRows.push({
        구분: '순번무결성',
        과목: subject,
        항목: '중복 개수',
        값: issues.duplicates.length,
        상세: issues.duplicates.join(', ')
      });
      reportRows.push({
        구분: '순번무결성',
        과목: subject,
        항목: '누락된 순번 개수',
        값: issues.missing.length,
        상세: issues.missing.join(', ')
      });
    });

    // Missing in DB section
    missingInDB.forEach(row => {
      reportRows.push({
        구분: 'DB미매칭',
        과목: row['기존 사탐 범주'],
        항목: `순번 #${row['순번']}`,
        값: '',
        상세: `출처: ${row['출처'] || '없음'} | 태그: ${row['태그 (쉼표구분)'] || '없음'}`
      });
    });

    const csvContent = stringify(reportRows, {
      header: true,
      columns: ['구분', '과목', '항목', '값', '상세'],
      quoted: true
    });

    fs.writeFileSync(OUTPUT_FILE, csvContent, 'utf8');
    console.log(`✅ 보고서 저장됨: ${OUTPUT_FILE}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 분석 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      totalItems: rows.length,
      subjectStats,
      indexIssues,
      missingInDB: missingInDB.length,
      reportFile: OUTPUT_FILE
    };

  } catch (error) {
    console.error('❌ Error analyzing verification file:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  analyzeVerification();
}

module.exports = { analyzeVerification };
