'use client'

import { useAuth } from '@/lib/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo
}: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        // User is not authenticated but auth is required
        router.push(redirectTo || '/auth/signin')
      } else if (!requireAuth && user) {
        // User is authenticated but on a guest-only page
        router.push(redirectTo || '/')
      }
    }
  }, [user, loading, requireAuth, redirectTo, router])

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // For protected routes, don't render if user is not authenticated
  if (requireAuth && !user) {
    return null
  }

  // For guest-only routes, don't render if user is authenticated
  if (!requireAuth && user) {
    return null
  }

  return <>{children}</>
}