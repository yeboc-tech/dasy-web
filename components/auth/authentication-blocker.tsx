'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { CustomButton } from '@/components/custom-button';

export function AuthenticationBlocker() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-4">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
            <Lock className="w-6 h-6 text-[var(--gray-600)]" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-[var(--foreground)]">
          로그인이 필요합니다
        </h2>

        {/* Description */}
        <p className="text-sm text-[var(--gray-600)]">
          이 페이지를 이용하려면 로그인해주세요
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <Link href="/auth/signin">
            <CustomButton variant="outline" size="sm">
              로그인
            </CustomButton>
          </Link>
          <Link href="/auth/signup">
            <CustomButton variant="secondary" size="sm">
              회원가입
            </CustomButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
