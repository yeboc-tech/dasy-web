import { ProtectedRoute } from '@/components/auth/protected-route'
import { AccountForm } from '@/components/auth/account-form'

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">계정 설정</h1>
          <AccountForm />
        </div>
      </div>
    </ProtectedRoute>
  )
}