'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopNavbar() {
  const pathname = usePathname();

  return (
    <div className="w-full h-[60px] max-w-4xl mx-auto p-4 flex justify-between items-center shrink-0">
      <Link href="/" className="w-fit block text-lg font-semibold">통합사회 학습지 제작 도구</Link>
      
      <nav className="flex items-center gap-6">
        <Link 
          href="/worksheets" 
          className={`text-sm font-medium transition-colors hover:text-gray-900 ${
            pathname === '/worksheets' ? 'text-black' : 'text-gray-600'
          }`}
        >
          학습지 목록
        </Link>
        <Link 
          href="/build" 
          className={`text-sm font-medium transition-colors hover:text-gray-900 ${
            pathname === '/build' ? 'text-black' : 'text-gray-600'
          }`}
        >
          학습지 만들기
        </Link>
      </nav>
    </div>
  );
}
