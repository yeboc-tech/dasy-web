import { createClient } from '@/lib/supabase/client';
import type { ProblemRange, CurrentGrade } from '@/lib/zustand/userAppSettingStore';

/** 추천 문제 결과 타입 */
export interface RecommendedProblem {
  problemId: string;
  subjectId: string;
  correctAnswer: string | null;
  difficulty: string | null;
  score: number | null;
  accuracyRate: number | null;
  tags: string[] | null;
  imageUrl: string;
  explanationImageUrl: string;
}

type Result = { data: RecommendedProblem | null; error: Error | null };

const CDN_CONTENTS_URL = 'https://cdn.y3c.kr/tongkidari/contents';
const CDN_EDITED_CONTENTS_URL = 'https://cdn.y3c.kr/tongkidari/edited-contents';

/**
 * 한 문제 추천 서비스
 * - 오늘의 문제, 오답복습, 단원별 추천 등 한 문제를 추천하는 기능을 담당
 */
export class OneProblemRecommender {
  // ─── 공개 메서드 ───

  /** 오늘의 문제: 안 푼 문제 중 랜덤 1개 */
  static async fetchTodayProblem(params: {
    interestSubjectIds: string[];
    problemRange: ProblemRange;
    currentGrade: CurrentGrade;
  }): Promise<Result> {
    const { interestSubjectIds, problemRange, currentGrade } = params;

    if (interestSubjectIds.length === 0) {
      return { data: null, error: new Error('관심 과목이 설정되지 않았습니다.') };
    }

    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: new Error('로그인이 필요합니다.') };

      // 사용자가 푼 문제 ID
      const { data: solvedRecords, error: solvedError } = await supabase
        .from('user_problem_solve_record')
        .select('problem_id')
        .eq('user_id', user.id);

      if (solvedError) return { data: null, error: solvedError };

      const solvedProblemIds = new Set(solvedRecords?.map(r => r.problem_id) || []);

      // 연도 범위
      const yearRange = this.getYearRange(problemRange);
      const years: number[] = [];
      if (yearRange) {
        for (let y = yearRange.minYear; y <= yearRange.maxYear; y++) years.push(y);
      }

      // 과목 × 학년 × 연도로 후보 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queries: PromiseLike<any>[] = [];
      for (const subject of interestSubjectIds) {
        if (years.length > 0) {
          for (const year of years) {
            queries.push(
              supabase.from('accuracy_rate')
                .select('problem_id, correct_answer, difficulty, score, accuracy_rate')
                .like('problem_id', `${subject}_${currentGrade}_${year}_%`)
            );
          }
        } else {
          queries.push(
            supabase.from('accuracy_rate')
              .select('problem_id, correct_answer, difficulty, score, accuracy_rate')
              .like('problem_id', `${subject}_${currentGrade}_%`)
          );
        }
      }

      const results = await Promise.all(queries);
      const allProblems = this.flattenQueryResults(results);
      if (allProblems instanceof Error) return { data: null, error: allProblems };

      if (allProblems.length === 0) {
        return { data: null, error: new Error(`${currentGrade} 학년의 문제가 없습니다.`) };
      }

      // 안 푼 문제만 필터
      const eligible = allProblems.filter(p => !solvedProblemIds.has(p.problem_id));
      if (eligible.length === 0) {
        return { data: null, error: new Error('풀 수 있는 문제가 없습니다. 모든 문제를 풀었거나 조건에 맞는 문제가 없습니다.') };
      }

