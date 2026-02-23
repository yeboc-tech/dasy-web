'use client';

import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { fetchWorksheetGroups } from '@/lib/api/worksheetGroup';
import { WorksheetGroupListItem, WorksheetGroupItem } from '@/components/worksheet-group/worksheet-group-list-item';
import { SUBJECTS_2026 } from '@/lib/ssot/SUBJECTS';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';

const VIRTUAL_ITEMS: (WorksheetGroupItem & { href: string })[] = [
  {
    id: -1,
    image_url: null,
    title: '사회탐구 단원별 학습지',
    view_count: 0,
    created_at: new Date().toISOString(),
    tags: ['단원별'],
    subjects: SUBJECTS_2026.map(s => s.id),
    href: '/worksheet-group/by-chapter',
  },
  {
    id: -2,
    image_url: null,
    title: '사회탐구 난이도별 학습지',
    view_count: 0,
    created_at: new Date().toISOString(),
    tags: ['난이도별'],
    subjects: SUBJECTS_2026.map(s => s.id),
    href: '/worksheet-group/by-difficulty',
  },
];

export function WorksheetGroupAllPage() {
  const [items, setItems] = useState<WorksheetGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { interestSubjectIds } = useUserAppSettingStore();

  useEffect(() => {
    fetchWorksheetGroups({
      excludeTags: ['단원별', '난이도별'],
      subjects: interestSubjectIds.length > 0 ? interestSubjectIds : undefined,
    }).then(groups => {
      setItems(groups.map(g => ({
        ...g,
        subjects: [...new Set(g.worksheets.map(w => w.subject_id).filter(Boolean))] as string[],
      })));
      setLoading(false);
    });
  }, [interestSubjectIds]);

  const allItems = [...VIRTUAL_ITEMS, ...items];

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader className="animate-spin w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-end gap-2">
          <h1 className="text-lg font-semibold leading-none text-[var(--foreground)]">전체 학습지</h1>
          <span className="text-xs text-[var(--gray-500)] leading-none pb-0.5">
            {allItems.length}개 학습지
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {allItems.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">
            학습지가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            {allItems.map((item) => (
              <WorksheetGroupListItem
                key={item.id}
                item={item}
                {...(item.id < 0 && {
                  href: VIRTUAL_ITEMS.find(v => v.id === item.id)?.href,
                  hideFavorite: true,
                })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
