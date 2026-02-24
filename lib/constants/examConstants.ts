/**
 * 학년별 1년간 한 과목의 문제 수
 * - 고3: 7개 시험(03,04,06,07,09,10,11) × 20문제 = 140
 * - 고2: 4개 시험(03,06,09,10) × 20문제 = 80
 * - 고1: 4개 시험(03,06,09,10) × 20문제 = 80
 */
export const PROBLEMS_PER_YEAR_BY_GRADE: Record<string, number> = {
  고3: 140,
  고2: 80,
  고1: 80,
};

/** 학년별 기출문제 데이터 범위 (년도) */
export const EXAM_DATA_YEAR_RANGE: Record<string, { start: number; end: number }> = {
  고3: { start: 2016, end: 2025 },
  고2: { start: 2016, end: 2025 },
  고1: { start: 2018, end: 2025 },
};

/** 고1은 통합사회만 존재 */
export const GRADE1_ONLY_SUBJECTS = ['통합사회'] as const;
