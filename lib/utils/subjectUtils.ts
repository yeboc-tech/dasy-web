export type { Subject } from '@/lib/ssot/SUBJECTS';
export { SUBJECTS_2026, SUBJECTS_2027 } from '@/lib/ssot/SUBJECTS';

import { SUBJECTS_2026, SUBJECTS_2027 } from '@/lib/ssot/SUBJECTS';
import type { Subject } from '@/lib/ssot/SUBJECTS';

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
