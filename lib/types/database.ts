// Database related types from Supabase services
export interface Chapter {
  id: string;
  name: string;
  chapter_number: number;
  parent_id: string | null;
  subject_id: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface ChapterTreeItem {
  id: string;
  label: string;
  type: 'category' | 'item';
  expanded: boolean;
  children?: ChapterTreeItem[];
}
