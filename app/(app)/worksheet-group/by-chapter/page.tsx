'use client';

import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { WorksheetGroupListItem, WorksheetGroupItem } from '@/components/worksheet-group/worksheet-group-list-item';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';

export default function WorksheetGroupByChapterPage() {
  const [items, setItems] = useState<WorksheetGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { interestSubjectIds } = useUserAppSettingStore();

  useEffect(() => {
    async function fetchItems() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('worksheet_group')
        .select('id, image_url, title, view_count, created_at, tags, worksheet_ids')
        .contains('tags', ['단원별'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching worksheet group items:', error);
        setLoading(false);
        return;
      }

      const groups = data || [];
      const allWsIds = groups.flatMap(g => g.worksheet_ids || []);

      let subjectMap = new Map<string, string | null>();
      if (allWsIds.length > 0) {
        const { data: worksheets } = await supabase
          .from('worksheets')
          .select('id, subject_id')
          .in('id', allWsIds);
        subjectMap = new Map(worksheets?.map(w => [w.id, w.subject_id]) || []);
      }

      setItems(groups.map(g => ({
        ...g,
        subjects: [...new Set(
          (g.worksheet_ids || []).map((id: string) => subjectMap.get(id)).filter(Boolean)
        )] as string[],
      })));
      setLoading(false);
    }

    fetchItems();
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
