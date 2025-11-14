// Zustand store related types
export interface WorksheetState {
  selectedChapters: string[]; // IDs of selected top-level chapters and their children (only top-level are user-selectable)
  problemCount: number;
  selectedDifficulties: string[]; // Multi-select for difficulties
  selectedProblemTypes: string[]; // Multi-select for problem types
  selectedSubjects: string[]; // IDs of selected related subjects
  correctRateRange: [number, number]; // [min, max] correct rate percentage (0-100)
  selectedYears: number[]; // Selected exam years for filtering problems
  // Economy-specific filters
  selectedGrades: string[]; // ["고1", "고2", "고3"]
  selectedMonths: string[]; // ["03", "04", "06", etc.]
  selectedExamTypes: string[]; // ["학평", "모평", "수능"]
  setSelectedChapters: (chapters: string[]) => void;
  setProblemCount: (count: number) => void;
  setSelectedDifficulties: (difficulties: string[]) => void;
  setSelectedProblemTypes: (types: string[]) => void;
  setSelectedSubjects: (subjects: string[]) => void;
  setCorrectRateRange: (range: [number, number]) => void;
  setSelectedYears: (years: number[]) => void;
  setSelectedGrades: (grades: string[]) => void;
  setSelectedMonths: (months: string[]) => void;
  setSelectedExamTypes: (types: string[]) => void;
}
