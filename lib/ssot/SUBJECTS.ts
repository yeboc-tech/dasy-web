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
