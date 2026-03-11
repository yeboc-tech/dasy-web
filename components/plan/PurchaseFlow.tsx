'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/auth-context';

const planOptions = [
  { value: 'PRO', label: 'PRO', price: '14,900원 / 월', amount: 14900 },
  { value: 'TEACHER', label: 'TEACHER', price: '49,000원 / 월', amount: 49000 },
];

export function PurchaseFlow() {
  const { user } = useAuth();
  const supabase = createClient();
  const [selectedPlan, setSelectedPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const selected = planOptions.find((p) => p.value === selectedPlan);

  const handlePurchase = async () => {
    if (!user || !selected) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('user_subscription')
      .insert({
        user_id: user.id,
        plan_type: selected.value,
        amount: selected.amount,
      });
    setSubmitting(false);
    if (!error) {
      setPurchased(true);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      {/* 요금제 선택 */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">요금제 선택</span>
        <div className="relative">
          <select
            value={selectedPlan}
            onChange={(e) => { setSelectedPlan(e.target.value); setPurchased(false); }}
            disabled={purchased}
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

      {/* 결제 정보 (요금제 선택 시 표시) */}
      {selected && !purchased && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="bg-gray-50 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">정기결제 금액</span>
              <span className="text-lg font-bold text-[var(--foreground)]">{selected.price}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">결제 주기</span>
              <span className="text-sm font-medium text-[var(--foreground)]">매월 11일</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">해지 방법</span>
              <span className="text-sm font-medium text-[var(--foreground)]">설정 &gt; 구독 관리에서 해지</span>
            </div>
          </div>
          <button
            disabled={submitting}
            onClick={handlePurchase}
            className="w-full mt-4 py-3 rounded-lg text-sm font-semibold transition-colors bg-[#FF00A1] text-white hover:bg-[#e0008f] cursor-pointer disabled:opacity-50"
          >
            {submitting ? '처리 중...' : '구매하기'}
          </button>
        </div>
      )}

      {/* 구매 완료 */}
      {purchased && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <p className="text-sm text-green-600 font-medium">구매 신청이 완료되었습니다.</p>
        </div>
      )}
    </div>
  );
}
