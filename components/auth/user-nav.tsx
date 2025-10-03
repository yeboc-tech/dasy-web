'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/contexts/auth-context'
import { useAuthActions } from '@/lib/hooks/use-auth'

export function UserNav() {
  const { user, loading } = useAuth()
  const { signOut } = useAuthActions()

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <Button variant="ghost" asChild>
          <Link href="/auth/signin">로그인</Link>
        </Button>
        <Button asChild>
          <Link href="/auth/signup">회원가입</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600">
        환영합니다, {user.email}
      </span>
      <Button variant="outline" asChild>
        <Link href="/account">계정</Link>
      </Button>
      <Button variant="ghost" onClick={signOut}>
        로그아웃
      </Button>
    </div>
  )
}