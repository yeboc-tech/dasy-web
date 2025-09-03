'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface InterviewBannerProps {
  onDismiss?: () => void;
}

export function InterviewBanner({ onDismiss }: InterviewBannerProps) {
  const handleInterviewClick = () => {
    window.open('https://docs.google.com/forms/d/e/1FAIpQLSfOQEvoqvsUTWFF3TtIZwGz9-RL874RQz0Bsq0cQ0vEeEuSeg/viewform', '_blank');
  };

  return (
    <div className="w-full bg-green-50 border-b border-green-200">
      <div className="max-w-4xl mx-auto px-4 h-[50px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border border-gray-300 bg-white flex items-center justify-center overflow-hidden">
            <Image src="/images/starbucks_icon.png" alt="Starbucks Icon" width={24} height={24} className="rounded" />
          </div>
          <div className="flex-1">
            <span className="text-sm text-gray-900 font-medium">사용자 인터뷰 참여</span>
            <span className="text-xs text-gray-600 ml-2">30분 인터뷰만 완료해도 스타벅스 기프티콘 10,000원권 증정 (선착순 3명)</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleInterviewClick}
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs border-green-300 text-green-700 hover:bg-green-100"
          >
            참여하기
          </Button>
          {onDismiss && (
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}