import { createClient } from '@/lib/supabase/client';
import type { ProblemRange, CurrentGrade } from '@/lib/zustand/userAppSettingStore';

// RPC 원본 응답 타입
interface ProblemAnalysisRaw {
  problem_id: string;
  solve_count: number;
  ox_record: string;
  accuracy_rate: number | null;
  difficulty: string | null;
  score: number | null;
  단원_사회탐구_경제: string[] | null;
  단원_사회탐구_동아시아사: string[] | null;
  단원_사회탐구_사회문화: string[] | null;
  단원_사회탐구_생활과윤리: string[] | null;
  단원_사회탐구_세계사: string[] | null;
  단원_사회탐구_세계지리: string[] | null;
  단원_사회탐구_윤리와사상: string[] | null;
  단원_사회탐구_정치와법: string[] | null;
  단원_사회탐구_한국지리: string[] | null;
  단원_자세한통합사회_2: string[] | null;
  커스텀_자세한_통합사회: string[] | null;
  last_solved_at: string | null;
}

// 정제된 응답 타입
export interface ProblemAnalysis {
  problemId: string;
  subject: string;
  solveCount: number;
  oxRecord: string;
  accuracyRate: number | null;
  difficulty: string | null;
  score: number | null;
  tags: string[] | null;
  lastSolvedAt: string | null;
}

// 과목별로 그룹화된 데이터 타입
export type ProblemAnalysisBySubject = Map<string, ProblemAnalysis[]>;

// problemId에서 과목 추출 (예: "경제_고3_2025_09_모평_1_문제" -> "경제")
function extractSubject(problemId: string): string {
  const parts = problemId.split('_');
  return parts[0] || '기타';
}

// 내가 푼 문제 분석 데이터 가져오기 (과목별로 그룹화)
export async function getMyProblemAnalysis(): Promise<{
  data: ProblemAnalysisBySubject | null;
  error: Error | null;
}> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_my_problem_analysis');

  if (error) {
    return { data: null, error };
  }

  // 과목별로 그룹화할 Map
  const groupedBySubject: ProblemAnalysisBySubject = new Map();

  (data as ProblemAnalysisRaw[]).forEach((raw) => {
    // 11개 단원 컬럼 중 값이 있는 첫 번째 태그 배열 추출
    const tags =
      raw.단원_사회탐구_경제 ||
      raw.단원_사회탐구_동아시아사 ||
      raw.단원_사회탐구_사회문화 ||
      raw.단원_사회탐구_생활과윤리 ||
      raw.단원_사회탐구_세계사 ||
      raw.단원_사회탐구_세계지리 ||
      raw.단원_사회탐구_윤리와사상 ||
      raw.단원_사회탐구_정치와법 ||
      raw.단원_사회탐구_한국지리 ||
      raw.단원_자세한통합사회_2 ||
      raw.커스텀_자세한_통합사회;

    const subject = extractSubject(raw.problem_id);

    const transformed: ProblemAnalysis = {
      problemId: raw.problem_id,
      subject,
      solveCount: raw.solve_count,
      oxRecord: raw.ox_record,
      accuracyRate: raw.accuracy_rate,
      difficulty: raw.difficulty,
      score: raw.score,
      tags,
      lastSolvedAt: raw.last_solved_at || null,
    };

    // 과목별로 그룹화
    if (!groupedBySubject.has(subject)) {
      groupedBySubject.set(subject, []);
    }
    groupedBySubject.get(subject)!.push(transformed);
  });

  return { data: groupedBySubject, error: null };
}

// 오늘의 문제 타입
export interface TodayProblem {
  problemId: string;
  subjectId: string;
  correctAnswer: string | null;
  difficulty: string | null;
  score: number | null;
  accuracyRate: number | null;
  tags: string[] | null; // 단원 태그
  imageUrl: string; // 문제 이미지 URL (edited_content 우선)
  explanationImageUrl: string; // 해설 이미지 URL
}

// CDN URL 상수
const CDN_CONTENTS_URL = 'https://cdn.y3c.kr/tongkidari/contents';
const CDN_EDITED_CONTENTS_URL = 'https://cdn.y3c.kr/tongkidari/edited-contents';

