const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Life Ethics chapter mapping based on actual DB chapters
const lifeEthicsChapterMapping = {
  '정의의 의미와 실질적 기준': 'decba78b-c5b4-4fbb-a2fe-1a07641a35ae',
  '다양한 정의관의 특징과 적용': '0ac063bc-5fdd-4095-abbb-e3863972e4f4',
  '인권의 의미와 현대 사회의 인권': 'e533a439-9219-416e-8d4f-61cc52574176',
  '인권 보장을 위한 헌법의 역할과 시민 참여': 'a0631a6e-8db4-4b0b-8ba4-86de8cd48cf0',
  // Fallback
  'default': 'decba78b-c5b4-4fbb-a2fe-1a07641a35ae'
};

function getLifeEthicsChapterId(subChapterName) {
  if (lifeEthicsChapterMapping[subChapterName]) {
    return lifeEthicsChapterMapping[subChapterName];
  }
  
  console.warn(`No chapter mapping found for: ${subChapterName}, using default`);
  return lifeEthicsChapterMapping.default;
}

function mapDifficulty(difficulty) {
  const validDifficulties = ['상', '중', '하'];
  return validDifficulties.includes(difficulty) ? difficulty : '중';
}

function extractTags(tagString) {
  if (!tagString) return [];
  
  return tagString.split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .filter(tag => tag !== '생활과 윤리'); // Remove subject name as it's not a tag
}

function determineProblemType(source) {
  if (!source) return 'N제';
  
  const sourceStr = source.toString().toLowerCase();
  if (sourceStr.includes('수능') || sourceStr.includes('모평') || sourceStr.includes('학평')) {
    return '기출문제';
  }
  
  return 'N제';
}

function generateTimestamp(index) {
  const baseTime = new Date('2024-08-20T10:00:00Z');
  const timestamp = new Date(baseTime.getTime() + (index * 60000)); // 1 minute apart
  return timestamp.toISOString();
}

function checkImageExists(imageNumber, dataDir) {
  // Get all files in data directory
  const files = fs.readdirSync(dataDir);
  
  // Use encoding-safe approach - match by number pattern and structure
  let problemImage = null;
  let answerImage = null;
  
  files.forEach(file => {
    // Skip non-png files
    if (!file.endsWith('.png')) return;
    
    // Use a more robust pattern that handles encoding issues
    // Look for exact number match with negative lookahead to prevent substring matches
    const exactNumberPattern = new RegExp(`(^|[^0-9])${imageNumber}(?![0-9])`);
    
    // Check if this file matches our number
    if (exactNumberPattern.test(file)) {
      // Check if it's an answer file (contains -a)
      if (file.includes('-a')) {
        answerImage = file;
      } else {
        // It's a problem file
        problemImage = file;
      }
    }
  });
  
  return {
    problemExists: !!problemImage,
    answerExists: !!answerImage,
    bothExist: !!problemImage && !!answerImage,
    problemFilename: problemImage,
    answerFilename: answerImage
  };
}

