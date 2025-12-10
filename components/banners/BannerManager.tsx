'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { AppDownloadBanner } from './AppDownloadBanner';
import { InterviewBanner } from './InterviewBanner';

export function BannerManager() {
  const pathname = usePathname();
  const [showAppBanner, setShowAppBanner] = useState(true);
  const [showInterviewBanner, setShowInterviewBanner] = useState(true);

  // Show interview banner ONLY on worksheet detail pages (/w/[id])
  if (pathname?.startsWith('/w/') && showInterviewBanner) {
    return <InterviewBanner onDismiss={() => setShowInterviewBanner(false)} />;
  }

  // Show app download banner on ALL other pages
  if (showAppBanner) {
    return <AppDownloadBanner onDismiss={() => setShowAppBanner(false)} />;
  }

  // No banner if dismissed
  return null;
}