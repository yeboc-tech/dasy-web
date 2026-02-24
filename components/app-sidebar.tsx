'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FilePlus, Globe, User, FileStack, MessageSquare, BookOpen, Star, List, ThumbsUp, BarChart3, Settings, Home, ArrowRightLeft, ClipboardList, CalendarDays, CreditCard } from 'lucide-react';
import Avatar from 'boring-avatars';
import { useEffect } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAuthBlocker } from '@/lib/contexts/auth-blocker-context';
import { useAppStore } from '@/lib/zustand/localStorageStore';
import { useUserAccountStore, getUserTypeLabel } from '@/lib/zustand/userAccountStore';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  isExternal?: boolean;
  subItems?: { label: string; href: string }[];
}

interface NavGroup {
  title?: string; // Optional - if not provided, items render without group header
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'MY',
    items: [
      { label: '내 학습 현황', href: '/my/dashboard', icon: <Home className="w-4 h-4" /> },
    ],
  },
  {
    title: '기출문제 학습지',
    items: [
      { label: '전체 학습지', href: '/worksheet-group/all', icon: <List className="w-4 h-4" /> },
      { label: '즐겨찾는 학습지', href: '/worksheet-group/favorites', icon: <Star className="w-4 h-4" /> },
      { label: '베스트', href: '/worksheet-group', icon: <ThumbsUp className="w-4 h-4" /> },
      { label: '단원별 학습지', href: '/worksheet-group/by-chapter', icon: <BookOpen className="w-4 h-4" /> },
      { label: '난이도별 학습지', href: '/worksheet-group/by-difficulty', icon: <BookOpen className="w-4 h-4" /> },
      {
        label: '수능·모의고사 기출',
        href: '/worksheet-group/suneung',
        icon: <BookOpen className="w-4 h-4" />,
        subItems: [
          { label: '수능', href: '/worksheet-group/suneung' },
          { label: '고3 모의고사', href: '/worksheet-group/g3' },
          { label: '고2 모의고사', href: '/worksheet-group/g2' },
          { label: '고1 모의고사', href: '/worksheet-group/g1' },
        ],
      },
      { label: '공개 학습지', href: '/worksheets', icon: <Globe className="w-4 h-4" /> },
    ],
  },
  {
    title: '학습 결과',
    items: [
      { label: '학습 캘린더', href: '/my/calendar', icon: <CalendarDays className="w-4 h-4" /> },
      {
        label: '상세 현황',
        href: '/my/by-chapter',
        icon: <ClipboardList className="w-4 h-4" />,
        subItems: [
          { label: '단원별 학습결과', href: '/my/by-chapter' },
          { label: '난이도별 학습결과', href: '/my/by-difficulty' },
          { label: '시험별 학습결과', href: '/my/by-exam' },
        ],
      },
      {
        label: '내가 푼 문제 분석',
        href: '/my/problem-analysis',
        icon: <BarChart3 className="w-4 h-4" />,
        subItems: [
          { label: '전체문제', href: '/my/problem-analysis' },
          { label: '오답문제', href: '/my/problem-analysis/wrong' },
          { label: '학습지 별', href: '/my/problem-analysis/by-worksheet' },
        ],
      },
    ],
  },
  {
    title: '제작',
    items: [
      { label: '학습지 제작하기', href: '/', icon: <FilePlus className="w-4 h-4" /> },
      { label: '내가 만든 학습지', href: '/my-worksheets', icon: <FileStack className="w-4 h-4" /> },
    ],
  },
  {
    title: '설정',
    items: [
      { label: '앱 설정', href: '/settings/subjects', icon: <Settings className="w-4 h-4" /> },
      { label: '계정 관리', href: '/profile', icon: <User className="w-4 h-4" /> },
      { label: '구독 관리', href: '/profile/subscription', icon: <CreditCard className="w-4 h-4" /> },
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
  const { dismissAuthBlocker } = useAuthBlocker();
  const { mode, toggleMode } = useAppStore();
  const { nickname, subscriptionType, userType, point, profileJson, fetchAccount } = useUserAccountStore();

  useEffect(() => {
    if (user?.id) fetchAccount(user.id);
  }, [user?.id, fetchAccount]);

  // Filter nav groups based on mode and auth
  const visibleNavGroups = navGroups.filter((group) => {
    // 선생님 모드: 제작 그룹만 표시
    if (mode === 'teacher') {
      return group.title === '제작';
    }
    // 학생 모드: 제작 그룹 숨김
    if (group.title === '제작') {
      return false;
    }
    // 학생 모드: MY, 학습 결과, 설정은 로그인 시에만 표시
    if (group.title === 'MY' || group.title === '학습 결과' || group.title === '설정') {
      return !!user;
    }
    return true;
  });

  return (
    <aside className="w-64 h-full bg-transparent flex flex-col pt-2 px-1 pb-1">
      {/* Fixed Top Section */}
      <div className="shrink-0 pb-2">
        {user && nickname && (
          <div className="px-3 py-3 mb-2 flex items-center gap-3">
            <Avatar
              name={profileJson.name}
              variant={profileJson.variant as any}
              size={40}
              colors={profileJson.colors}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm"><span className="font-semibold text-[var(--foreground)]">{nickname}</span><span className="text-[var(--gray-500)]"> 님</span></span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  subscriptionType === 'PRO'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>{subscriptionType}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <img src="/images/point_badge.png" alt="" className="w-4 h-4" />
                <span className="text-xs text-[var(--gray-500)]">{point.toLocaleString()} P</span>
              </div>
            </div>
          </div>
        )}
        {visibleNavGroups.filter(g => g.title === 'MY').map((group) => (
          <div key={group.title}>
            {group.title && (
              <div className="px-2 mb-2">
                <span className="text-xs font-medium text-[var(--gray-500)]">{group.title}</span>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={dismissAuthBlocker}
                    className={`
                      flex items-center gap-2 px-2 h-8 rounded-md text-sm transition-colors cursor-pointer
                      ${isActive
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
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto">
        {visibleNavGroups.filter(g => g.title !== 'MY').map((group, groupIndex) => (
          <div key={group.title || `group-${groupIndex}`} className={groupIndex > 0 ? 'mt-4' : ''}>
            {/* Group Title - subtle and small (only if title exists) */}
            {group.title && (
              <div className="px-2 mb-2">
                <span className="text-xs font-medium text-[var(--gray-500)]">
                  {group.title}
                </span>
              </div>
            )}

            {/* Group Items - 32px height (h-8) */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isSubItemActive = hasSubItems && item.subItems?.some(sub => pathname === sub.href);

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
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      onClick={dismissAuthBlocker}
                      className={`
                        flex items-center gap-2 px-2 h-8 rounded-md text-sm transition-colors cursor-pointer
                        ${
                          isActive || isSubItemActive
                            ? 'bg-[var(--gray-200)] text-[var(--foreground)] font-medium'
                            : 'text-[var(--gray-600)] hover:bg-[var(--gray-200)] hover:text-[var(--foreground)]'
                        }
                      `}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                    {/* Sub Items */}
                    {hasSubItems && (
                      <div className="ml-6 mt-0.5 space-y-0.5">
                        {item.subItems?.map((subItem) => {
                          const isSubActive = pathname === subItem.href;
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={dismissAuthBlocker}
                              className={`
                                flex items-center gap-2 px-2 h-7 rounded-md text-xs transition-colors cursor-pointer
                                ${
                                  isSubActive
                                    ? 'text-[#FF00A1] font-medium'
                                    : 'text-[var(--gray-500)] hover:text-[var(--foreground)]'
                                }
                              `}
                            >
                              <span className="w-1 h-1 rounded-full bg-current" />
                              <span>{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Mode Toggle Button */}
      <div className="px-2 pb-3 pt-2 border-t border-[var(--border)]">
        <button
          onClick={toggleMode}
          className="w-full flex items-center justify-center gap-2 px-2 h-9 rounded-md text-sm transition-colors cursor-pointer bg-gray-100 text-[var(--gray-600)] hover:bg-gray-200 hover:text-[var(--foreground)]"
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>{mode === 'student' ? '선생님용 전환' : '학생용 전환'}</span>
        </button>
      </div>
    </aside>
  );
}
