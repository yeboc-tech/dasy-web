/**
 * Utility functions to sync difficulty and correct_rate filters for tagged subject problems
 *
 * Tagged subjects (경제, 사회문화, 생활과윤리) have 6 difficulty levels based on correct_rate analysis:
 * - 최상 (Highest): 0-29%
 * - 상 (High): 30-49%
 * - 중상 (Medium-High): 50-59%
 * - 중 (Medium): 60-79%
 * - 중하 (Medium-Low): 80-89%
 * - 하 (Low): 90-100%
 */

export const TAGGED_DIFFICULTY_RANGES = {
  '최상': { min: 0, max: 29 },
  '상': { min: 30, max: 49 },
  '중상': { min: 50, max: 59 },
  '중': { min: 60, max: 79 },
  '중하': { min: 80, max: 89 },
  '하': { min: 90, max: 100 }
} as const;

export type TaggedDifficultyLevel = '최상' | '상' | '중상' | '중' | '중하' | '하';

/**
 * Calculate difficulty level from correct rate for tagged subject problems
 */
export function getTaggedDifficultyFromCorrectRate(correctRate: number): TaggedDifficultyLevel {
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
export function getCorrectRateRangeFromTaggedDifficulties(difficulties: string[]): [number, number] {
  if (difficulties.length === 0 || difficulties.length === 6) {
    return [0, 100];
  }

  const ranges = difficulties
    .filter(d => d in TAGGED_DIFFICULTY_RANGES)
    .map(d => TAGGED_DIFFICULTY_RANGES[d as TaggedDifficultyLevel]);

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
export function getTaggedDifficultiesFromCorrectRateRange(range: [number, number]): string[] {
  const [min, max] = range;
  const selected: string[] = [];

  // Check if range overlaps with each difficulty's range
  Object.entries(TAGGED_DIFFICULTY_RANGES).forEach(([difficulty, diffRange]) => {
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
export function doesCorrectRateMatchTaggedDifficulties(
  correctRateRange: [number, number],
  selectedDifficulties: string[]
): boolean {
  const expectedRange = getCorrectRateRangeFromTaggedDifficulties(selectedDifficulties);
  return correctRateRange[0] === expectedRange[0] && correctRateRange[1] === expectedRange[1];
}

/**
 * Check if the difficulty selections exactly match the correct rate range
 */
export function doTaggedDifficultiesMatchCorrectRate(
  selectedDifficulties: string[],
  correctRateRange: [number, number]
): boolean {
  const expectedDifficulties = getTaggedDifficultiesFromCorrectRateRange(correctRateRange);

  if (selectedDifficulties.length !== expectedDifficulties.length) {
    return false;
  }

  return selectedDifficulties.every(d => expectedDifficulties.includes(d));
}

// Legacy aliases for backwards compatibility (can be removed after migration)
export const ECONOMY_DIFFICULTY_RANGES = TAGGED_DIFFICULTY_RANGES;
export type EconomyDifficultyLevel = TaggedDifficultyLevel;
export const getEconomyDifficultyFromCorrectRate = getTaggedDifficultyFromCorrectRate;
export const getCorrectRateRangeFromEconomyDifficulties = getCorrectRateRangeFromTaggedDifficulties;
export const getEconomyDifficultiesFromCorrectRateRange = getTaggedDifficultiesFromCorrectRateRange;
export const doesCorrectRateMatchEconomyDifficulties = doesCorrectRateMatchTaggedDifficulties;
export const doEconomyDifficultiesMatchCorrectRate = doTaggedDifficultiesMatchCorrectRate;
