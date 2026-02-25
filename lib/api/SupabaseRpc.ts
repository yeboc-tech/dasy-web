import { createClient } from '@/lib/supabase/client';

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
