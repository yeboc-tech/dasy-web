import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export type SubscriptionType = 'FREE' | 'PRO';

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
  setNickname: (nickname: string) => void;
  fetchAccount: (userId: string) => Promise<void>;
}

export const useUserAccountStore = create<UserAccountState>((set) => ({
  nickname: null,
  subscriptionType: 'FREE',
  userType: 'STUDENT',
  point: 0,

  setNickname: (nickname) => set({ nickname }),

  fetchAccount: async (userId) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('user_account')
      .select('nickname, subscription_type, user_type, point')
      .eq('id', userId)
      .single();
    if (data) {
      set({
        nickname: data.nickname,
        subscriptionType: (data.subscription_type as SubscriptionType) || 'FREE',
        userType: (data.user_type as UserType) || 'STUDENT',
        point: data.point ?? 0,
      });
    }
  },
}));
