'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthActions } from '@/lib/hooks/use-auth'
import { useAuth } from '@/lib/contexts/auth-context'

const resetPasswordSchema = z.object({
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ['confirmPassword'],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { updatePassword } = useAuthActions()
  const { user, loading } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      await updatePassword(data.password)
      router.push('/auth/signin?message=비밀번호가 성공적으로 변경되었습니다')
    } catch (err) {
      setError((err as Error).message || '비밀번호 업데이트 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex flex-col gap-6 items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If no authenticated session, show error message
  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">세션이 만료되었습니다</h1>
          <p className="text-sm text-muted-foreground">
            비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.<br />
            다시 비밀번호 재설정을 요청해주세요.
          </p>
        </div>
        <div className="text-center">
          <Link href="/auth/forgot-password" className="font-medium text-primary hover:underline">
            비밀번호 재설정 요청
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">새 비밀번호 설정</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">{user.email}</span> 계정의 새로운 비밀번호를 입력해주세요
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">새 비밀번호</Label>
          <Input
            id="password"
            type="password"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        {error && (
          <div className="text-sm text-destructive text-center">{error}</div>
        )}

        <Button type="submit" className="w-full bg-black text-white hover:bg-black/90" disabled={isLoading}>
          {isLoading ? '업데이트 중...' : '비밀번호 업데이트'}
        </Button>
      </form>
    </div>
  )
}