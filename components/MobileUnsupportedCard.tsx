'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor } from 'lucide-react';

export function MobileUnsupportedCard() {
  return (
    <div className="px-4 pt-4 pb-4 max-w-4xl mx-auto w-full h-full flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Monitor className="w-8 h-8 text-gray-600" />
          </div>
          <CardTitle>모바일 기기에서는 지원되지 않습니다</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-600 text-sm">
            통합사회 학습지 제작 도구는 PC 환경에서만 이용할 수 있습니다. 
            더 나은 경험을 위해 데스크탑이나 노트북을 사용해 주세요.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}