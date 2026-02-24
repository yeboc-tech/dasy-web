'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/auth-context';

const planOptions = [
  { value: 'PRO', label: 'PRO', price: '10,000원 / 월', amount: 10000 },
  { value: 'TEACHER', label: 'TEACHER', price: '49,000원 / 월', amount: 49000 },
];

interface PendingSubmission {
  id: string;
  plan_type: string;
  depositor_name: string;
  status: string;
  created_at: string;
}

export function PurchaseFlow() {
  const { user } = useAuth();
  const supabase = createClient();
  const [selectedPlan, setSelectedPlan] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [depositorName, setDepositorName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<PendingSubmission | null>(null);
  const selected = planOptions.find((p) => p.value === selectedPlan);

  // 48시간 이내 USER_SUBMIT 기록 조회
  useEffect(() => {
    if (!user) return;
    const fetchPending = async () => {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('user_subscription')
        .select('id, plan_type, depositor_name, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'USER_SUBMIT')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setPendingSubmission(data);
        setSelectedPlan(data.plan_type);
        setDepositorName(data.depositor_name || '');
        setShowPayment(true);
        setSubmitted(!!data.depositor_name);
      }
    };
    fetchPending();
  }, [user]);

  const handlePurchase = async () => {
    if (!user || !selected) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from('user_subscription')
      .insert({
        user_id: user.id,
        plan_type: selected.value,
        amount: selected.amount,
      })
      .select('id, plan_type, depositor_name, status, created_at')
      .single();
    setSubmitting(false);
    if (!error && data) {
      setPendingSubmission(data);
      setShowPayment(true);
    }
  };

  const handleSubmitDepositor = async () => {
    if (!pendingSubmission || !depositorName.trim()) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('user_subscription')
      .update({ depositor_name: depositorName.trim() })
      .eq('id', pendingSubmission.id);
    setSubmitting(false);
    if (!error) {
      setPendingSubmission({ ...pendingSubmission, depositor_name: depositorName.trim() });
      setSubmitted(true);
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

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">요금제 선택</span>
          <div className="relative">
            <select
              value={selectedPlan}
              onChange={(e) => { setSelectedPlan(e.target.value); setShowPayment(false); setSubmitted(false); }}
              disabled={!!pendingSubmission}
              className="appearance-none px-4 py-2.5 pr-10 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF00A1] focus:border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" disabled>선택하세요</option>
              {planOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <span className={`text-xl font-bold ${selected ? 'text-[var(--foreground)]' : 'text-gray-300'}`}>
            {selected ? selected.price : '-'}
          </span>
          <button
            disabled={!selected || !!pendingSubmission || submitting}
            onClick={handlePurchase}
            className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              selected && !pendingSubmission
                ? 'bg-[#FF00A1] text-white hover:bg-[#e0008f] cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            구매하기
          </button>
        </div>
      </div>

      {/* Payment Info */}
      {showPayment && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <p className="text-sm font-medium text-[var(--foreground)]">
            구매 신청이 완료되었습니다. 아래 계좌로 입금 후 입금자명을 제출해주세요.
          </p>
          <div className="mt-3 text-sm text-gray-600 space-y-1">
            <p>Email : <span className="font-medium">{user?.email}</span></p>
            <p>요금제 : <span className="font-medium">{pendingSubmission?.plan_type}</span></p>
            <p>신청일시 : <span className="font-medium">{pendingSubmission ? formatDate(pendingSubmission.created_at) : ''}</span></p>
          </div>
          <p className="text-sm text-gray-700 mt-3">
            계좌번호 : <span className="font-medium">1002-890-007769 우리은행</span>
          </p>
          <p className="text-sm text-gray-700 mt-1">
            예금주 : <span className="font-medium">김도윤</span>
          </p>

          <div className="flex items-center gap-3 mt-4">
            <span className="text-sm text-gray-700 shrink-0">입금자명 :</span>
            <input
              type="text"
              value={depositorName}
              onChange={(e) => { setDepositorName(e.target.value); setSubmitted(false); }}
              placeholder="입금자명을 입력하세요"
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF00A1] focus:border-transparent flex-1 max-w-xs"
            />
            <button
              disabled={!depositorName.trim() || submitted || submitting}
              onClick={handleSubmitDepositor}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
                depositorName.trim() && !submitted && !submitting
                  ? 'bg-[var(--foreground)] text-white hover:bg-gray-800 cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {submitting ? '제출 중...' : '제출하기'}
            </button>
          </div>
          {submitted && (
            <p className="text-sm text-green-600 mt-3">제출이 완료되었습니다. 입금 확인 후 구독이 활성화됩니다.</p>
          )}
          {pendingSubmission?.depositor_name && submitted && (
            <p className="text-xs text-gray-400 mt-1">상태 : 입금 확인 대기중</p>
          )}
        </div>
      )}
    </div>
  );
}
