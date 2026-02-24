import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export type SubscriptionType = 'FREE' | 'PRO';

interface UserAccountState {
  nickname: string | null;
  subscriptionType: SubscriptionType;
  point: number;
  setNickname: (nickname: string) => void;
  fetchAccount: (userId: string) => Promise<void>;
}

export const useUserAccountStore = create<UserAccountState>((set) => ({
  nickname: null,
  subscriptionType: 'FREE',
  point: 0,

  setNickname: (nickname) => set({ nickname }),

  fetchAccount: async (userId) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('user_account')
      .select('nickname, subscription_type, point')
      .eq('id', userId)
      .single();
    if (data) {
      set({
        nickname: data.nickname,
        subscriptionType: (data.subscription_type as SubscriptionType) || 'FREE',
        point: data.point ?? 0,
      });
    }
  },
}));
