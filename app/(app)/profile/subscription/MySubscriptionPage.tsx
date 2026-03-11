'use client';

import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/contexts/auth-context';
import { useUserAccountStore } from '@/lib/zustand/userAccountStore';
import { createClient } from '@/lib/supabase/client';

interface Submission {
  id: string;
  plan_type: string;
  amount: number;
  depositor_name: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  reject_reason: string | null;
  subscription_started_at: string | null;
  subscription_ended_at: string | null;
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  USER_SUBMIT: { text: '신청완료', className: 'bg-amber-50 text-amber-700' },
  CONFIRMED: { text: '승인', className: 'bg-green-50 text-green-700' },
  REJECTED: { text: '거절', className: 'bg-red-50 text-red-700' },
};

export function MySubscriptionPage() {
  const { user } = useAuth();
  const { subscriptionType } = useUserAccountStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositorInputs, setDepositorInputs] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchSubmissions = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('user_subscription')
        .select('id, plan_type, amount, depositor_name, status, created_at, confirmed_at, reject_reason, subscription_started_at, subscription_ended_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setSubmissions(data || []);
      setLoading(false);
    };
    fetchSubmissions();
  }, [user]);

  const handleSubmitDepositor = async (subId: string) => {
    const name = depositorInputs[subId]?.trim();
    if (!name) return;
    setSubmittingId(subId);
    const supabase = createClient();
    const { error } = await supabase
      .from('user_subscription')
      .update({ depositor_name: name })
      .eq('id', subId);
    setSubmittingId(null);
    if (!error) {
      setSubmissions((prev) =>
        prev.map((s) => s.id === subId ? { ...s, depositor_name: name } : s)
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getDDay = (startedAt: string, endedAt: string): string | null => {
    const now = new Date();
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    if (now > end) return '만료';
    if (now < start) return null;
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `D-${diffDays}`;
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString() + '원';
  };

  return (
    <ProtectedRoute>
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">구독 관리</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Current Plan */}
          <div className="px-4 pb-4">
            <h2 className="text-sm font-medium text-black pt-4 mb-4">현재 구독</h2>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${
                subscriptionType === 'PRO'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {subscriptionType}
              </span>
              <Link
                href="/subscription"
                className="text-sm text-[#FF00A1] hover:underline font-medium"
              >
                {subscriptionType === 'FREE' ? '구독하기' : '구독 변경'}
              </Link>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--border)]" />

          {/* Submission History */}
          <div className="px-4 pb-4">
            <h2 className="text-sm font-medium text-black pt-4 mb-4">신청 내역</h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="animate-spin w-5 h-5 text-gray-400" />
              </div>
            ) : submissions.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">신청 내역이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {submissions.map((sub) => {
                  const isWaitingDeposit = sub.status === 'USER_SUBMIT' && !sub.depositor_name;
                  const statusInfo = isWaitingDeposit
                    ? { text: '입금 대기중', className: 'bg-orange-50 text-orange-600' }
                    : STATUS_LABEL[sub.status] || { text: sub.status, className: 'bg-gray-100 text-gray-600' };
                  return (
                    <div key={sub.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--foreground)]">{sub.plan_type}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${statusInfo.className}`}>
                            {statusInfo.text}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">주문번호 : {sub.id}</span>
                      </div>
                      {/* 구독 기간 */}
                      {sub.subscription_started_at && sub.subscription_ended_at && (() => {
                        const dday = getDDay(sub.subscription_started_at!, sub.subscription_ended_at!);
                        return (
                          <div className="bg-gray-50 rounded-lg px-4 py-3 mb-3 flex items-center gap-3">
                            <span className="text-xs text-gray-500 shrink-0">구독 기간</span>
                            <span className="text-sm font-semibold text-[var(--foreground)]">
                              {formatDateShort(sub.subscription_started_at!)}
                            </span>
                            <span className="text-xs text-gray-400">~</span>
                            <span className="text-sm font-semibold text-[var(--foreground)]">
                              {formatDateShort(sub.subscription_ended_at!)}
                            </span>
                            {dday && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                dday === '만료' ? 'text-gray-500 bg-gray-100' : 'text-[#FF00A1] bg-pink-50'
                              }`}>
                                {dday}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>금액 : {formatAmount(sub.amount)}</p>
                        <p>입금자명 : {sub.depositor_name || '-'}</p>
                        {sub.confirmed_at && (
                          <p>처리일 : {formatDate(sub.confirmed_at)}</p>
                        )}
                        {sub.reject_reason && (
                          <p className="text-red-500">거절 사유 : {sub.reject_reason}</p>
                        )}
                      </div>
                      {/* 입금 대기중: 계좌 정보 + 입금자명 입력 */}
                      {isWaitingDeposit && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>계좌번호 : <span className="font-medium">1002-890-007769 우리은행</span></p>
                            <p>예금주 : <span className="font-medium">김도윤</span></p>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <input
                              type="text"
                              value={depositorInputs[sub.id] || ''}
                              onChange={(e) => setDepositorInputs((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                              placeholder="입금자명을 입력하세요"
                              className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF00A1] focus:border-transparent flex-1 max-w-xs"
                            />
                            <button
                              disabled={!depositorInputs[sub.id]?.trim() || submittingId === sub.id}
                              onClick={() => handleSubmitDepositor(sub.id)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                depositorInputs[sub.id]?.trim() && submittingId !== sub.id
                                  ? 'bg-[var(--foreground)] text-white hover:bg-gray-800 cursor-pointer'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {submittingId === sub.id ? '제출 중...' : '제출하기'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
