const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Real database UUIDs mapped by sub-chapter names (소단원) from Excel
const chapterMapping = {
  // Map by exact sub-chapter names from Excel data
  '인권의 의미와 현대 사회의 인권': 'e533a439-9219-416e-8d4f-61cc52574176',
  '인권 보장을 위한 헌법의 역할과 시민참여': 'a0631a6e-8db4-4b0b-8ba4-86de8cd48cf0', // Excel version without space
  '인권 보장을 위한 헌법의 역할과 시민 참여': 'a0631a6e-8db4-4b0b-8ba4-86de8cd48cf0', // Normalized version with space
  '인권 문제의 양상과 해결 방안': '5ee9b9bc-5268-45e0-8f6f-c315e2790808',
  // Default fallback
  'default': 'e533a439-9219-416e-8d4f-61cc52574176'
};

function getChapterId(chapterName, subChapterName) {
  // Normalize subChapter name: fix 시민참여 → 시민 참여
  const normalizedSubChapter = subChapterName ? subChapterName.replace('시민참여', '시민 참여') : '';
  
  // Primary mapping: by sub-chapter name (소단원) which matches DB chapter names
  if (chapterMapping[subChapterName]) {
    return chapterMapping[subChapterName];
  }
  
  // Try with normalized name
  if (chapterMapping[normalizedSubChapter]) {
    return chapterMapping[normalizedSubChapter];
  }
  
  // Fallback: try main chapter name
  if (chapterMapping[chapterName]) {
    return chapterMapping[chapterName];
  }
  
  // Default to main 인권 related chapter
  console.warn(`No chapter mapping found for: ${chapterName} / ${subChapterName}, using default`);
  return chapterMapping.default;
}

function mapDifficulty(difficulty) {
  // Excel uses 상,중,하 - keep the same
  const validDifficulties = ['상', '중', '하'];
  return validDifficulties.includes(difficulty) ? difficulty : '중'; // Default to 중
}

function extractTags(tagString) {
  if (!tagString) return [];
  
  // Split by comma and clean up
  const tags = tagString.split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .filter(tag => tag !== '정치와 법'); // Remove '정치와 법' as it's not a tag but a subject
  
  return tags;
}

function determineProblemType(source) {
  if (!source) return 'N제';
  
  // Check if it's from 기출문제 (contains year and exam type keywords)
  const sourceStr = source.toString().toLowerCase();
  if (sourceStr.includes('수능') || sourceStr.includes('모평') || sourceStr.includes('학평')) {
    return '기출문제';
  }
  
  return 'N제';
}

function generateTimestamp(index) {
  // Generate timestamps starting from a base time, spaced 1 minute apart
  const baseTime = new Date('2024-08-19T10:00:00Z');
  const timestamp = new Date(baseTime.getTime() + (index * 60000)); // 1 minute apart
  return timestamp.toISOString();
}

