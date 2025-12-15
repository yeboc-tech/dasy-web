// Sorting types for worksheet problems

// 'random' is a special internal field for shuffle mode (무작위)
// 'manual' is a special internal field for manual ordering (수동) - enables drag & drop
// These should NOT appear in UI dropdowns - only used as markers in DB
export type SortField = 'chapter' | 'tags' | 'correct_rate' | 'exam_year' | 'problem_type' | 'related_subjects' | 'random' | 'manual';
export type SortDirection = 'asc' | 'desc';

export interface SortRule {
  field: SortField;
  direction: SortDirection;
}

export type SortPreset = '수동' | '무작위' | '연습' | '커스텀';

// Labels for UI display (excludes 'random' and 'manual' since they're not user-selectable)
export const SORT_FIELD_LABELS: Record<Exclude<SortField, 'random' | 'manual'>, string> = {
  chapter: '단원',
  tags: '태그',
  correct_rate: '정답률',
  exam_year: '출제년도',
  problem_type: '문제 유형',
  related_subjects: '관련 과목'
};

// Fields available for each mode
export const TONGHAP_SORT_FIELDS: SortField[] = ['chapter', 'tags', 'correct_rate', 'exam_year', 'problem_type', 'related_subjects'];
export const ECONOMY_SORT_FIELDS: SortField[] = ['chapter', 'correct_rate', 'exam_year', 'problem_type'];

// Preset rules for 통합사회
export const TONGHAP_PRESET_RULES: Record<Exclude<SortPreset, '커스텀'>, SortRule[]> = {
  '수동': [{ field: 'manual', direction: 'asc' }],  // Special marker for manual ordering (drag & drop)
  '무작위': [{ field: 'random', direction: 'asc' }],  // Special marker for shuffle
  '연습': [
    { field: 'chapter', direction: 'asc' },
    { field: 'tags', direction: 'asc' },
    { field: 'correct_rate', direction: 'desc' }  // Higher correct rate = easier, so desc for easy first
  ]
};

// Preset rules for 경제 (no tags field)
export const ECONOMY_PRESET_RULES: Record<Exclude<SortPreset, '커스텀'>, SortRule[]> = {
  '수동': [{ field: 'manual', direction: 'asc' }],  // Special marker for manual ordering (drag & drop)
  '무작위': [{ field: 'random', direction: 'asc' }],  // Special marker for shuffle
  '연습': [
    { field: 'chapter', direction: 'asc' },
    { field: 'correct_rate', direction: 'desc' }
  ]
};

// Helper to determine which preset matches current rules
export const getMatchingPreset = (rules: SortRule[], isTaggedMode: boolean): SortPreset => {
  // Check for 수동 (manual marker) - enables drag & drop
  if (rules.length === 1 && rules[0].field === 'manual') {
    return '수동';
  }

  // Check for 무작위 (random marker)
  if (rules.length === 1 && rules[0].field === 'random') {
    return '무작위';
  }

  // Empty rules = 커스텀 (keep original order, no preset matches)
  if (rules.length === 0) return '커스텀';

  if (isTaggedMode) {
    // 경제: 연습 = chapter + correct_rate
    if (
      rules.length === 2 &&
      rules[0].field === 'chapter' && rules[0].direction === 'asc' &&
      rules[1].field === 'correct_rate' && rules[1].direction === 'desc'
    ) {
      return '연습';
    }
  } else {
    // 통합사회: 연습 = chapter + tags + correct_rate
    if (
      rules.length === 3 &&
      rules[0].field === 'chapter' && rules[0].direction === 'asc' &&
      rules[1].field === 'tags' && rules[1].direction === 'asc' &&
      rules[2].field === 'correct_rate' && rules[2].direction === 'desc'
    ) {
      return '연습';
    }
  }
  return '커스텀';
};
