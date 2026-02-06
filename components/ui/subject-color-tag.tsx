interface SubjectColorTagProps {
  subject: string;
  size?: 'sm' | 'md';
}

export function SubjectColorTag({ subject, size = 'sm' }: SubjectColorTagProps) {
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        bg-gray-100 text-gray-600 ${sizeClasses}
      `}
    >
      {subject}
    </span>
  );
}
