'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link
        href="/admin/problems"
        className={`transition-colors ${
          isActive('/admin/problems')
            ? 'text-black font-medium'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        문제
      </Link>
      <Link
        href="/admin/label-types"
        className={`transition-colors ${
          isActive('/admin/label-types')
            ? 'text-black font-medium'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        라벨 타입
      </Link>
      <Link
        href="/admin/labels"
        className={`transition-colors ${
          isActive('/admin/labels')
            ? 'text-black font-medium'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        라벨
      </Link>
    </nav>
  );
}
