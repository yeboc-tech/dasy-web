import { create } from 'zustand';
import type { WorksheetState } from '@/lib/types';

export const useWorksheetStore = create<WorksheetState>((set) => ({
  selectedChapters: [], // Will be set by simulating checkbox click
  problemCount: 50,
  selectedDifficulties: ['최상', '상', '중상', '중', '중하', '하'], // Default to all 6 levels (for economy compatibility)
  selectedProblemTypes: ['기출문제', 'N제'], // Default to all selected
  selectedSubjects: ['생활과 윤리', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와 법', '사회·문화'], // Default to all selected
  correctRateRange: [0, 100], // Default to all (0-100%)
  selectedYears: Array.from({ length: 2025 - 2012 + 1 }, (_, i) => 2012 + i), // Default to all years (2012-2025)
  selectedGrades: ['고3'], // Default to 고3 only for economy mode (only 고3 exists)
  selectedMonths: ['03', '04', '05', '06', '07', '08', '09', '10', '11', '12'], // Default to all months for economy mode
  selectedExamTypes: ['학평', '모평', '수능'], // Default to all exam types for economy mode
  setSelectedChapters: (chapters) => set({ selectedChapters: chapters }),
  setProblemCount: (count) => set({ problemCount: count }),
  setSelectedDifficulties: (difficulties) => set({ selectedDifficulties: difficulties }),
  setSelectedProblemTypes: (types) => set({ selectedProblemTypes: types }),
  setSelectedSubjects: (subjects) => set({ selectedSubjects: subjects }),
  setCorrectRateRange: (range) => set({ correctRateRange: range }),
  setSelectedYears: (years) => set({ selectedYears: years }),
  setSelectedGrades: (grades) => set({ selectedGrades: grades }),
  setSelectedMonths: (months) => set({ selectedMonths: months }),
  setSelectedExamTypes: (types) => set({ selectedExamTypes: types }),
}));
