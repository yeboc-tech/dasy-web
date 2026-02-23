'use client';

import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { fetchWorksheetGroups } from '@/lib/api/worksheetGroup';
import { WorksheetGroupListItem, WorksheetGroupItem } from '@/components/worksheet-group/worksheet-group-list-item';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';

export function WorksheetGroupByChapterPage() {
  const [items, setItems] = useState<WorksheetGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { interestSubjectIds } = useUserAppSettingStore();

  useEffect(() => {
    fetchWorksheetGroups({ tags: ['단원별'] }).then(groups => {
      setItems(groups.map(g => ({
        ...g,
        subjects: [...new Set(g.worksheets.map(w => w.subject_id).filter(Boolean))] as string[],
      })));
      setLoading(false);
    });
  }, []);

  const sortedItems = [...items].sort((a, b) => {
    const aSubject = a.subjects[0] || '';
    const bSubject = b.subjects[0] || '';
    const aIsInterest = interestSubjectIds.includes(aSubject);
    const bIsInterest = interestSubjectIds.includes(bSubject);

    if (aIsInterest !== bIsInterest) return aIsInterest ? -1 : 1;
    return aSubject.localeCompare(bSubject, 'ko');
  });

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
          <h1 className="text-lg font-semibold leading-none text-[var(--foreground)]">단원별 학습지</h1>
          <span className="text-xs text-[var(--gray-500)] leading-none pb-0.5">
            {items.length}개 학습지
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {sortedItems.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">
            학습지가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            {sortedItems.map((item) => (
              <WorksheetGroupListItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
