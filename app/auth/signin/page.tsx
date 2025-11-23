import { AuthGuard } from '@/components/auth/auth-guard'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="flex min-h-svh w-full items-center justify-center px-6 md:px-10">
        <div className="w-full max-w-sm pb-[60px]">
          <LoginForm />
        </div>
      </div>
    </AuthGuard>
  )
}