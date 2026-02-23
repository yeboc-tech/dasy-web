import type { CurrentGrade } from '@/lib/zustand/userAppSettingStore'

/**
 * 수능 목표년도로부터 현재 학년을 계산한다.
 * - 현재년도와 동일하면 고3
 * - 1년 뒤면 고2
 * - 그 외(2년 이상)는 고1
 *
 * @param suneungYear 수능 목표년도 (예: 2027)
 * @param now 기준 날짜 (테스트용, 기본값: 현재)
 */
export function getGradeFromSuneungYear(
  suneungYear: number,
  now: Date = new Date()
): CurrentGrade {
  const currentYear = now.getFullYear()
  const diff = suneungYear - currentYear

  if (diff <= 0) return '고3'
  if (diff === 1) return '고2'
  return '고1'
}
