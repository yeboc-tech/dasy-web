const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Economics chapter mapping based on existing DB chapters
const economicsChapterMapping = {
  '국제 분업과 무역': '69c7c854-480b-4fd9-8cf2-509118b68cca',
  '자본주의의 전개 과정과 경제 체제': '74c3276e-144d-4098-9d78-c6df80ef1ffe', 
  '자산 관리와 금융 생활 설계': '5a5a8ff7-c908-42da-bea1-52914b550a0b',
  '합리적 선택과 경제 주체의 역할': '36477a86-54b2-40e1-bb16-1f8fd287eec1',
  // Fallback
  'default': '36477a86-54b2-40e1-bb16-1f8fd287eec1'
};

function getEconomicsChapterId(subChapterName) {
  if (economicsChapterMapping[subChapterName]) {
    return economicsChapterMapping[subChapterName];
  }
  
  console.warn(`No chapter mapping found for: ${subChapterName}, using default`);
  return economicsChapterMapping.default;
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
    .filter(tag => tag !== '경제'); // Remove '경제' as it's the subject, not a tag
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
  
  // Look for problem image - handle both simple and complex names
  const problemPattern = new RegExp(`^경제${imageNumber}([^-a].*)?\.png$`);
  const answerPattern = new RegExp(`^경제${imageNumber}-a\.png$`);
  
  const problemImage = files.find(file => problemPattern.test(file));
  const answerImage = files.find(file => answerPattern.test(file));
  
  return {
    problemExists: !!problemImage,
    answerExists: !!answerImage,
    bothExist: !!problemImage && !!answerImage,
    problemFilename: problemImage,
    answerFilename: answerImage
  };
}

function convertEconomicsExcelToJson(excelPath, outputPath) {
  try {
    console.log('🔄 Reading Excel file...');
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`📊 Total rows in Excel: ${data.length}`);
    
    // Filter for economics only and exclude header
    const economicsRows = data.filter((row, index) => {
      if (index === 0) return false; // Skip header
      return row[9] === '경제'; // Column 9 is subject category
    });
    
    console.log(`🎯 Found ${economicsRows.length} economics entries`);
    
    // Check which problems have images
    const dataDir = path.join(__dirname, '../public/data');
    const problemsWithImages = [];
    const problemsWithoutImages = [];
    
    economicsRows.forEach(row => {
      const id = row[0];
      if (!id) return; // Skip rows without ID
      
      const imageCheck = checkImageExists(id, dataDir);
      
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
          id: id,
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
      console.log('Missing images for IDs:', problemsWithoutImages.map(p => p.id).slice(0, 10).join(', '));
    }
    
    // Convert to problem format
    const problems = problemsWithImages.map((row, index) => {
      const id = row[0];              // Column 0: ID
      const volume = row[3];          // Column 3: 통합사회2
      const chapter = row[4];         // Column 4: 시장 경제와 지속가능발전  
      const subChapter = row[5];      // Column 5: Sub-chapter (maps to DB chapters)
      const category = row[9];        // Column 9: 경제 (subject category)
      const difficulty = row[10];     // Column 10: 상,중,하
      const successRate = row[11];    // Column 11: Success rate %
      const isFromPastExam = row[12]; // Column 12: Y/N
      const tags = row[13];           // Column 13: Tags
      const source = row[14];         // Column 14: Source
      
      const timestamp = generateTimestamp(index);
      
      // Use actual filenames from image check
      const actualProblemFile = row._imageFiles.problemFilename;
      const actualAnswerFile = row._imageFiles.answerFilename;
      
      return {
        // Database fields
        filename: actualProblemFile, // Use actual image filename
        problem_filename: actualProblemFile, // Problem image
        answer_filename: actualAnswerFile, // Answer image  
        chapter_id: getEconomicsChapterId(subChapter), // Map sub-chapter to DB UUID
        difficulty: mapDifficulty(difficulty),
        problem_type: determineProblemType(source),
        correct_rate: successRate || null,
        source: source || null,
        tags: extractTags(tags),
        answer: null, // Multiple choice answer not provided
        created_at: timestamp,
        updated_at: timestamp,
        
        // For upload script processing
        related_subjects: ['경제'], // Creates problem_subjects relation
        
        // Reference data
        _metadata: {
          excel_id: id,
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
        source: 'Excel import - 경제',
        subjects: [
          { id: '7ec63358-5e6b-49be-89a4-8b5639f3f9c0', name: '통합사회 2' }
        ],
        chapters: [
          { id: '69c7c854-480b-4fd9-8cf2-509118b68cca', name: '국제 분업과 무역' },
          { id: '74c3276e-144d-4098-9d78-c6df80ef1ffe', name: '자본주의의 전개 과정과 경제 체제' },
          { id: '5a5a8ff7-c908-42da-bea1-52914b550a0b', name: '자산 관리와 금융 생활 설계' },
          { id: '36477a86-54b2-40e1-bb16-1f8fd287eec1', name: '합리적 선택과 경제 주체의 역할' }
        ],
        difficulties: ['하', '중', '상'],
        problem_types: ['기출문제', 'N제'],
        created_at: new Date().toISOString(),
        version: '1.0-경제',
        notes: 'Converted from 통합사회 문제 은행 프로젝트_경제.xlsx - Only problems with images included'
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
      const chapterName = Object.keys(economicsChapterMapping).find(key => 
        economicsChapterMapping[key] === p.chapter_id
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
  const excelPath = path.join(__dirname, '../public/data/통합사회 문제 은행 프로젝트_경제.xlsx');
  const outputPath = path.join(__dirname, '../public/data/경제-problems-metadata-new.json');
  
  convertEconomicsExcelToJson(excelPath, outputPath);
}

module.exports = { convertEconomicsExcelToJson };