'use client';

import React from 'react';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full px-4 py-6 flex flex-col bg-[#f5f5f5]">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
              <h1 className="text-lg font-medium text-gray-900">
                자세한 통합사회 학습지 제작 도구
              </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex w-full flex-1 min-h-0">
          {/* Main Card Container */}
          <div className="flex flex-col w-full rounded-xl border border-[#e0e0e0] overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
