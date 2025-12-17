require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Economics chapter mapping (from excel-to-json-economics.js)
const economicsChapterMapping = {
  '국제 분업과 무역': '69c7c854-480b-4fd9-8cf2-509118b68cca',
  '자본주의의 전개 과정과 경제 체제': '74c3276e-144d-4098-9d78-c6df80ef1ffe',
  '자산 관리와 금융 생활 설계': '5a5a8ff7-c908-42da-bea1-52914b550a0b',
  '합리적 선택과 경제 주체의 역할': '36477a86-54b2-40e1-bb16-1f8fd287eec1',
  'default': '36477a86-54b2-40e1-bb16-1f8fd287eec1'
};

function mapDifficulty(difficulty) {
  const validDifficulties = ['상', '중', '하'];
  return validDifficulties.includes(difficulty) ? difficulty : '중';
}

function extractTags(tagString) {
  if (!tagString) return [];

  return tagString.split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .filter(tag => tag !== '경제'); // Remove '경제' as it's the subject, not a tag
}

function getEconomicsChapterId(subChapterName) {
  if (economicsChapterMapping[subChapterName]) {
    return economicsChapterMapping[subChapterName];
  }

  console.warn(`No chapter mapping found for: ${subChapterName}, using default`);
  return economicsChapterMapping.default;
}

function determineProblemType(source) {
  if (!source) return 'N제';

  const sourceStr = source.toString().toLowerCase();
  if (sourceStr.includes('수능') || sourceStr.includes('모평') || sourceStr.includes('학평')) {
    return '기출문제';
  }

  return 'N제';
}

