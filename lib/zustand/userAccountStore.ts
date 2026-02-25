import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export type SubscriptionType = 'FREE' | 'PRO';

export interface ProfileJson {
  name: string;
  variant: string;
  colors: string[];
}

const DEFAULT_PROFILE: ProfileJson = {
  name: 'kidari',
  variant: 'beam',
  colors: ['#FF00A1', '#92A1C6', '#146A7C', '#F0AB3D', '#C271B4'],
};

export type UserType = 'STUDENT' | 'TEACHER' | 'ADMIN';

const USER_TYPE_LABEL: Record<UserType, string> = {
  STUDENT: '학생',
  TEACHER: '선생님',
  ADMIN: '관리자',
};

export function getUserTypeLabel(userType: UserType): string {
  return USER_TYPE_LABEL[userType] ?? userType;
}

interface UserAccountState {
  nickname: string | null;
  subscriptionType: SubscriptionType;
  userType: UserType;
  point: number;
  profileJson: ProfileJson;
  setNickname: (nickname: string) => void;
  setProfileJson: (profileJson: ProfileJson) => void;
  fetchAccount: (userId: string) => Promise<void>;
}

export const useUserAccountStore = create<UserAccountState>((set) => ({
  nickname: null,
  subscriptionType: 'FREE',
  userType: 'STUDENT',
  point: 0,
  profileJson: DEFAULT_PROFILE,

  setNickname: (nickname) => set({ nickname }),
  setProfileJson: (profileJson) => set({ profileJson }),

  fetchAccount: async (userId) => {
    const supabase = createClient();
    const [accountRes, subscriptionRes] = await Promise.all([
      supabase
        .from('user_account')
        .select('nickname, user_type, point, profile_json')
        .eq('id', userId)
        .single(),
      supabase.rpc('get_active_subscription', { p_user_id: userId }),
    ]);
    if (accountRes.data) {
      set({
        nickname: accountRes.data.nickname,
        subscriptionType: (subscriptionRes.data as SubscriptionType) || 'FREE',
        userType: (accountRes.data.user_type as UserType) || 'STUDENT',
        point: accountRes.data.point ?? 0,
        profileJson: (accountRes.data.profile_json as ProfileJson) ?? DEFAULT_PROFILE,
      });
    }
  },
}));
