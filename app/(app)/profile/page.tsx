'use client';

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AccountForm } from '@/components/auth/account-form'

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">프로필</h1>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <AccountForm />
        </div>
      </div>
    </ProtectedRoute>
  )
}