'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader, ChevronDown } from 'lucide-react';
import { fetchWorksheetGroups } from '@/lib/api/worksheetGroup';
import { WorksheetGroupListItem, WorksheetGroupItem } from '@/components/worksheet-group/worksheet-group-list-item';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';

function toListItem(g: WorksheetGroup): WorksheetGroupItem {
  return {
    ...g,
    subjects: [...new Set(g.worksheets.flatMap(w => w.subject_ids))],
    targetGrades: [...new Set(g.worksheets.flatMap(w => w.target_grades))],
  };
}

export function WorksheetGroupByChapterPage() {
  const [groups, setGroups] = useState<WorksheetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherGradesOpen, setOtherGradesOpen] = useState(false);
  const [otherSubjectsOpen, setOtherSubjectsOpen] = useState(false);
  const { interestSubjectIds, currentGrade } = useUserAppSettingStore();

  useEffect(() => {
    fetchWorksheetGroups({ tags: ['단원별'] }).then(data => {
      setGroups(data);
      setLoading(false);
    });
  }, []);

  const { myItems, otherGradeItems, otherSubjectItems } = useMemo(() => {
    const my: WorksheetGroupItem[] = [];
    const otherGrade: WorksheetGroupItem[] = [];
    const otherSubject: WorksheetGroupItem[] = [];

    for (const g of groups) {
      const subjects = g.worksheets.flatMap(w => w.subject_ids);
      const grades = g.worksheets.flatMap(w => w.target_grades);
      const isMySubject = interestSubjectIds.length > 0 && subjects.some(s => interestSubjectIds.includes(s));
      const isMyGrade = grades.includes(currentGrade);

      if (isMySubject && isMyGrade) {
        my.push(toListItem(g));
      } else if (isMySubject && !isMyGrade) {
        otherGrade.push(toListItem(g));
      } else {
        otherSubject.push(toListItem(g));
      }
    }

    const sort = (arr: WorksheetGroupItem[]) =>
      arr.sort((a, b) => (a.subjects[0] || '').localeCompare(b.subjects[0] || '', 'ko'));

    return { myItems: sort(my), otherGradeItems: sort(otherGrade), otherSubjectItems: sort(otherSubject) };
  }, [groups, interestSubjectIds, currentGrade]);

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
            {groups.length}개 학습지
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {groups.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">
            학습지가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            {myItems.map((item) => (
              <WorksheetGroupListItem key={item.id} item={item} />
            ))}

            {otherGradeItems.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setOtherGradesOpen(!otherGradesOpen)}
                  className="flex items-center gap-1.5 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${otherGradesOpen ? 'rotate-180' : ''}`} />
                  다른 학년 학습지 보기 ({otherGradeItems.length})
                </button>
                {otherGradesOpen && otherGradeItems.map((item) => (
                  <WorksheetGroupListItem key={item.id} item={item} />
                ))}
              </>
            )}

            {otherSubjectItems.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setOtherSubjectsOpen(!otherSubjectsOpen)}
                  className="flex items-center gap-1.5 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${otherSubjectsOpen ? 'rotate-180' : ''}`} />
                  다른과목 학습지 보기 ({otherSubjectItems.length})
                </button>
                {otherSubjectsOpen && otherSubjectItems.map((item) => (
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
