import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { getGradeFromSuneungYear } from '@/lib/utils/gradeUtils';

export type OmrPosition = 'left' | 'right';
export type ProblemRange = 'recent3' | 'recent5' | 'total';
export type CurrentGrade = '고3' | '고2' | '고1';
export type SolveMode = 'pdf' | 'tablet';

interface UserAppSettingState {
  // State
  targetSuneungYear: number | null;
  currentGrade: CurrentGrade;
  omrPosition: OmrPosition;
  solveMode: SolveMode;
  problemRange: ProblemRange;
  interestSubjectIds: string[];
  loading: boolean;
  initialized: boolean;

  // Actions
  setTargetSuneungYear: (year: number | null) => void;
  setOmrPosition: (position: OmrPosition) => void;
  setSolveMode: (mode: SolveMode) => void;
  setProblemRange: (range: ProblemRange) => void;
  setInterestSubjectIds: (ids: string[]) => void;

  // Fetch from Supabase
  fetchSettings: (userId: string, force?: boolean) => Promise<void>;

  // Update to Supabase
  updateSettings: (userId: string, updates: Partial<{
    suneung_year: number;
    omr_position: OmrPosition;
    solve_mode: SolveMode;
    problem_range: ProblemRange;
    interest_subject_ids: string[];
  }>) => Promise<void>;

  // Reset store
  reset: () => void;
}

const initialState = {
  targetSuneungYear: null as number | null,
  currentGrade: '고3' as CurrentGrade,
  omrPosition: 'right' as OmrPosition,
  solveMode: 'tablet' as SolveMode,
  problemRange: 'total' as ProblemRange,
  interestSubjectIds: [] as string[],
  loading: true,
  initialized: false,
};

export const useUserAppSettingStore = create<UserAppSettingState>((set, get) => ({
  ...initialState,

  setTargetSuneungYear: (year) => set({
    targetSuneungYear: year,
    currentGrade: year ? getGradeFromSuneungYear(year) : '고3',
  }),
  setOmrPosition: (position) => set({ omrPosition: position }),
  setSolveMode: (mode) => set({ solveMode: mode }),
  setProblemRange: (range) => set({ problemRange: range }),
  setInterestSubjectIds: (ids) => set({ interestSubjectIds: ids }),

  fetchSettings: async (userId: string, force: boolean = false) => {
    if (get().initialized && !force) {
      set({ loading: false });
      return;
    }

    try {
      set({ loading: true });
      const supabase = createClient();

      const { data: settings } = await supabase
        .from('user_app_setting')
        .select('omr_position, solve_mode, interest_subject_ids, suneung_year, problem_range')
        .eq('user_id', userId)
        .single();

      if (settings) {
        const targetSuneungYear = settings.suneung_year || null;
        set({
          targetSuneungYear,
          currentGrade: targetSuneungYear ? getGradeFromSuneungYear(targetSuneungYear) : '고3',
          omrPosition: settings.omr_position || 'right',
          solveMode: settings.solve_mode || 'pdf',
          problemRange: settings.problem_range || 'total',
          interestSubjectIds: settings.interest_subject_ids || [],
          initialized: true,
        });
      } else {
        set({ initialized: true });
      }
    } catch (error) {
      console.error('Error fetching user app settings:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateSettings: async (userId: string, updates) => {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('user_app_setting')
        .upsert({
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving settings:', error);
        return;
      }

      // Update local state
      if (updates.suneung_year !== undefined) {
        set({
          targetSuneungYear: updates.suneung_year,
          currentGrade: getGradeFromSuneungYear(updates.suneung_year),
        });
      }
      if (updates.omr_position !== undefined) {
        set({ omrPosition: updates.omr_position });
      }
      if (updates.solve_mode !== undefined) {
        set({ solveMode: updates.solve_mode });
      }
      if (updates.problem_range !== undefined) {
        set({ problemRange: updates.problem_range });
      }
      if (updates.interest_subject_ids !== undefined) {
        set({ interestSubjectIds: updates.interest_subject_ids });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  },

  reset: () => set(initialState),
}));
