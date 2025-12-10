import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center px-6 md:px-10">
      <div className="w-full max-w-sm pb-[60px]">
        <ResetPasswordForm />
      </div>
    </div>
  )
}