function convertLifeEthicsExcelToJson(excelPath, outputPath) {
  try {
    console.log('🔄 Reading Excel file...');
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`📊 Total rows in Excel: ${data.length}`);
    
    // All rows are already life ethics since we're using the filtered file
    const lifeEthicsRows = data.filter((row, index) => {
      if (index === 0) return false; // Skip header
      return true; // All rows in 생윤-only.xlsx are life ethics
    });
    
    console.log(`🎯 Found ${lifeEthicsRows.length} life ethics entries`);
    
    // Check which problems have images
    const dataDir = path.join(__dirname, '../data');
    const problemsWithImages = [];
    const problemsWithoutImages = [];
    
    lifeEthicsRows.forEach(row => {
      const imageIndex = row[12]; // Column M has the 1-115 index for image files
      if (!imageIndex) return; // Skip rows without image index
      
      const imageCheck = checkImageExists(imageIndex, dataDir);
      
      if (imageCheck.bothExist) {
        problemsWithImages.push({
          ...row,
          _imageFiles: {
            problemFilename: imageCheck.problemFilename,
            answerFilename: imageCheck.answerFilename
          }
        });
      } else {
        problemsWithoutImages.push({
          id: row[0], // Original ID from Excel
          imageIndex: imageIndex, // 1-115 index
          problemExists: imageCheck.problemExists,
          answerExists: imageCheck.answerExists,
          problemFilename: imageCheck.problemFilename,
          answerFilename: imageCheck.answerFilename
        });
      }
    });
    
    console.log(`✅ Problems with images: ${problemsWithImages.length}`);
    console.log(`❌ Problems without images: ${problemsWithoutImages.length}`);
    
    if (problemsWithoutImages.length > 0) {
      console.log('Missing images for indices:', problemsWithoutImages.map(p => `${p.imageIndex} (ID:${p.id})`).slice(0, 10).join(', '));
    }
    
    // Convert to problem format
    const problems = problemsWithImages.map((row, index) => {
      const id = row[0];              // Column 0: ID
      const volume = row[3];          // Column 3: 통합사회2
      const chapter = row[4];         // Column 4: Main chapter  
      const subChapter = row[5];      // Column 5: Sub-chapter (maps to DB chapters)
      const category = row[6];        // Column 6: 생활과 윤리 (subject category)
      const difficulty = row[7];      // Column 7: 상,중,하
      const successRate = row[8];     // Column 8: Success rate %
      const isFromPastExam = row[9];  // Column 9: Y/N
      const tags = row[10];           // Column 10: Tags
      const source = row[11];         // Column 11: Source
      
      const timestamp = generateTimestamp(index);
      
      // Use actual filenames from image check
      const actualProblemFile = row._imageFiles.problemFilename;
      const actualAnswerFile = row._imageFiles.answerFilename;
      
      return {
        // Database fields
        filename: actualProblemFile, // Use actual image filename
        problem_filename: actualProblemFile, // Problem image
        answer_filename: actualAnswerFile, // Answer image  
        chapter_id: getLifeEthicsChapterId(subChapter), // Map sub-chapter to DB UUID
        difficulty: mapDifficulty(difficulty),
        problem_type: determineProblemType(source),
        correct_rate: successRate || null,
        source: source || null,
        tags: extractTags(tags),
        answer: null, // Multiple choice answer not provided
        created_at: timestamp,
        updated_at: timestamp,
        
        // For upload script processing
        related_subjects: ['생활과 윤리'], // Creates problem_subjects relation
        
        // Reference data
        _metadata: {
          excel_id: id,
          image_index: row[12], // Column M: 1-115 index
          volume,
          chapter,
          sub_chapter: subChapter,
          is_from_past_exam: isFromPastExam,
          original_problem_filename: actualProblemFile,
          original_answer_filename: actualAnswerFile
        }
      };
    });
    
    // Create metadata structure
    const metadata = {
      problems,
      metadata: {
        total_problems: problems.length,
        source: 'Excel import - 생활과 윤리',
        subjects: [
          { id: '7ec63358-5e6b-49be-89a4-8b5639f3f9c0', name: '통합사회 2' }
        ],
        chapters: [
          { id: 'decba78b-c5b4-4fbb-a2fe-1a07641a35ae', name: '정의의 의미와 실질적 기준' },
          { id: '0ac063bc-5fdd-4095-abbb-e3863972e4f4', name: '다양한 정의관의 특징과 적용' },
          { id: 'e533a439-9219-416e-8d4f-61cc52574176', name: '인권의 의미와 현대 사회의 인권' },
          { id: 'a0631a6e-8db4-4b0b-8ba4-86de8cd48cf0', name: '인권 보장을 위한 헌법의 역할과 시민 참여' }
        ],
        difficulties: ['하', '중', '상'],
        problem_types: ['기출문제', 'N제'],
        created_at: new Date().toISOString(),
        version: '1.0-생활과윤리',
        notes: 'Converted from 통합사회 문제 은행 프로젝트_생활과 윤리.xlsx - Only problems with images included'
      }
    };
    
    // Write JSON file
    console.log('💾 Writing JSON file...');
    fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2), 'utf8');
    
    // Generate statistics
    console.log('\\n📈 Conversion Statistics:');
    console.log(`✅ Total problems converted: ${problems.length}`);
    
    const difficultyStats = problems.reduce((acc, p) => {
      acc[p.difficulty] = (acc[p.difficulty] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Difficulty distribution:', difficultyStats);
    
    const chapterStats = problems.reduce((acc, p) => {
      const chapterName = Object.keys(lifeEthicsChapterMapping).find(key => 
        lifeEthicsChapterMapping[key] === p.chapter_id
      );
      acc[chapterName || p.chapter_id] = (acc[chapterName || p.chapter_id] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Chapter distribution:', chapterStats);
    
    const typeStats = problems.reduce((acc, p) => {
      acc[p.problem_type] = (acc[p.problem_type] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Problem type distribution:', typeStats);
    
    console.log(`\\n🎉 Conversion complete! Output saved to: ${outputPath}`);
    console.log(`📝 Problems with missing images: ${problemsWithoutImages.length}`);
    
    return metadata;
    
  } catch (error) {
    console.error('❌ Error during conversion:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const excelPath = path.join(__dirname, '../data/source/생윤-only.xlsx');
  const outputPath = path.join(__dirname, '../data/processed/생윤-problems-metadata.json');
  
  convertLifeEthicsExcelToJson(excelPath, outputPath);
}

module.exports = { convertLifeEthicsExcelToJson };