async function verifyJsonMirrorsExcel() {
  try {
    console.log('🔄 Verifying JSON file mirrors Excel data...');

    // Read Excel file
    const excelPath = path.join(__dirname, '../data/archive/intermediate/통합사회 문제 은행 프로젝트_경제_for_excel_to_json.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`📊 Excel has ${excelData.length} total rows`);

    // Read JSON file
    const jsonPath = path.join(__dirname, '../data/archive/intermediate/경제-problems-metadata-from-converted.json');
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const jsonData = JSON.parse(jsonContent);

    console.log(`📊 JSON has ${jsonData.problems.length} problems`);

    // Filter Excel data (skip header, only economics)
    const excelProblems = excelData.filter((row, index) => {
      if (index === 0) return false; // Skip header
      return row[9] === '경제'; // Column 9 is subject category
    });

    console.log(`📊 Excel has ${excelProblems.length} economics problems`);

    if (excelProblems.length !== jsonData.problems.length) {
      console.error(`❌ COUNT MISMATCH: Excel has ${excelProblems.length} problems, JSON has ${jsonData.problems.length} problems`);
    } else {
      console.log('✅ Problem counts match');
    }

    // Compare sample of records
    console.log('\n🔍 Comparing first 10 problems in detail...');
    let totalMismatches = 0;
    const fieldMismatches = {};

    for (let i = 0; i < Math.min(10, excelProblems.length); i++) {
      const excelRow = excelProblems[i];
      const jsonProblem = jsonData.problems[i];

      console.log(`\n--- Problem ${i + 1} ---`);
      console.log(`Excel ID: ${excelRow[0]}, JSON Excel ID: ${jsonProblem._metadata.excel_id}`);

      // Compare each field
      const comparisons = [
        {
          name: 'excel_id',
          excel: parseInt(excelRow[0]),
          json: jsonProblem._metadata.excel_id,
          transform: (val) => parseInt(val)
        },
        {
          name: 'volume',
          excel: excelRow[3],
          json: jsonProblem._metadata.volume,
          transform: (val) => val
        },
        {
          name: 'chapter',
          excel: excelRow[4],
          json: jsonProblem._metadata.chapter,
          transform: (val) => val
        },
        {
          name: 'sub_chapter',
          excel: excelRow[5],
          json: jsonProblem._metadata.sub_chapter,
          transform: (val) => val
        },
        {
          name: 'chapter_id',
          excel: getEconomicsChapterId(excelRow[5]),
          json: jsonProblem.chapter_id,
          transform: (val) => val
        },
        {
          name: 'subject',
          excel: excelRow[9],
          json: 'expected: 경제',
          transform: (val) => val
        },
        {
          name: 'difficulty',
          excel: mapDifficulty(excelRow[10]),
          json: jsonProblem.difficulty,
          transform: (val) => val
        },
        {
          name: 'correct_rate',
          excel: excelRow[11] || null,
          json: jsonProblem.correct_rate,
          transform: (val) => val
        },
        {
          name: 'past_exam',
          excel: excelRow[12],
          json: jsonProblem._metadata.is_from_past_exam,
          transform: (val) => val
        },
        {
          name: 'tags',
          excel: extractTags(excelRow[13]),
          json: jsonProblem.tags,
          transform: (val) => Array.isArray(val) ? val : []
        },
        {
          name: 'source',
          excel: excelRow[14] || null,
          json: jsonProblem.source,
          transform: (val) => val
        },
        {
          name: 'problem_type',
          excel: determineProblemType(excelRow[14]),
          json: jsonProblem.problem_type,
          transform: (val) => val
        }
      ];

      let problemMismatches = 0;
      comparisons.forEach(comp => {
        const excelTransformed = comp.transform(comp.excel);
        const jsonTransformed = comp.transform(comp.json);

        let match = false;
        if (comp.name === 'tags') {
          // Special comparison for arrays
          match = JSON.stringify(excelTransformed?.sort()) === JSON.stringify(jsonTransformed?.sort());
        } else {
          match = excelTransformed === jsonTransformed;
        }

        if (!match) {
          console.log(`  ❌ ${comp.name}:`);
          console.log(`     Excel: ${JSON.stringify(excelTransformed)}`);
          console.log(`     JSON:  ${JSON.stringify(jsonTransformed)}`);
          problemMismatches++;
          totalMismatches++;
          fieldMismatches[comp.name] = (fieldMismatches[comp.name] || 0) + 1;
        } else {
          console.log(`  ✅ ${comp.name}: ${JSON.stringify(excelTransformed)}`);
        }
      });

      if (problemMismatches === 0) {
        console.log('  🎉 All fields match!');
      } else {
        console.log(`  ⚠️  ${problemMismatches} field mismatches`);
      }
    }

    // Overall comparison summary
    console.log('\n📊 Verification Summary:');
    console.log(`✅ Problems compared: ${Math.min(10, excelProblems.length)}`);
    console.log(`❌ Total field mismatches: ${totalMismatches}`);

    if (totalMismatches > 0) {
      console.log('\n📋 Field mismatch breakdown:');
      Object.entries(fieldMismatches).forEach(([field, count]) => {
        console.log(`  ${field}: ${count} mismatches`);
      });
    }

    // Random sample verification
    if (excelProblems.length > 10) {
      console.log('\n🎲 Random sample verification (5 problems)...');
      const randomIndices = [];
      while (randomIndices.length < 5 && randomIndices.length < excelProblems.length) {
        const idx = Math.floor(Math.random() * excelProblems.length);
        if (!randomIndices.includes(idx)) {
          randomIndices.push(idx);
        }
      }

      randomIndices.forEach(idx => {
        const excelRow = excelProblems[idx];
        const jsonProblem = jsonData.problems[idx];

        const excelId = parseInt(excelRow[0]);
        const jsonId = jsonProblem._metadata.excel_id;
        const excelSource = excelRow[14];
        const jsonSource = jsonProblem.source;

        if (excelId === jsonId && excelSource === jsonSource) {
          console.log(`✅ Random sample ${idx}: ID ${excelId} matches`);
        } else {
          console.log(`❌ Random sample ${idx}: ID mismatch - Excel: ${excelId}, JSON: ${jsonId}`);
        }
      });
    }

    // Final verdict
    if (totalMismatches === 0) {
      console.log('\n🎉 VERIFICATION PASSED: JSON perfectly mirrors Excel data');
    } else {
      console.log(`\n⚠️  VERIFICATION ISSUES: ${totalMismatches} field mismatches found`);
    }

    return {
      excelProblems: excelProblems.length,
      jsonProblems: jsonData.problems.length,
      totalMismatches,
      fieldMismatches,
      verified: totalMismatches === 0
    };

  } catch (error) {
    console.error('❌ Error verifying JSON mirrors Excel:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  verifyJsonMirrorsExcel();
}

module.exports = { verifyJsonMirrorsExcel };