      return this.pickRandomAndBuild(eligible);
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다.') };
    }
  }

  /** 오답복습: 최근 시도가 틀린 문제 중 랜덤 1개 */
  static async fetchWrongAnswerProblem(params?: {
    subjectFilter?: string;
  }): Promise<Result> {
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: new Error('로그인이 필요합니다.') };

      const { data: solveRecords, error: solveError } = await supabase
        .from('user_problem_solve_record')
        .select('problem_id, submit_answer, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (solveError) return { data: null, error: solveError };
      if (!solveRecords || solveRecords.length === 0) {
        return { data: null, error: new Error('푼 문제가 없습니다.') };
      }

      // 문제별 최신 제출만 추출
      const latestByProblem = new Map<string, { submit_answer: number | null }>();
      for (const record of solveRecords) {
        if (!latestByProblem.has(record.problem_id)) {
          latestByProblem.set(record.problem_id, { submit_answer: record.submit_answer });
        }
      }

      // 과목 필터
      let problemIds = Array.from(latestByProblem.keys());
      if (params?.subjectFilter) {
        problemIds = problemIds.filter(id => id.startsWith(params.subjectFilter + '_'));
      }
      if (problemIds.length === 0) {
        return { data: null, error: new Error('해당 과목에서 푼 문제가 없습니다.') };
      }

      // 정답 정보
      const { data: accuracyData, error: accuracyError } = await supabase
        .from('accuracy_rate')
        .select('problem_id, correct_answer')
        .in('problem_id', problemIds);

      if (accuracyError) return { data: null, error: accuracyError };

      const correctAnswerMap = new Map<string, string>();
      for (const item of accuracyData || []) {
        if (item.correct_answer) correctAnswerMap.set(item.problem_id, item.correct_answer);
      }

      // 최근 시도가 틀린 문제
      const wrongProblems: string[] = [];
      for (const [problemId, record] of latestByProblem.entries()) {
        if (params?.subjectFilter && !problemId.startsWith(params.subjectFilter + '_')) continue;
        const correctAnswer = correctAnswerMap.get(problemId);
        if (correctAnswer && record.submit_answer !== null) {
          if (String(record.submit_answer) !== correctAnswer) {
            wrongProblems.push(problemId);
          }
        }
      }

      if (wrongProblems.length === 0) {
        return { data: null, error: new Error('복습할 오답이 없습니다. 모든 문제를 맞추셨네요!') };
      }

      const selectedProblemId = wrongProblems[Math.floor(Math.random() * wrongProblems.length)];
      return this.fetchProblemById(selectedProblemId);
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다.') };
    }
  }

  /** 단원별 추천: 특정 대단원에서 안 푼 문제 중 랜덤 1개 */
  static async fetchByChapter(params: {
    subjectId: string;
    chapterId: string;
    currentGrade: CurrentGrade;
    problemRange?: ProblemRange;
  }): Promise<Result> {
    const { subjectId, chapterId, currentGrade, problemRange } = params;
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: new Error('로그인이 필요합니다.') };

      // 해당 대단원에 속하는 문제 조회 (tag_ids[0] = 대단원 id)
      const tagType = subjectId.startsWith('통합사회_')
        ? `단원_자세한${subjectId}`
        : `단원_사회탐구_${subjectId}`;

      const { data: tagRows, error: tagError } = await supabase
        .from('problem_tags')
        .select('problem_id, tag_ids')
        .eq('type', tagType);

      if (tagError) return { data: null, error: tagError };

      // 연도 범위 계산
      const yearRange = problemRange ? this.getYearRange(problemRange) : null;

      // 대단원 필터 + 학년 필터 + 연도 필터
      const gradePrefix = `${subjectId}_${currentGrade}_`;
      const chapterProblemIds = (tagRows || [])
        .filter(row => {
          if (row.tag_ids?.[0] !== chapterId) return false;
          if (!row.problem_id.startsWith(gradePrefix)) return false;
          if (yearRange) {
            const year = parseInt(row.problem_id.split('_')[2]);
            if (year < yearRange.minYear || year > yearRange.maxYear) return false;
          }
          return true;
        })
        .map(row => row.problem_id);

      if (chapterProblemIds.length === 0) {
        return { data: null, error: new Error('해당 단원에 문제가 없습니다.') };
      }

      // 사용자가 푼 문제 제외
      const { data: solvedRecords } = await supabase
        .from('user_problem_solve_record')
        .select('problem_id')
        .eq('user_id', user.id)
        .in('problem_id', chapterProblemIds);

      const solvedSet = new Set(solvedRecords?.map(r => r.problem_id) || []);
      const eligible = chapterProblemIds.filter(id => !solvedSet.has(id));

      if (eligible.length === 0) {
        return { data: null, error: new Error('해당 단원의 모든 문제를 풀었습니다!') };
      }

      const selectedProblemId = eligible[Math.floor(Math.random() * eligible.length)];
      return this.fetchProblemById(selectedProblemId);
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다.') };
    }
  }

  /** 문제 ID로 상세 정보 조회 */
  static async fetchProblemById(problemId: string): Promise<Result> {
    const supabase = createClient();

    try {
      const { data: problemData, error: problemError } = await supabase
        .from('accuracy_rate')
        .select('problem_id, correct_answer, difficulty, score, accuracy_rate')
        .eq('problem_id', problemId)
        .single();

      if (problemError || !problemData) {
        return { data: null, error: problemError || new Error('문제를 찾을 수 없습니다.') };
      }

      const subject = this.extractSubject(problemData.problem_id);
      const tagType = subject.startsWith('통합사회_')
        ? `단원_자세한${subject}`
        : `단원_사회탐구_${subject}`;

      const { data: tagData } = await supabase
        .from('problem_tags')
        .select('tag_labels')
        .eq('problem_id', problemData.problem_id)
        .eq('type', tagType)
        .single();

      const tags = tagData?.tag_labels || null;
      const explanationId = problemData.problem_id.replace(/_문제$/, '_해설');

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

  // ─── 비공개 헬퍼 ───

  private static extractSubject(problemId: string): string {
    return problemId.split('_')[0] || '기타';
  }

  private static getYearRange(problemRange: ProblemRange): { minYear: number; maxYear: number } | null {
    const currentYear = new Date().getFullYear();
    switch (problemRange) {
      case 'recent3': return { minYear: currentYear - 2, maxYear: currentYear };
      case 'recent5': return { minYear: currentYear - 4, maxYear: currentYear };
      case 'total':
      default: return null;
    }
  }

  /** 여러 쿼리 결과를 하나의 배열로 합치기 */
  private static flattenQueryResults(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results: any[]
  ): Array<{
    problem_id: string;
    correct_answer: string | null;
    difficulty: string | null;
    score: number | null;
    accuracy_rate: number | null;
  }> | Error {
    const all: Array<{
      problem_id: string;
      correct_answer: string | null;
      difficulty: string | null;
      score: number | null;
      accuracy_rate: number | null;
    }> = [];

    for (const result of results) {
      if (result.error) {
        console.error('Supabase query error:', result.error);
        return result.error;
      }
      if (result.data) all.push(...result.data);
    }
    return all;
  }

  /** 후보 배열에서 랜덤 1개를 골라 상세 정보를 조회 */
  private static async pickRandomAndBuild(
    candidates: Array<{ problem_id: string }>
  ): Promise<Result> {
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    return this.fetchProblemById(selected.problem_id);
  }
}
