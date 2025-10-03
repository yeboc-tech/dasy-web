'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const loginSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function DataLoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        // Translate common Supabase auth errors to Korean
        const errorMessage = authError.message === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않습니다'
          : authError.message === 'Email not confirmed'
          ? '이메일 인증이 필요합니다'
          : '로그인 중 오류가 발생했습니다';
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      // Check if user has admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        await supabase.auth.signOut()
        setError('관리자 권한이 없습니다.')
        return
      }

      router.refresh()
      router.push('/data/problems')
    } catch (err) {
      setError((err as Error).message || '로그인 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">KIDARI 데이터</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white border">
              <div className="border-b">
                <Input
                  id="email"
                  type="email"
                  placeholder="이메일"
                  {...register('email')}
                  className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="border-b">
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호"
                  {...register('password')}
                  className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div>
                <Button
                  type="submit"
                  className="w-full bg-gray-100 text-black hover:bg-black hover:text-white rounded-none border-0"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : '로그인'}
                </Button>
              </div>
            </div>

            {(errors.email || errors.password || error) && (
              <div className="mt-4 text-sm text-destructive text-center">
                {errors.email?.message || errors.password?.message || error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
