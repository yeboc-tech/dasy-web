'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthActions } from '@/lib/hooks/use-auth'

const forgotPasswordSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { resetPassword } = useAuthActions()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      await resetPassword(data.email)
      setSuccess(true)
    } catch (err) {
      setError((err as Error).message || '비밀번호 재설정 이메일 전송 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">이메일을 확인해주세요</h1>
          <p className="text-sm text-muted-foreground">
            이메일 주소로 비밀번호 재설정 링크를 보내드렸습니다. 링크를 클릭하여 비밀번호를 재설정해주세요.
          </p>
        </div>
        <div className="text-center">
          <Link href="/auth/signin" className="font-medium text-primary hover:underline">
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">비밀번호 재설정</h1>
        <p className="text-sm text-muted-foreground">
          이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            placeholder="example@email.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        {error && (
          <div className="text-sm text-destructive text-center">{error}</div>
        )}

        <Button type="submit" className="w-full bg-black text-white hover:bg-black/90" disabled={isLoading}>
          {isLoading ? '전송 중...' : '재설정 링크 전송'}
        </Button>
      </form>

      <div className="text-center text-sm">
        비밀번호가 기억나셨나요?{' '}
        <Link href="/auth/signin" className="font-medium text-primary hover:underline">
          로그인
        </Link>
      </div>
    </div>
  )
}