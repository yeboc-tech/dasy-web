'use client';

import { useEffect, useMemo } from 'react';

interface GradingAnimationProps {
  isCorrect: boolean;
  onComplete?: () => void;
}

export function GradingAnimation({ isCorrect, onComplete }: GradingAnimationProps) {
  // 완전히 닫힌 원
  const circlePath = useMemo(() => {
    const cx = 50;
    const cy = 50;
    const r = 42;

    const startX = cx + r;
    const startY = cy;

    return `M ${startX} ${startY} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${startX} ${startY}`;
  }, []);

  useEffect(() => {
    // 애니메이션 완료 후 콜백
    const timer = setTimeout(() => {
      onComplete?.();
    }, 800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="absolute top-0 left-0 z-50 pointer-events-none"
      style={{ transform: isCorrect ? 'translate(calc(-50% + 20px), calc(-50% + 20px))' : 'translate(calc(-50% + 14px), calc(-50% + 14px))' }}
    >
      <div className="relative w-24 h-24">
        {isCorrect ? (
          // 정답: 색연필로 그린 동그라미
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{ transform: 'rotate(-3deg)' }}
          >
            <defs>
              {/* 크레용 질감 필터 - 불규칙하게 비어있는 느낌 */}
              <filter id="crayon-texture" x="-10%" y="-10%" width="120%" height="120%">
                {/* 거친 노이즈 생성 */}
                <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" result="noise" seed={42} />
                {/* 노이즈를 흑백으로 변환하고 대비 높임 */}
                <feColorMatrix in="noise" type="matrix"
                  values="1 0 0 0 0
                          1 0 0 0 0
                          1 0 0 0 0
                          0 0 0 1 0"
                  result="monoNoise" />
                {/* 임계값 적용해서 구멍 만들기 */}
                <feComponentTransfer in="monoNoise" result="threshold">
                  <feFuncR type="discrete" tableValues="0 0 0 1 1 1 1 1" />
                  <feFuncG type="discrete" tableValues="0 0 0 1 1 1 1 1" />
                  <feFuncB type="discrete" tableValues="0 0 0 1 1 1 1 1" />
                  <feFuncA type="discrete" tableValues="0 0.3 0.7 0.85 0.9 0.95 1 1" />
                </feComponentTransfer>
                {/* 원본 그래픽과 노이즈 마스크 합성 */}
                <feComposite in="SourceGraphic" in2="threshold" operator="in" />
              </filter>
            </defs>
            <path
              d={circlePath}
              fill="none"
              stroke="#E53935"
              strokeWidth="7"
              strokeLinecap="round"
              className="grading-circle"
              style={{
                filter: 'url(#crayon-texture)',
              }}
            />
          </svg>
        ) : (
          // 오답: / 표시
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{ transform: 'rotate(-5deg)' }}
          >
            <defs>
              <filter id="crayon-texture-x" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" result="noise" seed={42} />
                <feColorMatrix in="noise" type="matrix"
                  values="1 0 0 0 0
                          1 0 0 0 0
                          1 0 0 0 0
                          0 0 0 1 0"
                  result="monoNoise" />
                <feComponentTransfer in="monoNoise" result="threshold">
                  <feFuncR type="discrete" tableValues="0 0 0 1 1 1 1 1" />
                  <feFuncG type="discrete" tableValues="0 0 0 1 1 1 1 1" />
                  <feFuncB type="discrete" tableValues="0 0 0 1 1 1 1 1" />
                  <feFuncA type="discrete" tableValues="0 0.3 0.7 0.85 0.9 0.95 1 1" />
                </feComponentTransfer>
                <feComposite in="SourceGraphic" in2="threshold" operator="in" />
              </filter>
            </defs>
            <line
              x1="80"
              y1="20"
              x2="20"
              y2="80"
              stroke="#E53935"
              strokeWidth="7"
              strokeLinecap="round"
              className="grading-x-line1"
              style={{
                filter: 'url(#crayon-texture-x)',
              }}
            />
          </svg>
        )}

      </div>
    </div>
  );
}
