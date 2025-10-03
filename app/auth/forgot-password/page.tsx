import { AuthGuard } from '@/components/auth/auth-guard'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <ForgotPasswordForm />
        </div>
      </div>
    </AuthGuard>
  )
}