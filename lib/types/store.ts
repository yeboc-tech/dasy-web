// Zustand store related types
export interface WorksheetState {
  selectedChapters: string[]; // IDs of selected top-level chapters and their children (only top-level are user-selectable)
  problemCount: number;
  selectedDifficulties: string[]; // Multi-select for difficulties
  selectedProblemTypes: string[]; // Multi-select for problem types
  selectedSubjects: string[]; // IDs of selected related subjects
  correctRateRange: [number, number]; // [min, max] correct rate percentage (0-100)
  setSelectedChapters: (chapters: string[]) => void;
  setProblemCount: (count: number) => void;
  setSelectedDifficulties: (difficulties: string[]) => void;
  setSelectedProblemTypes: (types: string[]) => void;
  setSelectedSubjects: (subjects: string[]) => void;
  setCorrectRateRange: (range: [number, number]) => void;
}
