'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function TopNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const isBetaMode = pathname.startsWith('/beta/');
  const isOnBuildPage = pathname === '/build' || pathname === '/beta/build';

  const navItems = [
    { href: '/worksheets', label: '학습지 목록' },
    { href: '/build', label: '학습지 생성' },
  ];

  const handleFeedbackClick = () => {
    window.open('https://padlet.com/yeboctech/padlet-6gvbv2039nl770no', '_blank');
  };

  const handleBetaModeToggle = (checked: boolean) => {
    if (checked) {
      // Navigate to beta version of current page
      if (pathname === '/build') {
        router.push('/beta/build');
      } else {
        router.push('/beta/build');
      }
    } else {
      // Navigate to regular version
      if (pathname === '/beta/build') {
        router.push('/build');
      } else {
        router.push('/build');
      }
    }
  };

  useEffect(() => {
    if (!navRef.current) return;

    // Small delay to ensure DOM is fully rendered after conditional rendering
    const timer = setTimeout(() => {
      if (!navRef.current) return;

      const activeLink = navRef.current.querySelector(`[href="${pathname}"]`) as HTMLElement;
      if (activeLink) {
        const navRect = navRef.current.getBoundingClientRect();
        const linkRect = activeLink.getBoundingClientRect();

        setIndicatorStyle({
          left: linkRect.left - navRect.left,
          width: linkRect.width,
        });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [pathname, isOnBuildPage]);

  return (
    <div className="w-full h-[60px] max-w-4xl mx-auto p-4 flex justify-between items-center shrink-0">
      <Link href="/" className="w-fit block text-lg font-semibold">통합사회 학습지 제작 도구</Link>
      
      <nav ref={navRef} className="relative flex items-center gap-6 pt-1">
        {/* Animated bottom border indicator */}
        <div
          className="absolute bottom-0 bg-black transition-all duration-300 ease-out"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
            height: '1.5px',
          }}
        />

        {isOnBuildPage && (
          <div className="flex items-center space-x-2 pb-1">
            <Label htmlFor="beta-mode" className="text-sm font-medium text-gray-600 cursor-pointer">베타 모드</Label>
            <Switch
              id="beta-mode"
              checked={isBetaMode}
              onCheckedChange={handleBetaModeToggle}
              className="data-[state=checked]:bg-[#FF00A1] data-[state=unchecked]:bg-gray-200 data-[state=checked]:!border-[#FF00A1] data-[state=unchecked]:!border-gray-200 h-[1.15rem] w-8 border shadow-sm focus-visible:ring-[#FF00A1]/50 [&>span]:bg-white [&>span]:data-[state=checked]:translate-x-[calc(100%-2px)]"
            />
          </div>
        )}

        {navItems.map((item) => {
          const isActive = isBetaMode
            ? pathname === `/beta${item.href}`
            : pathname === item.href;
          // Only apply beta prefix to /build, not /worksheets
          const href = isBetaMode && item.href === '/build' ? `/beta${item.href}` : item.href;

          return (
            <Link
              key={item.href}
              href={href}
              className={`text-sm font-medium transition-colors hover:text-gray-900 pb-1 ${
                isActive ? 'text-black' : 'text-gray-600'
              }`}
              data-gtm-click="navigation"
              data-gtm-navigation-target={href}
              data-gtm-navigation-label={item.label}
            >
              {item.label}
            </Link>
          );
        })}

        <button
          onClick={handleFeedbackClick}
          className="text-sm font-medium transition-colors hover:text-gray-900 pb-1 text-gray-600 cursor-pointer"
          data-gtm-click="feedback"
          data-gtm-feedback-type="padlet"
          data-gtm-button-text="피드백"
        >
          피드백
        </button>
      </nav>
    </div>
  );
}
