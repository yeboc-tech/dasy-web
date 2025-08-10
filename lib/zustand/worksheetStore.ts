import { create } from 'zustand';

interface WorksheetState {
  selectedChapters: string[]; // IDs of selected top-level chapters and their children (only top-level are user-selectable)
  problemCount: number;
  difficulty: string;
  problemType: string;
  selectedSubjects: string[]; // IDs of selected related subjects
  setSelectedChapters: (chapters: string[]) => void;
  setProblemCount: (count: number) => void;
  setDifficulty: (difficulty: string) => void;
  setProblemType: (type: string) => void;
  setSelectedSubjects: (subjects: string[]) => void;
}

export const useWorksheetStore = create<WorksheetState>((set) => ({
  selectedChapters: [],
  problemCount: 50,
  difficulty: '모두',
  problemType: '모두',
  selectedSubjects: [],
  setSelectedChapters: (chapters) => set({ selectedChapters: chapters }),
  setProblemCount: (count) => set({ problemCount: count }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setProblemType: (type) => set({ problemType: type }),
  setSelectedSubjects: (subjects) => set({ selectedSubjects: subjects }),
}));
