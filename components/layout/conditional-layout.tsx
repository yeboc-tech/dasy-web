'use client'

import { usePathname } from 'next/navigation'
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
  const isQuickAnswersPage = pathname?.includes('/quick-answers')

  // App routes now have their own layout with sidebar
  const isAppRoute = pathname?.startsWith('/build') ||
                    pathname?.startsWith('/worksheets') ||
                    pathname?.startsWith('/configure') ||
                    pathname?.startsWith('/profile') ||
                    pathname?.startsWith('/my-worksheets') ||
                    pathname?.startsWith('/feedback')

  if (isAuthPage || isSolvePage || isDataPage || isAdminPage || isQuickAnswersPage || isAppRoute) {
    // These pages have their own layouts: full screen without navbar/banner
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

  // Landing/marketing pages: with banner only
  return (
    <div className="h-screen flex flex-col">
      {/* <div className="hidden sm:block">
        <BannerManager />
      </div> */}
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