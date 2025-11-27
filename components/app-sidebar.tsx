'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Share2, User, FileStack, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  isExternal?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: '생성 및 탐색',
    items: [
      { label: '학습지 생성', href: '/build', icon: <FileText className="w-4 h-4" /> },
      { label: '공유 학습지', href: '/worksheets', icon: <Share2 className="w-4 h-4" /> },
    ],
  },
  {
    title: '내 계정',
    items: [
      { label: '프로필', href: '/profile', icon: <User className="w-4 h-4" /> },
      // { label: '내 학습지', href: '/my-worksheets', icon: <FileStack className="w-4 h-4" /> },
    ],
  },
  {
    title: '지원',
    items: [
      { label: '피드백', href: 'https://padlet.com/yeboctech/padlet-6gvbv2039nl770no', icon: <MessageSquare className="w-4 h-4" />, isExternal: true },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Filter out "내 계정" group if user is not logged in
  const visibleNavGroups = navGroups.filter(
    (group) => group.title !== '내 계정' || user
  );

  return (
    <aside className="w-64 h-full bg-transparent flex flex-col pt-2 px-1 pb-1">
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        {visibleNavGroups.map((group, groupIndex) => (
          <div key={group.title} className={groupIndex > 0 ? 'mt-4' : ''}>
            {/* Group Title - subtle and small */}
            <div className="px-2 mb-2">
              <span className="text-xs font-medium text-[var(--gray-500)]">
                {group.title}
              </span>
            </div>

            {/* Group Items - 32px height (h-8) */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;

                if (item.isExternal) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2 h-8 rounded-md text-sm transition-colors cursor-pointer text-[var(--gray-600)] hover:bg-[var(--gray-200)] hover:text-[var(--foreground)]"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-2 px-2 h-8 rounded-md text-sm transition-colors cursor-pointer
                      ${
                        isActive
                          ? 'bg-[var(--gray-200)] text-[var(--foreground)] font-medium'
                          : 'text-[var(--gray-600)] hover:bg-[var(--gray-200)] hover:text-[var(--foreground)]'
                      }
                    `}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
