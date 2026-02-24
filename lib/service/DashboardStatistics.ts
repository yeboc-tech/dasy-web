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
}
