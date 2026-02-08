'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import examsData from '@/data/exams.json';

type Exam = typeof examsData.exams[number];

interface ExamGroup {
  id: string;
  name: string;
  year: number;
  thumbnailPath: string;
  subjects: Exam[];
}

// 썸네일 이미지 경로 생성 (첫 번째 과목 기준)
function getThumbnailPath(exam: Exam): string {
  const parts = exam.id.split('_');
  const imageId = parts.slice(0, -1).join('_');
  return `/images/past-exam/${imageId}_thumbnail.png`;
}

export default function SuneungPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Filter only 수능 exams and group by year
  const examGroups = useMemo(() => {
    const suneungExams = examsData.exams.filter((exam: Exam) => exam.examType === '수능');

    const groups: Record<number, ExamGroup> = {};

    suneungExams.forEach((exam: Exam) => {
      if (!groups[exam.year]) {
        groups[exam.year] = {
          id: `${exam.year}_11_수능_고3_NA`,
          name: `${exam.year}학년도 대학수학능력시험`,
          year: exam.year,
          thumbnailPath: getThumbnailPath(exam),
          subjects: [],
        };
      }
      groups[exam.year].subjects.push(exam);
    });

    // Sort subjects and return sorted by year (newest first)
    return Object.values(groups)
      .map(group => {
        group.subjects.sort((a, b) => a.subject.localeCompare(b.subject));
        // 첫 번째 과목의 썸네일 사용
        if (group.subjects.length > 0) {
          group.thumbnailPath = getThumbnailPath(group.subjects[0]);
        }
        return group;
      })
      .sort((a, b) => b.year - a.year);
  }, []);

  // Get available years for filter
  const availableYears = useMemo(() => {
    return examGroups.map(g => g.year);
  }, [examGroups]);

  // Filter by selected year
  const filteredGroups = useMemo(() => {
    if (selectedYear === 'all') return examGroups;
    return examGroups.filter(group => group.year === parseInt(selectedYear));
  }, [examGroups, selectedYear]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-end gap-2">
          <h1 className="text-lg font-semibold leading-none text-[var(--foreground)]">수능</h1>
          <span className="text-xs text-[var(--gray-500)] leading-none pb-0.5">
            {filteredGroups.length}개 시험
          </span>
        </div>

        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px] h-8 text-sm">
            <SelectValue placeholder="연도" />
          </SelectTrigger>
          <SelectContent className="bg-white max-h-[300px] overflow-y-auto">
            <SelectItem value="all" className="cursor-pointer hover:bg-gray-100">전체 연도</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={String(year)} className="cursor-pointer hover:bg-gray-100">
                {year}학년도
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Exam List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredGroups.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">
            해당 연도의 수능 기출이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                onClick={() => router.push(`/exams/${encodeURIComponent(group.id)}`)}
                className="flex items-center gap-4 p-3 bg-white border border-[var(--border)] rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-16 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                  <Image
                    src={group.thumbnailPath}
                    alt={group.name}
                    width={64}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[var(--foreground)]">
                    {group.name}
                  </h3>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {group.subjects.map((exam) => (
                      <span
                        key={exam.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {exam.subject}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
