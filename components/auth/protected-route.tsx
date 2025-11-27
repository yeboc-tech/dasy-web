'use client'

import { useAuth } from '@/lib/contexts/auth-context'
import { AuthenticationBlocker } from './authentication-blocker'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthenticationBlocker />
  }

  return <>{children}</>
}

// Higher-order component version
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  const AuthenticatedComponent = (props: P) => (
    <ProtectedRoute>
      <Component {...props} />
    </ProtectedRoute>
  )

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`

  return AuthenticatedComponent
}