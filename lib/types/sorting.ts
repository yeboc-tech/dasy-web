// Sorting types for worksheet problems

export type SortField = 'chapter' | 'difficulty' | 'correct_rate' | 'exam_year' | 'problem_type';
export type SortDirection = 'asc' | 'desc';

export interface SortRule {
  field: SortField;
  direction: SortDirection;
}

export type SortPreset = '실전' | '연습' | '커스텀';

export const SORT_FIELD_LABELS: Record<SortField, string> = {
  chapter: '단원',
  difficulty: '난이도',
  correct_rate: '정답률',
  exam_year: '출제년도',
  problem_type: '문제 유형'
};

export const PRESET_RULES: Record<Exclude<SortPreset, '커스텀'>, SortRule[]> = {
  '실전': [],
  '연습': [
    { field: 'chapter', direction: 'asc' },
    { field: 'difficulty', direction: 'asc' }
  ]
};

// Helper to determine which preset matches current rules
export const getMatchingPreset = (rules: SortRule[]): SortPreset => {
  if (rules.length === 0) return '실전';
  if (
    rules.length === 2 &&
    rules[0].field === 'chapter' && rules[0].direction === 'asc' &&
    rules[1].field === 'difficulty' && rules[1].direction === 'asc'
  ) {
    return '연습';
  }
  return '커스텀';
};
