// Problem and metadata related types
export interface ProblemMetadata {
  id: string; // Changed from number to string (UUID)
  filename: string;
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
