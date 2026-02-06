'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomButton } from '@/components/custom-button'
import { useAuth } from '@/lib/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogPortal,
} from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Check } from 'lucide-react'

interface Subject {
  id: string
  name: string
}

const accountSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // 1. If new password is provided, current password is required
  if (data.newPassword && !data.currentPassword) {
    return false
  }
  return true
}, {
  message: "현재 비밀번호를 입력해주세요",
  path: ['currentPassword'],
}).refine((data) => {
  // 2. New password must be at least 6 characters
  if (data.newPassword && data.newPassword.length < 6) {
    return false
  }
  return true
}, {
  message: "비밀번호는 최소 6자 이상이어야 합니다",
  path: ['newPassword'],
}).refine((data) => {
  // 3. New password and confirm password must match
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
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // 관심 과목 관련 상태
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [subjectsSaving, setSubjectsSaving] = useState(false)

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

  // 과목 목록 및 사용자의 관심 과목 불러오기
  useEffect(() => {
    async function fetchSubjects() {
      // 전체 과목 목록
      const { data: allSubjects } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name')

      if (allSubjects) {
        setSubjects(allSubjects)
      }

      // 사용자의 관심 과목
      if (user) {
        const { data: userSubjects } = await supabase
          .from('user_subjects')
          .select('subject_id')
          .eq('user_id', user.id)

        if (userSubjects) {
          setSelectedSubjects(new Set(userSubjects.map((s) => s.subject_id)))
        }
      }

      setSubjectsLoading(false)
    }

    fetchSubjects()
  }, [user, supabase])

  // 과목 토글
  const toggleSubject = async (subjectId: string) => {
    if (!user || subjectsSaving) return

    setSubjectsSaving(true)
    const newSelected = new Set(selectedSubjects)

    if (newSelected.has(subjectId)) {
      // 삭제
      newSelected.delete(subjectId)
      await supabase
        .from('user_subjects')
        .delete()
        .eq('user_id', user.id)
        .eq('subject_id', subjectId)
    } else {
      // 추가
      newSelected.add(subjectId)
      await supabase
        .from('user_subjects')
        .insert({ user_id: user.id, subject_id: subjectId })
    }

    setSelectedSubjects(newSelected)
    setSubjectsSaving(false)
  }

  const onSubmit = async (data: AccountFormData) => {
    // If no password change requested, do nothing
    if (!data.newPassword) {
      setMessage({ type: 'info', text: '변경할 내용이 없습니다' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      // Verify current password by attempting to sign in
      if (data.currentPassword && user?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: data.currentPassword,
        })

        if (signInError) {
          setMessage({ type: 'error', text: '현재 비밀번호가 올바르지 않습니다' })
          setIsLoading(false)
          return
        }
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      })

      if (updateError) {
        setMessage({ type: 'error', text: '비밀번호 변경 중 오류가 발생했습니다' })
        setIsLoading(false)
        return
      }

      setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다' })

      // Sign out and redirect to login page after a short delay
      setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/auth/signin')
      }, 1500)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message || '오류가 발생했습니다' })
      setIsLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Account Information Section */}
        <div className="px-4 pb-4">
          <h2 className="text-sm font-medium text-black pt-4 mb-4">계정 정보</h2>
          <div className="space-y-4 max-w-md">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-xs font-medium text-black">
                이메일
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                disabled
                className="focus-visible:ring-0 border-gray-300"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border)]" />

        {/* Password Change Section */}
        <div className="px-4 pb-4">
          <h2 className="text-sm font-medium text-black pt-4 mb-4">비밀번호 변경</h2>
          <div className="space-y-4 max-w-md">
            <div className="space-y-3">
              <Label htmlFor="currentPassword" className="text-xs font-medium text-black">
                현재 비밀번호
              </Label>
              <Input
                id="currentPassword"
                type="password"
                {...register('currentPassword')}
                className="focus-visible:ring-0 border-gray-300"
              />
              {errors.currentPassword && (
                <p className="text-xs text-red-500">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="newPassword" className="text-xs font-medium text-black">
                새 비밀번호
              </Label>
              <Input
                id="newPassword"
                type="password"
                {...register('newPassword')}
                className="focus-visible:ring-0 border-gray-300"
              />
              {errors.newPassword && (
                <p className="text-xs text-red-500">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="confirmPassword" className="text-xs font-medium text-black">
                새 비밀번호 확인
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                className="focus-visible:ring-0 border-gray-300"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            {message && (
              <div className={`text-xs ${
                message.type === 'success' ? 'text-green-600' :
                message.type === 'error' ? 'text-red-500' :
                'text-[var(--gray-600)]'
              }`}>
                {message.text}
              </div>
            )}

            <CustomButton
              type="submit"
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? '변경 중...' : '비밀번호 변경'}
            </CustomButton>
          </div>
        </div>
      </form>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* 관심 과목 설정 Section */}
      <div className="px-4 pb-4">
        <h2 className="text-sm font-medium text-black pt-4 mb-4">관심 과목 설정</h2>
        <div className="max-w-md">
          <p className="text-xs text-[var(--gray-600)] mb-4">
            관심 있는 과목을 선택하세요. 선택한 과목을 기반으로 맞춤 콘텐츠를 제공합니다.
          </p>
          {subjectsLoading ? (
            <div className="text-xs text-[var(--gray-500)]">로딩 중...</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => {
                const isSelected = selectedSubjects.has(subject.id)
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => toggleSubject(subject.id)}
                    disabled={subjectsSaving}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors
                      ${isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${subjectsSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {subject.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* Delete Account Section */}
      <div className="px-4 pb-4">
        <h2 className="text-sm font-medium text-black pt-4 mb-4">계정 삭제</h2>
        <div className="space-y-4 max-w-md">
          <p className="text-xs text-[var(--gray-600)]">
            계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
          </p>
          <CustomButton
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="bg-red-500 text-white border-red-500 hover:bg-red-600 hover:border-red-600"
          >
            계정 삭제
          </CustomButton>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogPortal>
          <DialogPrimitive.Content
            className="bg-white fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-gray-200 p-6 shadow-lg"
          >
            <DialogHeader>
              <DialogTitle>정말 계정을 삭제하시겠습니까?</DialogTitle>
              <DialogDescription>
                이 작업은 취소할 수 없습니다. 계정과 관련된 모든 데이터가 영구적으로 삭제됩니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <CustomButton
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(false)}
              >
                취소
              </CustomButton>
              <CustomButton
                variant="outline"
                size="sm"
                onClick={async () => {
                  setIsDeleting(true)
                  try {
                    // Call API to delete user account
                    const response = await fetch('/api/auth/delete-account', {
                      method: 'DELETE',
                    })

                    if (!response.ok) {
                      throw new Error('Failed to delete account')
                    }

                    // Sign out and redirect
                    await supabase.auth.signOut()
                    router.push('/')
                  } catch (error) {
                    console.error('Error deleting account:', error)
                    setMessage({ type: 'error', text: '계정 삭제 중 오류가 발생했습니다.' })
                  } finally {
                    setIsDeleting(false)
                    setShowDeleteDialog(false)
                  }
                }}
                className="bg-red-500 text-white border-red-500 hover:bg-red-600"
                disabled={isDeleting}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </CustomButton>
            </DialogFooter>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  )
}