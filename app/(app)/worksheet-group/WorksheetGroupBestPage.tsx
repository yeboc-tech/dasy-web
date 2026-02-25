'use client';

import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { fetchWorksheetGroups } from '@/lib/api/worksheetGroup';
import { WorksheetGroupListItem, WorksheetGroupItem } from '@/components/worksheet-group/worksheet-group-list-item';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';
import { getSubjectIdsByYear } from '@/lib/utils/subjectUtils';

export function WorksheetGroupBestPage() {
  const [items, setItems] = useState<WorksheetGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { interestSubjectIds, targetSuneungYear } = useUserAppSettingStore();

  useEffect(() => {
    const filterSubjects = interestSubjectIds.length > 0
      ? interestSubjectIds
      : getSubjectIdsByYear(targetSuneungYear);
    fetchWorksheetGroups({ isBest: true, subjects: filterSubjects }).then(groups => {
      setItems(groups.map(g => ({
        ...g,
        subjects: [...new Set(g.worksheets.flatMap(w => w.subject_ids))],
      })));
      setLoading(false);
    });
  }, [interestSubjectIds, targetSuneungYear]);

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
          <h1 className="text-lg font-semibold leading-none text-[var(--foreground)]">게시판</h1>
          <span className="text-xs text-[var(--gray-500)] leading-none pb-0.5">
            {items.length}개 게시물
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">
            게시물이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            {items.map((item) => (
              <WorksheetGroupListItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
