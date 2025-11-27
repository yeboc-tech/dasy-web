import { AuthGuard } from '@/components/auth/auth-guard'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="flex min-h-svh w-full items-center justify-center px-6 md:px-10">
        <div className="w-full max-w-sm pb-[60px]">
          <ForgotPasswordForm />
        </div>
      </div>
    </AuthGuard>
  )
}