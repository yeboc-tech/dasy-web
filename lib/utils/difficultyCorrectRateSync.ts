/**
 * Utility functions to sync difficulty and correct_rate filters for 통합사회
 *
 * Difficulty mapping:
 * - 상 (Hard): 0-40%
 * - 중 (Medium): 40-70%
 * - 하 (Easy): 70-100%
 */

export const DIFFICULTY_RANGES = {
  '상': { min: 0, max: 40 },
  '중': { min: 40, max: 70 },
  '하': { min: 70, max: 100 }
} as const;

export type DifficultyLevel = '상' | '중' | '하';

/**
 * Calculate difficulty level from correct rate
 */
export function getDifficultyFromCorrectRate(correctRate: number): DifficultyLevel {
  if (correctRate < 40) return '상';
  if (correctRate < 70) return '중';
  return '하';
}

/**
 * Convert selected difficulties to correct rate range
 * Returns [min, max] range that encompasses all selected difficulties
 */
export function getCorrectRateRangeFromDifficulties(difficulties: string[]): [number, number] {
  // Filter to only valid 통합사회 difficulty levels
  const validDifficulties = difficulties.filter(d => d in DIFFICULTY_RANGES);

  if (validDifficulties.length === 0 || validDifficulties.length === 3) {
    return [0, 100];
  }

  const ranges = validDifficulties.map(d => DIFFICULTY_RANGES[d as DifficultyLevel]);
  const min = Math.min(...ranges.map(r => r.min));
  const max = Math.max(...ranges.map(r => r.max));

  return [min, max];
}

/**
 * Determine which difficulties should be selected based on correct rate range
 * A difficulty is selected if its range overlaps with the given range
 */
export function getDifficultiesFromCorrectRateRange(range: [number, number]): string[] {
  const [min, max] = range;
  const selected: string[] = [];

  // Check if range overlaps with each difficulty's range
  Object.entries(DIFFICULTY_RANGES).forEach(([difficulty, diffRange]) => {
    // Ranges overlap if: min <= diffRange.max AND max >= diffRange.min
    if (min <= diffRange.max && max >= diffRange.min) {
      selected.push(difficulty);
    }
  });

  return selected;
}

/**
 * Check if the correct rate range exactly matches the difficulty selections
 * This is used to determine if we should sync or not (to avoid infinite loops)
 */
export function doesCorrectRateMatchDifficulties(
  correctRateRange: [number, number],
  selectedDifficulties: string[]
): boolean {
  // Filter to only valid 통합사회 difficulty levels
  const validDifficulties = selectedDifficulties.filter(d => d in DIFFICULTY_RANGES);
  const expectedRange = getCorrectRateRangeFromDifficulties(validDifficulties);
  return correctRateRange[0] === expectedRange[0] && correctRateRange[1] === expectedRange[1];
}

/**
 * Check if the difficulty selections exactly match the correct rate range
 */
export function doDifficultiesMatchCorrectRate(
  selectedDifficulties: string[],
  correctRateRange: [number, number]
): boolean {
  // Filter to only valid 통합사회 difficulty levels
  const validDifficulties = selectedDifficulties.filter(d => d in DIFFICULTY_RANGES);
  const expectedDifficulties = getDifficultiesFromCorrectRateRange(correctRateRange);

  if (validDifficulties.length !== expectedDifficulties.length) {
    return false;
  }

  return validDifficulties.every(d => expectedDifficulties.includes(d));
}
