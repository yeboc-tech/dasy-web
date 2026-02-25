'use client';

import { useEffect } from 'react';
import { getSubjectLabel } from '@/lib/utils/subjectUtils';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';
import { useAuth } from '@/lib/contexts/auth-context';

interface SubjectColorTagProps {
  subjectId: string;
  size?: 'sm' | 'md';
}

export function SubjectColorTag({ subjectId, size = 'sm' }: SubjectColorTagProps) {
  const { user } = useAuth();
  const { interestSubjectIds, initialized, fetchSettings } = useUserAppSettingStore();

  useEffect(() => {
    if (user && !initialized) {
      fetchSettings(user.id);
    }
  }, [user, initialized, fetchSettings]);

  const isActive = interestSubjectIds.includes(subjectId);

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-sm';

  const label = getSubjectLabel(subjectId) || subjectId;

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${isActive ? 'bg-[var(--pink-light)] text-[var(--pink-primary)]' : 'bg-gray-100 text-gray-600'}
        ${sizeClasses}
      `}
    >
      {label}
    </span>
  );
}
