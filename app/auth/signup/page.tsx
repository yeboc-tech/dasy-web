import { AuthGuard } from '@/components/auth/auth-guard'
import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="flex min-h-svh w-full items-center justify-center px-6 md:px-10">
        <div className="w-full max-w-sm pb-[60px]">
          <SignupForm />
        </div>
      </div>
    </AuthGuard>
  )
}