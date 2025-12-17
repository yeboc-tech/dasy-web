// Problem and metadata related types
export interface ProblemMetadata {
  id: string; // Changed from number to string (UUID)
  problem_filename: string; // Problem image filename
  answer_filename?: string; // Answer image filename
  answer?: number; // Multiple choice answer (1-5)
  chapter_id: string | null;
  difficulty: string;
  problem_type: string;
  tags: string[]; // Topic-level descriptors like "법치주의", "민주주의의 의미"
  related_subjects: string[]; // Course names like "생활과 윤리", "정치와 법"
  correct_rate?: number; // Correct rate percentage (0-100)
  exam_year?: number; // Year the problem appeared in exam (extracted from source)
  created_at: string;
  updated_at: string;
  isMissing?: boolean; // True if problem doesn't exist in DB yet (fields may be empty)
}

// Tagged problem type (uses problem_tags + accuracy_rate tables)
// Used for subjects like 경제, 사회문화, 생활과윤리
export interface TaggedProblem {
  problem_id: string; // e.g., "경제_고3_2024_03_학평_1_문제"
  tag_ids: string[]; // e.g., ["경제", "경제-1", "경제-1-1"]
  tag_labels: string[]; // e.g., ["경제", "1. 경제생활", "01. 경제생활 및 경제주체와 객체"]
  difficulty?: string; // "상", "중", "하"
  accuracy_rate?: number; // 0-100
  correct_answer?: number; // 1-5
  score?: number;
  // Parsed metadata from problem_id
  subject: string; // "경제", "사회문화", "생활과윤리"
  grade: string; // "고1", "고2", "고3"
  year: string; // "2024"
  month: string; // "03", "04", etc.
  exam_type: string; // "학평", "모평", "수능"
  question_number: number; // 1, 2, 3, etc.
}

// Legacy alias for backwards compatibility
export type EconomyProblem = TaggedProblem;

export interface MetadataFile {
  problems: ProblemMetadata[];
  metadata?: {
    total_problems: number;
    subjects: Array<{ id: string; name: string }>;
    chapters: Array<{ id: string; name: string; subject_id: string }>;
    difficulties: string[];
    problem_types: string[];
    exam_types: string[];
    created_at: string;
    version: string;
  };
}
