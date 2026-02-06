interface BoardColorTagProps {
  tag: string;
  size?: 'sm' | 'md';
}

// 태그별 색상 매핑
const tagColors: Record<string, { bg: string; text: string }> = {
  '기출': { bg: 'bg-blue-100', text: 'text-blue-700' },
  '5개년': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  '정답률 90%': { bg: 'bg-green-100', text: 'text-green-700' },
  '추천': { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  '인기': { bg: 'bg-red-100', text: 'text-red-700' },
  '신규': { bg: 'bg-purple-100', text: 'text-purple-700' },
  '필수': { bg: 'bg-orange-100', text: 'text-orange-700' },
  '고난도': { bg: 'bg-rose-100', text: 'text-rose-700' },
  '기초': { bg: 'bg-teal-100', text: 'text-teal-700' },
};

const defaultColor = { bg: 'bg-gray-100', text: 'text-gray-700' };

export function BoardColorTag({ tag, size = 'sm' }: BoardColorTagProps) {
  const colors = tagColors[tag] || defaultColor;

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${colors.bg} ${colors.text} ${sizeClasses}
      `}
    >
      {tag}
    </span>
  );
}
