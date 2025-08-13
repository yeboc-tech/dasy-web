const fs = require('fs');
const path = require('path');

// Configuration based on your actual filtering needs
const subjects = [
  { id: 'subj-001', name: '통합사회 1' },
  { id: 'subj-002', name: '통합사회 2' }
];

const difficulties = ['하', '중', '상'];
const problemTypes = ['기출문제', 'N제']; // This matches your app's filter
const examTypes = ['학평', '모평', '수능']; // For 기출문제
const years = [2023, 2024];
const months = [3, 6, 9, 11];

// Related subjects that can be assigned to problems
const relatedSubjects = ['생활과 윤리', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와 법', '사회·문화'];

// Chapter structure with actual database chapter names (matching the SQL script exactly)
const chapters = [
  // 통합사회 1 sub-chapters (matching database structure exactly)
  { id: 'chap-001', name: '인간, 사회, 환경을 바라보는 다양한 관점', subject_id: 'subj-001' },
  { id: 'chap-002', name: '통합적 관점의 필요성과 적용', subject_id: 'subj-001' },
  { id: 'chap-003', name: '행복의 기준과 의미', subject_id: 'subj-001' },
  { id: 'chap-004', name: '행복한 삶을 실현하기 위한 조건', subject_id: 'subj-001' },
  { id: 'chap-005', name: '자연환경과 인간 생활', subject_id: 'subj-001' },
  { id: 'chap-006', name: '인간과 자연의 관계', subject_id: 'subj-001' },
  { id: 'chap-007', name: '환경 문제 해결을 위한 다양한 노력', subject_id: 'subj-001' },
  { id: 'chap-008', name: '세계의 다양한 문화권', subject_id: 'subj-001' },
  { id: 'chap-009', name: '문화 변동과 전통문화', subject_id: 'subj-001' },
  { id: 'chap-010', name: '문화 상대주의와 보편 윤리', subject_id: 'subj-001' },
  { id: 'chap-011', name: '다문화 사회와 문화적 다양성 존중', subject_id: 'subj-001' },
  { id: 'chap-012', name: '산업화와 도시화에 따른 변화', subject_id: 'subj-001' },
  { id: 'chap-013', name: '교통·통신 및 과학기술의 발달에 따른 변화', subject_id: 'subj-001' },
  { id: 'chap-014', name: '우리 지역의 공간 변화', subject_id: 'subj-001' },
  // 통합사회 2 sub-chapters (matching database structure exactly)
  { id: 'chap-015', name: '인권의 의미와 현대 사회의 인권', subject_id: 'subj-002' },
  { id: 'chap-016', name: '인권 보장을 위한 헌법의 역할과 시민 참여', subject_id: 'subj-002' },
  { id: 'chap-017', name: '인권 문제의 양상과 해결 방안', subject_id: 'subj-002' },
  { id: 'chap-018', name: '정의의 의미와 실질적 기준', subject_id: 'subj-002' },
  { id: 'chap-019', name: '다양한 정의관의 특징과 적용', subject_id: 'subj-002' },
  { id: 'chap-020', name: '다양한 불평등 현상과 정의로운 사회 실현', subject_id: 'subj-002' },
  { id: 'chap-021', name: '자본주의의 전개 과정과 경제 체제', subject_id: 'subj-002' },
  { id: 'chap-022', name: '합리적 선택과 경제 주체의 역할', subject_id: 'subj-002' },
  { id: 'chap-023', name: '자산 관리와 금융 생활 설계', subject_id: 'subj-002' },
  { id: 'chap-024', name: '국제 분업과 무역', subject_id: 'subj-002' },
  { id: 'chap-025', name: '세계화의 다양한 양상과 문제 해결 방안', subject_id: 'subj-002' },
  { id: 'chap-026', name: '평화의 의미와 국제 사회의 역할', subject_id: 'subj-002' },
  { id: 'chap-027', name: '남북 분단 및 동아시아 역사 갈등과 세계 평화를 위한 노력', subject_id: 'subj-002' },
  { id: 'chap-028', name: '세계의 인구 변화와 인구 문제', subject_id: 'subj-002' },
  { id: 'chap-029', name: '에너지 자원과 지속가능한 발전', subject_id: 'subj-002' },
  { id: 'chap-030', name: '미래 사회와 세계시민으로서의 삶', subject_id: 'subj-002' }
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
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
  // Only select chapters that belong to the selected subject
  const subjectChapters = chapters.filter(chapter => chapter.subject_id === subject.id);
  const chapter = getRandomElement(subjectChapters);
  const difficulty = getRandomElement(difficulties);
  const problemType = getRandomElement(problemTypes);
  
  // For 기출문제, we need exam_type, year, month
  // For N제, we don't need these
  const examType = problemType === '기출문제' ? getRandomElement(examTypes) : null;
  const year = problemType === '기출문제' ? getRandomElement(years) : null;
  const month = problemType === '기출문제' ? getRandomElement(months) : null;
  
  // Generate related subjects (1-3 subjects per problem)
  const numRelatedSubjects = Math.floor(Math.random() * 3) + 1; // 1-3 subjects
  const problemRelatedSubjects = getRandomElements(relatedSubjects, numRelatedSubjects);
  
  const estimatedTime = getEstimatedTime(difficulty);
  const points = getPoints(difficulty);
  
  // Generate timestamp with slight variations
  const baseTime = new Date('2024-01-15T10:00:00Z');
  const createdTime = new Date(baseTime.getTime() + (id - 1) * 60000); // 1 minute apart
  
  return {
    id,
    filename: `problem_${String(id).padStart(3, '0')}.png`,
    // Database fields (for insertion)
    subject_id: subject.id,
    chapter_id: chapter.id,
    // Display fields (for frontend)
    subject_name: subject.name,
    chapter_name: chapter.name,
    difficulty,
    problem_type: problemType,
    exam_type: examType,
    year,
    month,
    estimated_time: estimatedTime,
    points,
    related_subjects: problemRelatedSubjects, // Array of related subjects
    is_active: true,
    created_at: createdTime.toISOString(),
    updated_at: createdTime.toISOString()
  };
}

function generateMetadata() {
  const problems = [];
  
  for (let i = 1; i <= 70; i++) {
    problems.push(generateProblem(i));
  }
  
  return {
    problems,
    metadata: {
      total_problems: 70,
      subjects: subjects.map(s => ({ id: s.id, name: s.name })),
      chapters: chapters.map(c => ({ id: c.id, name: c.name, subject_id: c.subject_id })),
      difficulties,
      problem_types: problemTypes,
      exam_types: examTypes,
      years,
      created_at: new Date().toISOString(),
      version: "2.0"
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
const problemTypeStats = metadata.problems.map(p => p.problem_type);
const problemSubjects = metadata.problems.map(p => p.subject_name);
const problemChapters = metadata.problems.map(p => p.chapter_name);

console.log('\nStatistics:');
console.log('Difficulties:', problemDifficulties.reduce((acc, d) => { acc[d] = (acc[d] || 0) + 1; return acc; }, {}));
console.log('Problem Types:', problemTypeStats.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {}));
console.log('Subjects:', problemSubjects.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {}));
console.log('Unique Chapters:', [...new Set(problemChapters)].length);
console.log('Sample Chapters:', [...new Set(problemChapters)].slice(0, 5));
