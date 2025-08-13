import { create } from 'zustand';

interface WorksheetState {
  selectedChapters: string[]; // IDs of selected top-level chapters and their children (only top-level are user-selectable)
  problemCount: number;
  selectedDifficulties: string[]; // Multi-select for difficulties
  selectedProblemTypes: string[]; // Multi-select for problem types
  selectedSubjects: string[]; // IDs of selected related subjects
  setSelectedChapters: (chapters: string[]) => void;
  setProblemCount: (count: number) => void;
  setSelectedDifficulties: (difficulties: string[]) => void;
  setSelectedProblemTypes: (types: string[]) => void;
  setSelectedSubjects: (subjects: string[]) => void;
}

export const useWorksheetStore = create<WorksheetState>((set) => ({
  selectedChapters: [],
  problemCount: 50,
  selectedDifficulties: ['하', '중', '상'], // Default to all selected
  selectedProblemTypes: ['기출문제', 'N제'], // Default to all selected
  selectedSubjects: ['생활과 윤리', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와 법', '사회·문화'], // Default to all selected
  setSelectedChapters: (chapters) => set({ selectedChapters: chapters }),
  setProblemCount: (count) => set({ problemCount: count }),
  setSelectedDifficulties: (difficulties) => set({ selectedDifficulties: difficulties }),
  setSelectedProblemTypes: (types) => set({ selectedProblemTypes: types }),
  setSelectedSubjects: (subjects) => set({ selectedSubjects: subjects }),
}));
