const fs = require('fs');
const path = require('path');

// Configuration for generating realistic dummy data
const subjects = ['통합사회'];
const chapters = ['1단원', '2단원', '3단원', '4단원', '5단원'];
const subchapters = ['1-1', '1-2', '1-3', '1-4', '2-1', '2-2', '2-3', '3-1', '3-2', '3-3', '4-1', '4-2', '4-3', '4-4', '5-1'];
const difficulties = ['하', '중', '상'];
const examTypes = ['학평', '모평', '수능'];
const years = [2023, 2024];
const months = [3, 6, 9, 11];
const categories = ['개념', '분석', '추론', '종합', '이해', '적용', '용어'];
const tags = ['개념이해', '기본', '분석', '사회현상', '추론', '고급', '용어', '중급', '종합', '이해', '적용', '현대사회', '복잡성', '통합적사고'];

// Title templates for variety
const titleTemplates = [
  '기본 {category} 문제',
  '{difficulty} {category} 문제',
  '{exam_type} {category} 문제',
  '{chapter} {category} 문제',
  '사회 현상 {category} 문제',
  '현대 사회 {category} 문제',
  '복합 {category} 문제',
  '통합적 {category} 문제'
];

// Description templates
const descriptionTemplates = [
  '통합사회 {category} 능력을 평가하는 문제입니다.',
  '{difficulty} 수준의 {category} 문제입니다.',
  '{exam_type}에서 출제된 {category} 문제입니다.',
  '{chapter}의 {category} 개념을 다루는 문제입니다.',
  '현대 사회 현상을 {category}하는 문제입니다.',
  '복잡한 사회 현상을 {category}하는 문제입니다.',
  '여러 개념을 {category}하는 문제입니다.',
  '통합적 사고력을 요구하는 {category} 문제입니다.'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateTitle(category, difficulty, examType, chapter) {
  const template = getRandomElement(titleTemplates);
  return template
    .replace('{category}', category)
    .replace('{difficulty}', difficulty)
    .replace('{exam_type}', examType)
    .replace('{chapter}', chapter);
}

function generateDescription(category, difficulty, examType, chapter) {
  const template = getRandomElement(descriptionTemplates);
  return template
    .replace('{category}', category)
    .replace('{difficulty}', difficulty)
    .replace('{exam_type}', examType)
    .replace('{chapter}', chapter);
}

function getEstimatedTime(difficulty) {
  const baseTime = { '하': 3, '중': 6, '상': 9 };
  return baseTime[difficulty] + Math.floor(Math.random() * 3);
}

function getPoints(difficulty) {
  const basePoints = { '하': 3, '중': 4, '상': 5 };
  return basePoints[difficulty];
}

function generateProblem(id) {
  const subject = getRandomElement(subjects);
  const chapter = getRandomElement(chapters);
  const subchapter = getRandomElement(subchapters);
  const difficulty = getRandomElement(difficulties);
  const examType = getRandomElement(examTypes);
  const year = getRandomElement(years);
  const month = getRandomElement(months);
  const category = getRandomElement(categories);
  const problemTags = getRandomElements(tags, 2 + Math.floor(Math.random() * 2));
  
  const title = generateTitle(category, difficulty, examType, chapter);
  const description = generateDescription(category, difficulty, examType, chapter);
  const estimatedTime = getEstimatedTime(difficulty);
  const points = getPoints(difficulty);
  
  // Generate timestamp with slight variations
  const baseTime = new Date('2024-01-15T10:00:00Z');
  const createdTime = new Date(baseTime.getTime() + (id - 1) * 60000); // 1 minute apart
  
  return {
    id,
    filename: `problem_${String(id).padStart(3, '0')}.png`,
    title,
    subject,
    chapter,
    subchapter,
    difficulty,
    exam_type: examType,
    year,
    month,
    tags: problemTags,
    description,
    estimated_time: estimatedTime,
    points,
    category,
    is_active: true,
    created_at: createdTime.toISOString(),
    updated_at: createdTime.toISOString()
  };
}

function generateMetadata() {
  const problems = [];
  
  for (let i = 1; i <= 100; i++) {
    problems.push(generateProblem(i));
  }
  
  return {
    problems,
    metadata: {
      total_problems: 100,
      subjects,
      chapters,
      difficulties,
      exam_types: examTypes,
      years,
      categories,
      created_at: new Date().toISOString(),
      version: "1.0"
    }
  };
}

// Generate the metadata
const metadata = generateMetadata();

// Write to file
const outputPath = path.join(__dirname, '..', 'public', 'dummies', 'problems-metadata.json');
fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2), 'utf8');

console.log(`Generated metadata for ${metadata.problems.length} problems`);
console.log(`Output saved to: ${outputPath}`);

// Print some statistics
const problemDifficulties = metadata.problems.map(p => p.difficulty);
const problemExamTypes = metadata.problems.map(p => p.exam_type);
const problemCategories = metadata.problems.map(p => p.category);

console.log('\nStatistics:');
console.log('Difficulties:', problemDifficulties.reduce((acc, d) => { acc[d] = (acc[d] || 0) + 1; return acc; }, {}));
console.log('Exam Types:', problemExamTypes.reduce((acc, e) => { acc[e] = (acc[e] || 0) + 1; return acc; }, {}));
console.log('Categories:', problemCategories.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {}));
