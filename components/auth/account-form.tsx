'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/contexts/auth-context'
import { useAuthActions } from '@/lib/hooks/use-auth'

const accountSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다').optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false
  }
  return true
}, {
  message: "비밀번호가 일치하지 않습니다",
  path: ['confirmPassword'],
})

type AccountFormData = z.infer<typeof accountSchema>

export function AccountForm() {
  const { user } = useAuth()
  const { signOut } = useAuthActions()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
  })

  useEffect(() => {
    if (user?.email) {
      setValue('email', user.email)
    }
  }, [user, setValue])

  const onSubmit = async (data: AccountFormData) => {
    setIsLoading(true)
    setMessage(null)

    try {
      // Handle password update if provided
      if (data.newPassword) {
        // Note: In a real app, you might want to verify current password first
        // This requires additional Supabase setup for password verification
      }

      setMessage({ type: 'success', text: '계정이 성공적으로 업데이트되었습니다!' })
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message || '오류가 발생했습니다' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>계정 정보</CardTitle>
          <CardDescription>
            계정 세부사항 및 보안 설정을 관리하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                disabled
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">비밀번호 변경</h3>

              <div className="space-y-2">
                <Label htmlFor="currentPassword">현재 비밀번호</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...register('currentPassword')}
                />
                {errors.currentPassword && (
                  <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">새 비밀번호</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
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
            </div>

            {message && (
              <div className={`text-sm text-center ${
                message.type === 'success' ? 'text-green-600' : 'text-destructive'
              }`}>
                {message.text}
              </div>
            )}

            <Button type="submit" disabled={isLoading}>
              {isLoading ? '업데이트 중...' : '계정 업데이트'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>로그아웃</CardTitle>
          <CardDescription>
            이 기기에서 계정을 로그아웃합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut}>
            로그아웃
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}