function convertExcelToJson(excelPath, outputPath) {
  try {
    console.log('🔄 Reading Excel file...');
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`📊 Total rows in Excel: ${data.length}`);
    
    // Filter for 정치와 법 only, exclude header, and deduplicate
    const politicsAndLawRows = data.filter((row, index) => {
      if (index === 0) return false; // Skip header
      return row[6] === '정치와 법'; // Column 6 is '기존 사탐 범주'
    });
    
    console.log(`🎯 Found ${politicsAndLawRows.length} 정치와 법 entries`);
    
    // Deduplicate by ID (keep first occurrence)
    const seenIds = new Set();
    const uniqueRows = politicsAndLawRows.filter(row => {
      const id = row[0];
      if (seenIds.has(id)) {
        console.log(`⚠️  Skipping duplicate ID: ${id}`);
        return false;
      }
      seenIds.add(id);
      return true;
    });
    
    console.log(`✅ After deduplication: ${uniqueRows.length} unique entries`);
    
    // Convert to problem format
    const problems = uniqueRows.map((row, index) => {
      const [
        id,
        problemFilename,    // Column 1
        answerFilename,     // Column 2  
        volume,             // Column 3: 통합사회 1권/2권
        chapter,            // Column 4: 대단원
        subChapter,         // Column 5: 소단원 (자세한)
        category,           // Column 6: 기존 사탐 범주
        difficulty,         // Column 7: 내신 난이도 (상,중,하)
        successRate,        // Column 8: 정답율%
        isFromPastExam,     // Column 9: 기출문제 유무 (Y/N)
        tags,               // Column 10: 태그 (쉼표구분)
        source              // Column 11: 출처
      ] = row;
      
      const timestamp = generateTimestamp(index);
      
      return {
        // Database fields (matching problems table structure)
        filename: `정법${id}.png`, // Main image filename (matches upload script expectation)
        problem_filename: `정법${id}.png`, // Problem image
        answer_filename: `정법${id}-a.png`, // Answer image  
        chapter_id: getChapterId(chapter, subChapter), // Real UUID
        difficulty: mapDifficulty(difficulty),
        problem_type: determineProblemType(source),
        correct_rate: successRate || null, // Success rate percentage
        source: source || null, // Source information
        tags: extractTags(tags), // Array of tags for related_subjects
        answer: null, // Multiple choice answer (not provided in Excel)
        created_at: timestamp,
        updated_at: timestamp,
        
        // For upload script processing
        related_subjects: ['정치와 법'], // This will create problem_subjects relation
        
        // Reference data (not inserted to DB)
        _metadata: {
          excel_id: id,
          volume,
          chapter,
          sub_chapter: subChapter,
          is_from_past_exam: isFromPastExam
        }
      };
    });
    
    // Create metadata structure matching existing format
    const metadata = {
      problems,
      metadata: {
        total_problems: problems.length,
        source: 'Excel import - 정치와 법',
        subjects: [
          { id: '7ec63358-5e6b-49be-89a4-8b5639f3f9c0', name: '통합사회 2' },
          { id: '5a4e161d-33d4-4256-a344-11dd122a25ce', name: '정치와 법' }
        ],
        difficulties: ['하', '중', '상'],
        problem_types: ['기출문제', 'N제'],
        created_at: new Date().toISOString(),
        version: '1.0-정법',
        notes: 'Converted from 통합사회 문제 은행 프로젝트_정법.xlsx - 정치와 법 only'
      }
    };
    
    // Write JSON file
    console.log('💾 Writing JSON file...');
    fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2), 'utf8');
    
    // Generate statistics
    console.log('\n📈 Conversion Statistics:');
    console.log(`✅ Total problems converted: ${problems.length}`);
    
    const difficultyStats = problems.reduce((acc, p) => {
      acc[p.difficulty] = (acc[p.difficulty] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Difficulty distribution:', difficultyStats);
    
    const problemTypeStats = problems.reduce((acc, p) => {
      acc[p.problem_type] = (acc[p.problem_type] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Problem type distribution:', problemTypeStats);
    
    const chapterStats = problems.reduce((acc, p) => {
      acc[p.chapter_id] = (acc[p.chapter_id] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Chapter UUID distribution:', chapterStats);
    
    // Show detailed chapter mapping verification
    console.log('\n🔍 Chapter Mapping Verification:');
    const chapterNames = {
      'e533a439-9219-416e-8d4f-61cc52574176': '인권의 의미와 현대 사회의 인권',
      'a0631a6e-8db4-4b0b-8ba4-86de8cd48cf0': '인권 보장을 위한 헌법의 역할과 시민 참여',
      '5ee9b9bc-5268-45e0-8f6f-c315e2790808': '인권 문제의 양상과 해결 방안'
    };
    Object.entries(chapterStats).forEach(([uuid, count]) => {
      console.log(`  ${uuid} (${chapterNames[uuid] || 'Unknown'}) → ${count} problems`);
    });
    
    console.log(`\n🎉 Conversion complete! Output saved to: ${outputPath}`);
    return metadata;
    
  } catch (error) {
    console.error('❌ Error during conversion:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const excelPath = '/Users/joonnam/Downloads/통합사회 문제 은행 프로젝트_정법.xlsx';
  const outputPath = path.join(__dirname, '정법-problems-metadata.json');
  
  convertExcelToJson(excelPath, outputPath);
}

module.exports = { convertExcelToJson };