// problem_id에서 연도 추출 (예: "경제_고3_2025_09_모평_1_문제" -> 2025)
function extractYear(problemId: string): number | null {
  const parts = problemId.split('_');
  // 형식: 과목_학년_년도_월_시험유형_번호_문제
  if (parts.length >= 3) {
    const year = parseInt(parts[2], 10);
    if (!isNaN(year)) return year;
  }
  return null;
}

// problem_id에서 학년 추출 (예: "경제_고3_2025_09_모평_1_문제" -> "고3")
function extractGrade(problemId: string): string | null {
  const parts = problemId.split('_');
  // 형식: 과목_학년_년도_월_시험유형_번호_문제
  if (parts.length >= 2) {
    return parts[1]; // "고3", "고2", "고1"
  }
  return null;
}

// 학습 목표에 따른 연도 범위 계산
function getYearRange(problemRange: ProblemRange): { minYear: number; maxYear: number } | null {
  const currentYear = new Date().getFullYear();

  switch (problemRange) {
    case 'recent3':
      return { minYear: currentYear - 2, maxYear: currentYear };
    case 'recent5':
      return { minYear: currentYear - 4, maxYear: currentYear };
    case 'total':
    default:
      return null; // 전체 - 연도 제한 없음
  }
}

// 문제 ID로 TodayProblem 형식의 데이터 가져오기 (공통 함수)
export async function fetchProblemById(problemId: string): Promise<{
  data: TodayProblem | null;
  error: Error | null;
}> {
  const supabase = createClient();

  try {
    // 1. accuracy_rate에서 문제 정보 가져오기
    const { data: problemData, error: problemError } = await supabase
      .from('accuracy_rate')
      .select('problem_id, correct_answer, difficulty, score, accuracy_rate')
      .eq('problem_id', problemId)
      .single();

    if (problemError || !problemData) {
      return { data: null, error: problemError || new Error('문제를 찾을 수 없습니다.') };
    }

    // 2. 태그 가져오기
    const subject = extractSubject(problemData.problem_id);
    const { data: tagData } = await supabase
      .from('problem_tags')
      .select('tag_labels')
      .eq('problem_id', problemData.problem_id)
      .like('type', `단원_%`)
      .single();

    const tags = tagData?.tag_labels || null;

    // 3. 해설 ID 생성
    const explanationId = problemData.problem_id.replace(/_문제$/, '_해설');

    // 4. edited_content 존재 여부 확인
    const { data: editedData } = await supabase
      .rpc('fetch_edited_contents_without_base64_by_ids', {
        p_resource_ids: [problemData.problem_id, explanationId]
      });

    const editedIds = new Set((editedData || []).map((item: { resource_id: string }) => item.resource_id));

    const imageUrl = editedIds.has(problemData.problem_id)
      ? `${CDN_EDITED_CONTENTS_URL}/${encodeURIComponent(problemData.problem_id)}.png`
      : `${CDN_CONTENTS_URL}/${problemData.problem_id}.png`;

    const explanationImageUrl = editedIds.has(explanationId)
      ? `${CDN_EDITED_CONTENTS_URL}/${encodeURIComponent(explanationId)}.png`
      : `${CDN_CONTENTS_URL}/${explanationId}.png`;

    return {
      data: {
        problemId: problemData.problem_id,
        subjectId: subject,
        correctAnswer: problemData.correct_answer,
        difficulty: problemData.difficulty,
        score: problemData.score,
        accuracyRate: problemData.accuracy_rate ? Number(problemData.accuracy_rate) : null,
        tags,
        imageUrl,
        explanationImageUrl,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다.') };
  }
}

// 오답 복습 문제 가져오기 (가장 최근 시도가 틀린 문제 중 랜덤)
export async function fetchWrongAnswerProblem(params?: {
  subjectFilter?: string; // 특정 과목만 필터링
}): Promise<{
  data: TodayProblem | null;
  error: Error | null;
}> {
  const supabase = createClient();

  try {
    // 1. 현재 사용자 가져오기
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('로그인이 필요합니다.') };
    }

    // 2. 사용자가 푼 모든 문제 기록 가져오기 (created_at 내림차순)
    const { data: solveRecords, error: solveError } = await supabase
      .from('solve_session_record')
      .select('problem_id, submit_answer, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (solveError) {
      return { data: null, error: solveError };
    }

    if (!solveRecords || solveRecords.length === 0) {
      return { data: null, error: new Error('푼 문제가 없습니다.') };
    }

    // 3. 각 문제의 가장 최근 제출 기록만 추출
    const latestByProblem = new Map<string, { submit_answer: number | null }>();
    for (const record of solveRecords) {
      if (!latestByProblem.has(record.problem_id)) {
        latestByProblem.set(record.problem_id, { submit_answer: record.submit_answer });
      }
    }

    // 4. 과목 필터링 (선택된 경우)
    let problemIds = Array.from(latestByProblem.keys());
    if (params?.subjectFilter) {
      problemIds = problemIds.filter(id => id.startsWith(params.subjectFilter + '_'));
    }

    if (problemIds.length === 0) {
      return { data: null, error: new Error('해당 과목에서 푼 문제가 없습니다.') };
    }

    // 5. 정답 정보 가져오기
    const { data: accuracyData, error: accuracyError } = await supabase
      .from('accuracy_rate')
      .select('problem_id, correct_answer')
      .in('problem_id', problemIds);

    if (accuracyError) {
      return { data: null, error: accuracyError };
    }

    // 6. 정답 맵 생성
    const correctAnswerMap = new Map<string, string>();
    for (const item of accuracyData || []) {
      if (item.correct_answer) {
        correctAnswerMap.set(item.problem_id, item.correct_answer);
      }
    }

    // 7. 가장 최근 시도가 틀린 문제만 필터링
    const wrongProblems: string[] = [];
    for (const [problemId, record] of latestByProblem.entries()) {
      // 과목 필터링 적용
      if (params?.subjectFilter && !problemId.startsWith(params.subjectFilter + '_')) {
        continue;
      }

      const correctAnswer = correctAnswerMap.get(problemId);
      if (correctAnswer && record.submit_answer !== null) {
        // 정답과 제출 답안 비교
        if (String(record.submit_answer) !== correctAnswer) {
          wrongProblems.push(problemId);
        }
      }
    }

    if (wrongProblems.length === 0) {
      return { data: null, error: new Error('복습할 오답이 없습니다. 모든 문제를 맞추셨네요!') };
    }

    // 8. 랜덤으로 1개 선택
    const randomIndex = Math.floor(Math.random() * wrongProblems.length);
    const selectedProblemId = wrongProblems[randomIndex];

    // 9. fetchProblemById로 상세 정보 가져오기
    return await fetchProblemById(selectedProblemId);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다.') };
  }
}

