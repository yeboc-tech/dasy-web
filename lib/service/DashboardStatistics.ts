import {
  PROBLEMS_PER_YEAR_BY_GRADE,
  EXAM_DATA_YEAR_RANGE,
  GRADE1_ONLY_SUBJECTS,
} from '@/lib/constants/examConstants';

/** user_problem_solve_record JOIN accuracy_rate 결과 DTO */
export interface SolveRecordDTO {
  problemId: string;
  submitAnswer: number;
  createdAt: string;
  correctAnswer: string | null;
  difficulty: string | null;
  score: number | null;
  accuracyRate: number | null;
}

/** 대단원별 학습 진행 현황 */
export interface ChapterProgress {
  chapterId: string;
  chapter: string;
  solved: number;
  total: number;
  accuracy: number;
}

/** SSOT 챕터 트리 노드 */
export interface SsotChapterNode {
  id: string;
  title: string;
  chapters?: SsotChapterNode[];
}

/** SSOT 챕터 트리 root */
export interface SsotChapterTree {
  id: string;
  title: string;
  tagType: string;
  chapters: SsotChapterNode[];
}

/** SSOT 단원별_문제_개수 내 과목별 중단원 카운트 */
export interface ChapterCountEntry {
  total: number;
  current: number;
  recent3: number;
  recent5: number;
}

export interface PeriodStats {
  completed: number;
  total: number;
}

export interface ReviewStats {
  thisYear: PeriodStats;
  recent3: PeriodStats;
  recent5: PeriodStats;
  all: PeriodStats;
}

export class DashboardStatistics {
  private records: SolveRecordDTO[];

  constructor(records: SolveRecordDTO[]) {
    this.records = records;
  }

  /** 전체 레코드 반환 */
  getRecords(): SolveRecordDTO[] {
    return this.records;
  }

  private parseProblemId(problemId: string) {
    const parts = problemId.split('_');
    return {
      subject: parts[0],
      grade: parts[1],
      year: parseInt(parts[2]),
    };
  }

  /**
   * 기출문제 복습 현황
   * @param subject 과목 ID (e.g. "경제")
   * @param turn N턴 (1=1회 이상 풀이, 2=2회 이상 풀이, ...)
   */
  getReviewStats(subject: string, turn: number = 1): ReviewStats {
    const currentYear = new Date().getFullYear();

    // 과목별 레코드 필터
    const subjectRecords = this.records.filter(
      (r) => this.parseProblemId(r.problemId).subject === subject,
    );

    // 문제별 풀이 횟수 집계
    const solveCountMap = new Map<string, number>();
    for (const r of subjectRecords) {
      solveCountMap.set(r.problemId, (solveCountMap.get(r.problemId) || 0) + 1);
    }

    // turn 이상 풀이한 문제 ID 목록
    const completedIds = [...solveCountMap.entries()]
      .filter(([, count]) => count >= turn)
      .map(([id]) => id);

    // 년도 범위 내 풀이 완료 수
    const countCompleted = (startYear: number, endYear: number) =>
      completedIds.filter((id) => {
        const { year } = this.parseProblemId(id);
        return year >= startYear && year <= endYear;
      }).length;

    // 년도 범위 내 전체 문제 수 (상수 기반)
    // 통합사회 → 고1, 나머지 9개 과목 → 고3
    const grade = (GRADE1_ONLY_SUBJECTS as readonly string[]).includes(subject) ? '고1' : '고3';
    const range = EXAM_DATA_YEAR_RANGE[grade];
    const perYear = PROBLEMS_PER_YEAR_BY_GRADE[grade] ?? 0;

    const countTotal = (startYear: number, endYear: number) => {
      const s = Math.max(startYear, range.start);
      const e = Math.min(endYear, currentYear);
      if (s > e) return 0;
      return (e - s + 1) * perYear;
    };

    return {
      thisYear: {
        completed: countCompleted(currentYear, currentYear),
        total: countTotal(currentYear, currentYear),
      },
      recent3: {
        completed: countCompleted(currentYear - 3, currentYear - 1),
        total: countTotal(currentYear - 3, currentYear - 1),
      },
      recent5: {
        completed: countCompleted(currentYear - 5, currentYear - 1),
        total: countTotal(currentYear - 5, currentYear - 1),
      },
      all: {
        completed: countCompleted(0, 9999),
        total: countTotal(0, 9999),
      },
    };
  }

  /**
   * 대단원별 기출 학습 현황
   * @param subject 과목 ID (e.g. "경제")
   * @param chapterTree SSOT 챕터 트리
   * @param chapterCounts SSOT 단원별_문제_개수 중 해당 과목 데이터
   * @param problemTagMap problem_id → 대단원 id 매핑 (tag_ids[0])
   */
  getChapterProgress(
    subject: string,
    chapterTree: SsotChapterTree,
    chapterCounts: Record<string, ChapterCountEntry>,
    problemTagMap: Map<string, string>,
  ): ChapterProgress[] {
    // 과목별 레코드만 필터
    const subjectRecords = this.records.filter(
      (r) => this.parseProblemId(r.problemId).subject === subject,
    );

    // 문제별 최신 풀이 결과 (정답 여부)
    const latestByProblem = new Map<string, { correct: boolean }>();
    // createdAt 기준 정렬 (오래된 것 먼저 → 나중에 덮어쓰기)
    const sorted = [...subjectRecords].sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt),
    );
    for (const r of sorted) {
      const isCorrect =
        r.correctAnswer !== null &&
        String(r.submitAnswer) === String(r.correctAnswer);
      latestByProblem.set(r.problemId, { correct: isCorrect });
    }

    // 대단원별 집계
    return chapterTree.chapters.map((majorChapter) => {
      // 대단원 아래 중단원 id 수집
      const subChapterIds: string[] = [];
      if (majorChapter.chapters && majorChapter.chapters.length > 0) {
        for (const sub of majorChapter.chapters) {
          subChapterIds.push(sub.id);
        }
      } else {
        // 중단원이 없는 경우 (대단원 자체가 leaf)
        subChapterIds.push(majorChapter.id);
      }

      // total: SSOT 중단원 카운트 합산
      let total = 0;
      for (const subId of subChapterIds) {
        const count = chapterCounts[subId];
        if (count) {
          total += count.total;
        }
      }

      // solved & correct: 이 대단원에 속하는 풀이 기록 집계
      let solved = 0;
      let correct = 0;
      for (const [problemId, result] of latestByProblem) {
        const majorId = problemTagMap.get(problemId);
        if (majorId === majorChapter.id) {
          solved++;
          if (result.correct) correct++;
        }
      }

      const accuracy = solved > 0 ? Math.round((correct / solved) * 100) : 0;

      return {
        chapterId: majorChapter.id,
        chapter: majorChapter.title,
        solved,
        total,
        accuracy,
      };
    });
  }
}
