import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'student' | 'teacher';

interface AppState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'student',
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((state) => ({
        mode: state.mode === 'student' ? 'teacher' : 'student'
      })),
    }),
    {
      name: 'app-store',
    }
  )
);
