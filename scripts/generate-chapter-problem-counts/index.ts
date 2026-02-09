/**
 * 단원별 문제 개수 생성 스크립트
 *
 * 사용법: npx tsx scripts/generate-chapter-problem-counts
 *
 * 1. problem_tags 테이블에서 단원 태그 조회
 * 2. 과목별, 단원별 문제 개수 집계 (recent3, recent5, total)
 * 3. JSON 파일 생성 및 ssot 테이블에 업로드
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

// 출력 파일 경로
const OUTPUT_DIR = path.join(__dirname, 'output');
const OUTPUT_JSON_PATH = path.join(OUTPUT_DIR, 'chapter-problem-counts.json');

// 현재 연도
const CURRENT_YEAR = new Date().getFullYear();

interface ChapterCount {
  recent3: number;
  recent5: number;
  total: number;
}

interface SubjectCounts {
  [chapterId: string]: ChapterCount;
}

interface AllCounts {
  [subject: string]: SubjectCounts;
}

// type에서 과목명 추출
// "단원_사회탐구_경제" -> "경제"
// "단원_자세한통합사회_1" -> "통합사회_1"
// "단원_자세한통합사회_2" -> "통합사회_2"
function extractSubject(type: string): string {
  if (type.startsWith('단원_사회탐구_')) {
    return type.replace('단원_사회탐구_', '');
  }
  if (type.startsWith('단원_자세한통합사회_')) {
    return type.replace('단원_자세한', '');
  }
  return type.replace('단원_', '');
}

// problem_id에서 연도 추출
// "경제_고3_2022_06_모평_1_문제" -> 2022
function extractYear(problemId: string): number {
  const parts = problemId.split('_');
  if (parts.length >= 3) {
    const year = parseInt(parts[2]);
    if (!isNaN(year)) {
      return year;
    }
  }
  return 0;
}

// tag_ids에서 가장 구체적인 단원 ID 추출 (마지막 요소)
// ["1", "1-1"] -> "1-1"
function getSpecificChapterId(tagIds: string[]): string {
  if (!tagIds || tagIds.length === 0) return '';
  return tagIds[tagIds.length - 1];
}

async function main() {
  console.log('=== 단원별 문제 개수 생성 스크립트 ===\n');
  console.log(`현재 연도: ${CURRENT_YEAR}`);
  console.log(`recent3: ${CURRENT_YEAR - 2} ~ ${CURRENT_YEAR}`);
  console.log(`recent5: ${CURRENT_YEAR - 4} ~ ${CURRENT_YEAR}\n`);

  // 출력 디렉토리 생성
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // problem_tags 조회 (단원_ 으로 시작하는 것만) - 페이지네이션으로 전체 조회
  const PAGE_SIZE = 1000;
  let allProblemTags: { problem_id: string; type: string; tag_ids: string[] }[] = [];
  let page = 0;
  let hasMore = true;

  console.log('problem_tags 조회 중...');

  while (hasMore) {
    const { data: problemTags, error } = await supabase
      .from('problem_tags')
      .select('problem_id, type, tag_ids')
      .like('type', '단원_%')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('problem_tags 조회 실패:', error.message);
      process.exit(1);
    }

    if (!problemTags || problemTags.length === 0) {
      hasMore = false;
    } else {
      allProblemTags = allProblemTags.concat(problemTags);
      console.log(`  - 페이지 ${page + 1}: ${problemTags.length}개 조회 (누적: ${allProblemTags.length}개)`);
      hasMore = problemTags.length === PAGE_SIZE;
      page++;
    }
  }

  if (allProblemTags.length === 0) {
    console.log('태그된 문제가 없습니다.');
    process.exit(0);
  }

  console.log(`\n총 ${allProblemTags.length}개 태그 레코드 조회됨\n`);

  const problemTags = allProblemTags;

  // 집계
  const counts: AllCounts = {};

  for (const tag of problemTags) {
    const subject = extractSubject(tag.type);
    const year = extractYear(tag.problem_id);
    const chapterId = getSpecificChapterId(tag.tag_ids);

    if (!subject || !chapterId || year === 0) continue;

    // 과목 초기화
    if (!counts[subject]) {
      counts[subject] = {};
    }

    // 단원 초기화
    if (!counts[subject][chapterId]) {
      counts[subject][chapterId] = {
        recent3: 0,
        recent5: 0,
        total: 0,
      };
    }

    // 카운트 증가
    counts[subject][chapterId].total++;

    if (year >= CURRENT_YEAR - 4) {
      counts[subject][chapterId].recent5++;
    }

    if (year >= CURRENT_YEAR - 2) {
      counts[subject][chapterId].recent3++;
    }
  }

  // 결과 출력
  const subjectList = Object.keys(counts).sort();
  console.log(`과목 수: ${subjectList.length}`);
  for (const subject of subjectList) {
    const chapterCount = Object.keys(counts[subject]).length;
    const totalProblems = Object.values(counts[subject]).reduce((sum, c) => sum + c.total, 0);
    console.log(`  - ${subject}: ${chapterCount}개 단원, ${totalProblems}개 문제`);
  }

  // JSON 파일 저장
  const outputData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      currentYear: CURRENT_YEAR,
      recent3Range: `${CURRENT_YEAR - 2} ~ ${CURRENT_YEAR}`,
      recent5Range: `${CURRENT_YEAR - 4} ~ ${CURRENT_YEAR}`,
    },
    counts,
  };

  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(outputData, null, 2));
  console.log(`\nJSON 파일 저장됨: ${OUTPUT_JSON_PATH}`);

  // ssot 테이블에 업로드
  const { error: upsertError } = await supabase
    .from('ssot')
    .upsert({
      key: '단원별_문제_개수',
      value: counts,
    }, {
      onConflict: 'key',
    });

  if (upsertError) {
    console.error('ssot 업로드 실패:', upsertError.message);
  } else {
    console.log('ssot 테이블 업로드 완료: key = "단원별_문제_개수"');
  }

  console.log('\n=== 완료 ===');
}

main().catch(console.error);
