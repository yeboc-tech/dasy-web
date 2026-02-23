'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader, ChevronDown } from 'lucide-react';
import { fetchWorksheetGroups } from '@/lib/api/worksheetGroup';
import { WorksheetGroupListItem, WorksheetGroupItem } from '@/components/worksheet-group/worksheet-group-list-item';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';

export function WorksheetGroupByChapterPage() {
  const [items, setItems] = useState<WorksheetGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [othersOpen, setOthersOpen] = useState(false);
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

  const { myItems, otherItems } = useMemo(() => {
    const my: WorksheetGroupItem[] = [];
    const other: WorksheetGroupItem[] = [];

    for (const item of items) {
      const isInterest = item.subjects.some(s => interestSubjectIds.includes(s));
      if (interestSubjectIds.length > 0 && isInterest) {
        my.push(item);
      } else {
        other.push(item);
      }
    }

    const sort = (arr: WorksheetGroupItem[]) =>
      arr.sort((a, b) => (a.subjects[0] || '').localeCompare(b.subjects[0] || '', 'ko'));

    return { myItems: sort(my), otherItems: sort(other) };
  }, [items, interestSubjectIds]);

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
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">
            학습지가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            {myItems.map((item) => (
              <WorksheetGroupListItem key={item.id} item={item} />
            ))}

            {otherItems.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setOthersOpen(!othersOpen)}
                  className="flex items-center gap-1.5 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${othersOpen ? 'rotate-180' : ''}`} />
                  다른과목 학습지 보기 ({otherItems.length})
                </button>

                {othersOpen && otherItems.map((item) => (
                  <WorksheetGroupListItem key={item.id} item={item} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
