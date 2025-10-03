'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/data/signin')
  }

  return (
    <button
      onClick={handleLogout}
      className="text-gray-600 hover:text-gray-800 cursor-pointer"
    >
      <LogOut className="w-4 h-4" />
    </button>
  )
}
