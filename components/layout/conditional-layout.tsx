'use client'

import { usePathname } from 'next/navigation'
import { TopNavbar } from '@/components/topNavbar'
import { BannerManager } from '@/components/banners/BannerManager'
import { MobileUnsupportedCard } from '@/components/MobileUnsupportedCard'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith('/auth')
  const isSolvePage = pathname?.includes('/solve')
  const isDataPage = pathname?.startsWith('/data')
  const isAdminPage = pathname?.startsWith('/admin')

  if (isAuthPage || isSolvePage || isDataPage || isAdminPage) {
    // Auth pages, solve pages, data pages, and admin pages: full screen layout without navbar/banner
    return (
      <div className="min-h-screen">
        <div className="hidden sm:block h-full">
          {children}
        </div>
        <div className="block sm:hidden h-full">
          <MobileUnsupportedCard />
        </div>
      </div>
    )
  }

  // Regular pages: with navbar and banner
  return (
    <div className="h-screen flex flex-col">
      <div className="hidden sm:block">
        <BannerManager />
      </div>
      <div className="hidden sm:block">
        <TopNavbar />
      </div>
      <div className="flex-1 min-h-0">
        <div className="hidden sm:block h-full">
          {children}
        </div>
        <div className="block sm:hidden h-full">
          <MobileUnsupportedCard />
        </div>
      </div>
    </div>
  )
}