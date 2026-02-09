/**
 * 시험-워크시트 동기화 스크립트
 *
 * 사용법: npx tsx scripts/sync-exam-worksheets
 *
 * 1. exams.json에서 시험 목록 로드
 * 2. 각 시험에 대해 accuracy_rate 테이블에서 문제 ID 조회
 * 3. 비공개 워크시트 생성
 * 4. exams.json에 worksheet_id 추가
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase 클라이언트 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경변수가 설정되지 않았습니다:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 경로 설정
const DATA_DIR = path.join(__dirname, '../../data');
const EXAMS_JSON_PATH = path.join(DATA_DIR, 'exams.json');
const OUTPUT_DIR = path.join(__dirname, 'output');
const LOG_PATH = path.join(OUTPUT_DIR, 'sync-log.json');

interface Exam {
  id: string;
  subject: string;
  grade: string;
  gradeNum: number;
  year: number;
  month: string;
  monthNum: number;
  examType: string;
  region: string | null;
  problemPdf: string;
  answerPdf: string;
  hasProblem: boolean;
  hasAnswer: boolean;
  worksheet_id?: string;
}

interface ExamsData {
  metadata: {
    generatedAt: string;
    totalExams: number;
    filters: object;
  };
  exams: Exam[];
}

interface SyncLog {
  syncedAt: string;
  created: number;
  skipped: number;
  alreadyExists: number;
  failed: number;
  details: {
    created: string[];
    skipped: string[];
    failed: string[];
  };
}

// 시험 ID에서 문제 조회용 prefix 추출
// 경제_고3_2025_11_수능_NA -> 경제_고3_2025_11_수능
function getExamPrefix(exam: Exam): string {
  const parts = exam.id.split('_');
  // 마지막 지역 부분 제거
  return parts.slice(0, -1).join('_');
}

// 시험명 생성
function getExamTitle(exam: Exam): string {
  const { examType, year, month, grade, subject } = exam;

  if (examType === '수능') {
    return `${year}학년도 대학수학능력시험 ${subject}`;
  } else if (examType === '모평') {
    return `${year}학년도 ${month}월 모의평가 ${subject}`;
  } else {
    return `${year}년 ${month}월 ${grade} 학력평가 ${subject}`;
  }
}

// 문제 ID 정렬 (문제 번호 순)
function sortProblemIds(problemIds: string[]): string[] {
  return problemIds.sort((a, b) => {
    // 경제_고3_2025_11_수능_1_문제 에서 숫자 추출
    const numA = parseInt(a.split('_').slice(-2, -1)[0]) || 0;
    const numB = parseInt(b.split('_').slice(-2, -1)[0]) || 0;
    return numA - numB;
  });
}

async function createWorksheetForExam(exam: Exam): Promise<string | null> {
  const prefix = getExamPrefix(exam);
  const title = getExamTitle(exam);

  // 문제 ID 조회
  const { data: problems, error: queryError } = await supabase
    .from('accuracy_rate')
    .select('problem_id')
    .like('problem_id', `${prefix}_%_문제`);

  if (queryError) {
    console.error(`  [ERROR] 문제 조회 실패: ${exam.id}`, queryError.message);
    return null;
  }

  if (!problems || problems.length === 0) {
    console.log(`  [SKIP] 문제 없음: ${exam.id}`);
    return null;
  }

  const problemIds = sortProblemIds(problems.map(p => p.problem_id));

  // 워크시트 생성
  const { data: worksheet, error: insertError } = await supabase
    .from('worksheets')
    .insert({
      title,
      author: '키다리',
      selected_problem_ids: problemIds,
      is_public: false,
      created_by: null,
      filters: {
        source: 'exam',
        exam_id: exam.id,
      },
    })
    .select('id')
    .single();

  if (insertError) {
    console.error(`  [ERROR] 워크시트 생성 실패: ${exam.id}`, insertError.message);
    return null;
  }

  console.log(`  [OK] ${title} (${problemIds.length}문제) -> ${worksheet.id}`);
  return worksheet.id;
}

async function main() {
  console.log('=== 시험-워크시트 동기화 스크립트 ===\n');

  // 출력 디렉토리 생성
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // exams.json 로드
  const examsData: ExamsData = JSON.parse(fs.readFileSync(EXAMS_JSON_PATH, 'utf-8'));
  console.log(`총 ${examsData.exams.length}개 시험 로드됨\n`);

  const syncLog: SyncLog = {
    syncedAt: new Date().toISOString(),
    created: 0,
    skipped: 0,
    alreadyExists: 0,
    failed: 0,
    details: {
      created: [],
      skipped: [],
      failed: [],
    },
  };

  for (const exam of examsData.exams) {
    // 이미 worksheet_id가 있으면 스킵
    if (exam.worksheet_id) {
      syncLog.alreadyExists++;
      continue;
    }

    const worksheetId = await createWorksheetForExam(exam);

    if (worksheetId) {
      exam.worksheet_id = worksheetId;
      syncLog.created++;
      syncLog.details.created.push(exam.id);
    } else {
      // 문제가 없는 경우
      syncLog.skipped++;
      syncLog.details.skipped.push(exam.id);
    }

    // API 속도 제한 방지
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // exams.json 저장
  examsData.metadata.generatedAt = new Date().toISOString();
  fs.writeFileSync(EXAMS_JSON_PATH, JSON.stringify(examsData, null, 2));

  // 로그 저장
  fs.writeFileSync(LOG_PATH, JSON.stringify(syncLog, null, 2));

  console.log('\n=== 완료 ===');
  console.log(`생성됨: ${syncLog.created}`);
  console.log(`스킵됨 (문제 없음): ${syncLog.skipped}`);
  console.log(`이미 존재: ${syncLog.alreadyExists}`);
  console.log(`실패: ${syncLog.failed}`);
  console.log(`\nexams.json 저장됨: ${EXAMS_JSON_PATH}`);
  console.log(`로그 저장됨: ${LOG_PATH}`);
}

main().catch(console.error);
