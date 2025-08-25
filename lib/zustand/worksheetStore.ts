import { create } from 'zustand';
import type { WorksheetState } from '@/lib/types';

export const useWorksheetStore = create<WorksheetState>((set) => ({
  selectedChapters: [], // Will be set by simulating checkbox click
  problemCount: 50,
  selectedDifficulties: ['상', '중', '하'], // Default to all selected
  selectedProblemTypes: ['기출문제', 'N제'], // Default to all selected
  selectedSubjects: ['생활과 윤리', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와 법', '사회·문화'], // Default to all selected
  correctRateRange: [0, 100], // Default to all (0-100%)
  setSelectedChapters: (chapters) => set({ selectedChapters: chapters }),
  setProblemCount: (count) => set({ problemCount: count }),
  setSelectedDifficulties: (difficulties) => set(() => {
    // Convert difficulties to correct rate range
    const getCorrectRateFromDifficulties = (diffs: string[]): [number, number] => {
      if (diffs.length === 3) return [0, 100]; // All selected
      
      let min = 100, max = 0;
      diffs.forEach(diff => {
        switch (diff) {
          case '상': min = Math.min(min, 0); max = Math.max(max, 39); break;
          case '중': min = Math.min(min, 40); max = Math.max(max, 59); break;
          case '하': min = Math.min(min, 60); max = Math.max(max, 100); break;
        }
      });
      return [min, max];
    };
    
    const newCorrectRateRange = getCorrectRateFromDifficulties(difficulties);
    return { selectedDifficulties: difficulties, correctRateRange: newCorrectRateRange };
  }),
  setSelectedProblemTypes: (types) => set({ selectedProblemTypes: types }),
  setSelectedSubjects: (subjects) => set({ selectedSubjects: subjects }),
  setCorrectRateRange: (range) => set(() => {
    // Convert correct rate range to difficulties
    const getDifficultiesFromCorrectRate = (range: [number, number]): string[] => {
      if (range[0] === 0 && range[1] === 100) return ['상', '중', '하']; // Full range
      
      const difficulties: string[] = [];
      if (range[0] <= 39 && range[1] >= 0) difficulties.push('상');
      if (range[0] <= 59 && range[1] >= 40) difficulties.push('중');
      if (range[0] <= 100 && range[1] >= 60) difficulties.push('하');
      
      return difficulties.length > 0 ? difficulties : ['상', '중', '하'];
    };
    
    const newDifficulties = getDifficultiesFromCorrectRate(range);
    return { correctRateRange: range, selectedDifficulties: newDifficulties };
  }),
}));
