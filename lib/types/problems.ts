// Problem and metadata related types
export interface ProblemMetadata {
  id: string; // Changed from number to string (UUID)
  problem_filename: string; // Problem image filename
  answer_filename?: string; // Answer image filename
  answer?: number; // Multiple choice answer (1-5)
  chapter_id: string | null;
  difficulty: string;
  problem_type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

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
