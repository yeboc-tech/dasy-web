'use client';

import Link from 'next/link';
import { PlanCards } from '@/components/plan/PlanCards';
import { PurchaseFlow } from '@/components/plan/PurchaseFlow';
import { Footer } from '@/components/Footer';

export function SubscriptionPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="text-lg font-bold text-[var(--foreground)]">
            KIDARI
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-4 py-16">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">요금제</h1>
        <p className="text-sm text-gray-500 mb-10">나에게 맞는 플랜을 선택하세요</p>

        <div className="max-w-4xl w-full">
          <PlanCards />
        </div>

        <div className="max-w-4xl w-full mt-10">
          <PurchaseFlow />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
