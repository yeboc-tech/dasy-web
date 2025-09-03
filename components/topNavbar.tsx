'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

export function TopNavbar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const navItems = [
    { href: '/worksheets', label: '학습지 목록' },
    { href: '/build', label: '학습지 생성' },
  ];

  const handleFeedbackClick = () => {
    window.open('https://padlet.com/yeboctech/padlet-6gvbv2039nl770no', '_blank');
  };

  useEffect(() => {
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
  }, [pathname]);

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
        
        {navItems.map((item) => (
          <Link 
            key={item.href}
            href={item.href} 
            className={`text-sm font-medium transition-colors hover:text-gray-900 pb-1 ${
              pathname === item.href ? 'text-black' : 'text-gray-600'
            }`}
            data-gtm-click="navigation"
            data-gtm-navigation-target={item.href}
            data-gtm-navigation-label={item.label}
          >
            {item.label}
          </Link>
        ))}
        
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
