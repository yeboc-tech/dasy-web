import { create } from 'zustand';

interface SelectedSubjectState {
  selectedSubject: string | null;
  setSelectedSubject: (subject: string | null) => void;
}

export const useSelectedSubjectStore = create<SelectedSubjectState>((set) => ({
  selectedSubject: null,
  setSelectedSubject: (subject) => set({ selectedSubject: subject }),
}));
