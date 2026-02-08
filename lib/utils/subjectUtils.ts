export interface Subject {
  id: string;
  label: string;
}

/**
 * 2026학년도 수능 과목 (9개)
 */
export const SUBJECTS_2026: Subject[] = [
  { id: '경제', label: '경제' },
  { id: '동아시아사', label: '동아시아사' },
  { id: '사회문화', label: '사회·문화' },
  { id: '생활과윤리', label: '생활과 윤리' },
  { id: '세계사', label: '세계사' },
  { id: '세계지리', label: '세계지리' },
  { id: '윤리와사상', label: '윤리와 사상' },
  { id: '정치와법', label: '정치와 법' },
  { id: '한국지리', label: '한국지리' },
];

/**
 * 2027학년도 이후 수능 과목 (2개) - 통합사회
 */
export const SUBJECTS_2027: Subject[] = [
  { id: '통합사회_1', label: '통합사회 1' },
  { id: '통합사회_2', label: '통합사회 2' },
];

// 하위 호환성을 위한 alias
export const TONGHAP_SUBJECTS = SUBJECTS_2027;
export const TONGHAP_SUBJECT_IDS = TONGHAP_SUBJECTS.map(s => s.id);
export const TONGHAP_SUBJECT_LABELS = TONGHAP_SUBJECTS.map(s => s.label);

/**
 * 수능 연도에 따른 과목 목록 반환
 * @param suneungYear 수능 연도
 * @returns 해당 연도의 과목 목록
 */
export function getSubjectsByYear(suneungYear: number | null): Subject[] {
  if (!suneungYear) {
    // 연도 미선택 시: 전체 과목
    return [...SUBJECTS_2026, ...SUBJECTS_2027];
  }

  if (suneungYear >= 2027) {
    return SUBJECTS_2027;
  }

  // 2026년 이하
  return SUBJECTS_2026;
}

/**
 * 수능 연도에 따라 선택 가능한 과목인지 확인
 * @param subjectId 과목 ID
 * @param suneungYear 수능 연도 (null인 경우 모든 과목 선택 가능)
 * @returns 선택 가능 여부
 */
export function isAvailableSubject(subjectId: string, suneungYear: number | null): boolean {
  const subjects = getSubjectsByYear(suneungYear);
  return subjects.some(s => s.id === subjectId);
}

/**
 * 수능 연도에 따라 선택 가능한 과목 ID 목록 반환
 * @param suneungYear 수능 연도
 * @returns 선택 가능한 과목 ID 배열
 */
export function getSubjectIdsByYear(suneungYear: number | null): string[] {
  return getSubjectsByYear(suneungYear).map(s => s.id);
}

/**
 * 과목 ID로 라벨 가져오기
 */
export function getSubjectLabel(id: string): string | null {
  const allSubjects = [...SUBJECTS_2026, ...SUBJECTS_2027];
  const subject = allSubjects.find(s => s.id === id);
  return subject?.label || null;
}
