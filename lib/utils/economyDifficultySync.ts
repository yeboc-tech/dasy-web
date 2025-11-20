/**
 * Utility functions to sync difficulty and correct_rate filters for economy problems
 *
 * Economy has 6 difficulty levels based on correct_rate analysis:
 * - 최상 (Highest): 0-29%
 * - 상 (High): 30-49%
 * - 중상 (Medium-High): 50-59%
 * - 중 (Medium): 60-79%
 * - 중하 (Medium-Low): 80-89%
 * - 하 (Low): 90-100%
 */

export const ECONOMY_DIFFICULTY_RANGES = {
  '최상': { min: 0, max: 29 },
  '상': { min: 30, max: 49 },
  '중상': { min: 50, max: 59 },
  '중': { min: 60, max: 79 },
  '중하': { min: 80, max: 89 },
  '하': { min: 90, max: 100 }
} as const;

export type EconomyDifficultyLevel = '최상' | '상' | '중상' | '중' | '중하' | '하';

/**
 * Calculate difficulty level from correct rate for economy problems
 */
export function getEconomyDifficultyFromCorrectRate(correctRate: number): EconomyDifficultyLevel {
  if (correctRate < 30) return '최상';
  if (correctRate < 50) return '상';
  if (correctRate < 60) return '중상';
  if (correctRate < 80) return '중';
  if (correctRate < 90) return '중하';
  return '하';
}

/**
 * Convert selected difficulties to correct rate range
 * Returns [min, max] range that encompasses all selected difficulties
 */
export function getCorrectRateRangeFromEconomyDifficulties(difficulties: string[]): [number, number] {
  if (difficulties.length === 0 || difficulties.length === 6) {
    return [0, 100];
  }

  const ranges = difficulties
    .filter(d => d in ECONOMY_DIFFICULTY_RANGES)
    .map(d => ECONOMY_DIFFICULTY_RANGES[d as EconomyDifficultyLevel]);

  if (ranges.length === 0) {
    return [0, 100];
  }

  const min = Math.min(...ranges.map(r => r.min));
  const max = Math.max(...ranges.map(r => r.max));

  return [min, max];
}

/**
 * Determine which difficulties should be selected based on correct rate range
 * A difficulty is selected if its range overlaps with the given range
 */
export function getEconomyDifficultiesFromCorrectRateRange(range: [number, number]): string[] {
  const [min, max] = range;
  const selected: string[] = [];

  // Check if range overlaps with each difficulty's range
  Object.entries(ECONOMY_DIFFICULTY_RANGES).forEach(([difficulty, diffRange]) => {
    // Ranges overlap if: min <= diffRange.max AND max >= diffRange.min
    if (min <= diffRange.max && max >= diffRange.min) {
      selected.push(difficulty);
    }
  });

  return selected;
}

/**
 * Check if the correct rate range exactly matches the difficulty selections
 */
export function doesCorrectRateMatchEconomyDifficulties(
  correctRateRange: [number, number],
  selectedDifficulties: string[]
): boolean {
  const expectedRange = getCorrectRateRangeFromEconomyDifficulties(selectedDifficulties);
  return correctRateRange[0] === expectedRange[0] && correctRateRange[1] === expectedRange[1];
}

/**
 * Check if the difficulty selections exactly match the correct rate range
 */
export function doEconomyDifficultiesMatchCorrectRate(
  selectedDifficulties: string[],
  correctRateRange: [number, number]
): boolean {
  const expectedDifficulties = getEconomyDifficultiesFromCorrectRateRange(correctRateRange);

  if (selectedDifficulties.length !== expectedDifficulties.length) {
    return false;
  }

  return selectedDifficulties.every(d => expectedDifficulties.includes(d));
}
