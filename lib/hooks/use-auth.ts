'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/auth-context'
import { translateAuthError } from '@/lib/utils/auth-error-messages'

// Helper to create a translated error
const createTranslatedError = (error: { message: string }) => {
  const translatedMessage = translateAuthError(error.message)
  return new Error(translatedMessage)
}

export const useAuthActions = () => {
  const router = useRouter()
  const supabase = createClient()
  const { signOut } = useAuth()

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw createTranslatedError(error)
    }

    router.refresh()
    router.push('/build')
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (error) {
      throw createTranslatedError(error)
    }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      throw createTranslatedError(error)
    }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      throw createTranslatedError(error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
    router.push('/build')
  }

  return {
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    signOut: handleSignOut,
  }
}