// 오늘의 문제 가져오기
export async function fetchTodayProblem(params: {
  interestSubjectIds: string[];
  problemRange: ProblemRange;
  currentGrade: CurrentGrade;
}): Promise<{
  data: TodayProblem | null;
  error: Error | null;
}> {
  const { interestSubjectIds, problemRange, currentGrade } = params;

  if (interestSubjectIds.length === 0) {
    return { data: null, error: new Error('관심 과목이 설정되지 않았습니다.') };
  }

  const supabase = createClient();

  try {
    // 1. 현재 사용자 가져오기
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('로그인이 필요합니다.') };
    }

    // 2. 사용자가 푼 문제 ID 목록 가져오기
    const { data: solvedRecords, error: solvedError } = await supabase
      .from('solve_session_record')
      .select('problem_id')
      .eq('user_id', user.id);

    if (solvedError) {
      return { data: null, error: solvedError };
    }

    const solvedProblemIds = new Set(solvedRecords?.map(r => r.problem_id) || []);

    // 3. 관심 과목 + 학년 + 연도로 필터링하여 문제 가져오기
    // problem_id는 "과목_학년_년도_월_시험유형_번호_문제" 형식
    const yearRange = getYearRange(problemRange);

    // 연도 목록 생성
    const years: number[] = [];
    if (yearRange) {
      for (let y = yearRange.minYear; y <= yearRange.maxYear; y++) {
        years.push(y);
      }
    }

    // 과목_학년_연도 패턴으로 쿼리 (예: "경제_고3_2024_%")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queries: PromiseLike<any>[] = [];

    for (const subject of interestSubjectIds) {
      if (years.length > 0) {
        // 연도별로 쿼리
        for (const year of years) {
          queries.push(
            supabase
              .from('accuracy_rate')
              .select('problem_id, correct_answer, difficulty, score, accuracy_rate')
              .like('problem_id', `${subject}_${currentGrade}_${year}_%`)
          );
        }
      } else {
        // 전체 연도
        queries.push(
          supabase
            .from('accuracy_rate')
            .select('problem_id, correct_answer, difficulty, score, accuracy_rate')
            .like('problem_id', `${subject}_${currentGrade}_%`)
        );
      }
    }

    const results = await Promise.all(queries);

    // 모든 결과 합치기
    const allProblems: Array<{
      problem_id: string;
      correct_answer: string | null;
      difficulty: string | null;
      score: number | null;
      accuracy_rate: number | null;
    }> = [];

    for (const result of results) {
      if (result.error) {
        console.error('Supabase query error:', result.error);
        return { data: null, error: result.error };
      }
      if (result.data) {
        allProblems.push(...result.data);
      }
    }

    if (allProblems.length === 0) {
      return { data: null, error: new Error(`${currentGrade} 학년의 문제가 없습니다.`) };
    }

    // 4. 안 푼 문제 필터링 (학년과 연도는 이미 쿼리에서 필터링됨)
    const eligibleProblems = allProblems.filter(problem => {
      // 이미 푼 문제 제외
      return !solvedProblemIds.has(problem.problem_id);
    });

    if (eligibleProblems.length === 0) {
      return { data: null, error: new Error('풀 수 있는 문제가 없습니다. 모든 문제를 풀었거나 조건에 맞는 문제가 없습니다.') };
    }

    // 5. 랜덤으로 1개 선택
    const randomIndex = Math.floor(Math.random() * eligibleProblems.length);
    const selectedProblem = eligibleProblems[randomIndex];

    // 6. 선택된 문제의 태그 가져오기
    const subject = extractSubject(selectedProblem.problem_id);
    const { data: tagData } = await supabase
      .from('problem_tags')
      .select('tag_labels')
      .eq('problem_id', selectedProblem.problem_id)
      .like('type', `단원_%`)
      .single();

    const tags = tagData?.tag_labels || null;

    // 7. 해설 ID 생성 (_문제 -> _해설)
    const explanationId = selectedProblem.problem_id.replace(/_문제$/, '_해설');

    // 8. edited_content 존재 여부 확인 (문제 + 해설)
    const { data: editedData } = await supabase
      .rpc('fetch_edited_contents_without_base64_by_ids', {
        p_resource_ids: [selectedProblem.problem_id, explanationId]
      });

    const editedIds = new Set((editedData || []).map((item: { resource_id: string }) => item.resource_id));

    const imageUrl = editedIds.has(selectedProblem.problem_id)
      ? `${CDN_EDITED_CONTENTS_URL}/${encodeURIComponent(selectedProblem.problem_id)}.png`
      : `${CDN_CONTENTS_URL}/${selectedProblem.problem_id}.png`;

    const explanationImageUrl = editedIds.has(explanationId)
      ? `${CDN_EDITED_CONTENTS_URL}/${encodeURIComponent(explanationId)}.png`
      : `${CDN_CONTENTS_URL}/${explanationId}.png`;

    return {
      data: {
        problemId: selectedProblem.problem_id,
        subjectId: subject,
        correctAnswer: selectedProblem.correct_answer,
        difficulty: selectedProblem.difficulty,
        score: selectedProblem.score,
        accuracyRate: selectedProblem.accuracy_rate ? Number(selectedProblem.accuracy_rate) : null,
        tags,
        imageUrl,
        explanationImageUrl,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다.') };
  }
}
