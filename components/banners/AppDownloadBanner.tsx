'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface AppDownloadBannerProps {
  onDismiss?: () => void;
}

export function AppDownloadBanner({ onDismiss }: AppDownloadBannerProps) {
  const handleAppStoreClick = () => {
    window.open('https://apps.apple.com/kr/app/%EA%B8%B0%EC%B6%9C%EB%85%B8%ED%8A%B8-%EC%88%98%EB%8A%A5-%EB%AA%A8%EC%9D%98%EA%B3%A0%EC%82%AC-%EA%B8%B0%EC%B6%9C%EB%AC%B8%EC%A0%9C-%ED%95%9C%EA%B3%B3%EC%97%90/id6749922773?l=en-GB', '_blank');
  };

  return (
    <div className="w-full bg-blue-50 border-b border-blue-200">
      <div className="max-w-4xl mx-auto px-4 h-[50px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border border-blue-300 bg-white flex items-center justify-center overflow-hidden">
            <Image src="/images/appstore_icon.png" alt="App Store Icon" width={24} height={24} className="rounded" />
          </div>
          <div className="flex-1">
            <span className="text-sm text-gray-900 font-medium">기출노트 아이패드 앱</span>
            <span className="text-xs text-gray-600 ml-2">수능 모의고사 기출문제 한곳에</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleAppStoreClick}
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
            data-gtm-click="app_download"
            data-gtm-download-source="banner"
            data-gtm-button-text="다운로드"
          >
            다운로드
          </Button>
          {onDismiss && (
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              data-gtm-click="banner_dismiss"
              data-gtm-banner-type="app_download"
              data-gtm-action="dismiss"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}