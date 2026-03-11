'use client';

import { Check } from 'lucide-react';

const commonFeatures = [
  '학습 캘린더',
  '단원별 / 난이도별 / 시험별 학습결과',
  '오답 문제 분석',
  '오늘의 문제 / 오답 복습',
  'PDF / 태블릿 풀이 모드',
  '학습지 제작 및 PDF 다운로드',
  '즐겨찾기',
  '문제 범위 설정 (3개년 / 5개년 / 전체)',
  '빠른 정답보기',
];

const plans = [
  {
    name: 'FREE',
    price: '무료',
    description: '기본 학습 기능',
    uniqueFeatures: ['1개 과목 학습 가능'],
    highlighted: false,
  },
  {
    name: 'PRO',
    price: '14,900원 / 월',
    description: '모든 기능 제한 없이',
    uniqueFeatures: ['복수 과목 학습 가능', '10,000 Point / 월 지급'],
    highlighted: true,
  },
  {
    name: 'TEACHER',
    price: '49,000원 / 월',
    description: '선생님을 위한 플랜',
    uniqueFeatures: ['학생 관리 기능', '학습지 생성 기능'],
    highlighted: false,
  },
];

export function PlanCards() {
  return (
    <div className="grid grid-cols-3 gap-6 w-full">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={`
            relative rounded-xl p-6 flex flex-col
            ${plan.highlighted
              ? 'bg-white border-2 border-[#FF00A1] shadow-lg'
              : 'bg-white border border-gray-200'
            }
          `}
        >
          {plan.highlighted && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF00A1] text-white text-[10px] font-semibold px-3 py-1 rounded-full">
              추천
            </span>
          )}

          <h2 className="text-lg font-bold text-[var(--foreground)]">{plan.name}</h2>
          <p className="text-xs text-gray-500 mt-1">{plan.description}</p>

          <div className="mt-4 mb-6">
            <span className="text-2xl font-bold text-[var(--foreground)]">{plan.price}</span>
          </div>

          <ul className="flex flex-col gap-3 flex-1">
            {commonFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-gray-500">
                <Check className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
            {plan.uniqueFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-gray-900 font-medium">
                <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
