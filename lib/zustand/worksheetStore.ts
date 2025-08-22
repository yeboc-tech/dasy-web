import { create } from 'zustand';
import type { WorksheetState } from '@/lib/types';

export const useWorksheetStore = create<WorksheetState>((set) => ({
  selectedChapters: [],
  problemCount: 50,
  selectedDifficulties: ['하', '중', '상'], // Default to all selected
  selectedProblemTypes: ['기출문제', 'N제'], // Default to all selected
  selectedSubjects: ['생활과 윤리', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와 법', '사회·문화'], // Default to all selected
  correctRateRange: [0, 100], // Default to all (0-100%)
  setSelectedChapters: (chapters) => set({ selectedChapters: chapters }),
  setProblemCount: (count) => set({ problemCount: count }),
  setSelectedDifficulties: (difficulties) => set({ selectedDifficulties: difficulties }),
  setSelectedProblemTypes: (types) => set({ selectedProblemTypes: types }),
  setSelectedSubjects: (subjects) => set({ selectedSubjects: subjects }),
  setCorrectRateRange: (range) => set({ correctRateRange: range }),
}));
