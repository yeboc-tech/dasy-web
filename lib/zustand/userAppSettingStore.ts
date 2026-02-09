import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export type OmrPosition = 'left' | 'right';
export type ProblemRange = 'recent3' | 'recent5' | 'total';
export type CurrentGrade = 'g3' | 'g2' | 'g1';

interface UserAppSettingState {
  // State
  suneungYear: number | null;
  currentGrade: CurrentGrade;
  omrPosition: OmrPosition;
  problemRange: ProblemRange;
  interestSubjectIds: string[];
  loading: boolean;
  initialized: boolean;

  // Actions
  setSuneungYear: (year: number | null) => void;
  setCurrentGrade: (grade: CurrentGrade) => void;
  setOmrPosition: (position: OmrPosition) => void;
  setProblemRange: (range: ProblemRange) => void;
  setInterestSubjectIds: (ids: string[]) => void;

  // Fetch from Supabase
  fetchSettings: (userId: string, force?: boolean) => Promise<void>;

  // Update to Supabase
  updateSettings: (userId: string, updates: Partial<{
    suneung_year: number;
    current_grade: CurrentGrade;
    omr_position: OmrPosition;
    problem_range: ProblemRange;
    interest_subject_ids: string[];
  }>) => Promise<void>;

  // Reset store
  reset: () => void;
}

const initialState = {
  suneungYear: null as number | null,
  currentGrade: 'g3' as CurrentGrade,
  omrPosition: 'right' as OmrPosition,
  problemRange: 'total' as ProblemRange,
  interestSubjectIds: [] as string[],
  loading: true,
  initialized: false,
};

export const useUserAppSettingStore = create<UserAppSettingState>((set, get) => ({
  ...initialState,

  setSuneungYear: (year) => set({ suneungYear: year }),
  setCurrentGrade: (grade) => set({ currentGrade: grade }),
  setOmrPosition: (position) => set({ omrPosition: position }),
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
        .select('omr_position, interest_subject_ids, suneung_year, current_grade, problem_range')
        .eq('user_id', userId)
        .single();

      if (settings) {
        set({
          suneungYear: settings.suneung_year || null,
          currentGrade: settings.current_grade || 'g3',
          omrPosition: settings.omr_position || 'right',
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
        set({ suneungYear: updates.suneung_year });
      }
      if (updates.current_grade !== undefined) {
        set({ currentGrade: updates.current_grade });
      }
      if (updates.omr_position !== undefined) {
        set({ omrPosition: updates.omr_position });
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
