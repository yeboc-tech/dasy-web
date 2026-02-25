'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import examsData from '@/data/exams.json';

type Exam = typeof examsData.exams[number];

interface ExamGroup {
  id: string;
  name: string;
  year: number;
  month: string;
  region: string | null;
  thumbnailPath: string;
  subjects: Exam[];
}

// 월별 시험 유형 옵션
const EXAM_TYPE_OPTIONS = [
  { key: '03_학평', label: '03월 학력평가' },
  { key: '06_학평', label: '06월 학력평가' },
  { key: '09_학평', label: '09월 학력평가' },
  { key: '10_학평', label: '10월 학력평가' },
  { key: '11_학평', label: '11월 학력평가' },
];

// 썸네일 이미지 경로 생성 (첫 번째 과목 기준)
function getThumbnailPath(exam: Exam): string {
  const parts = exam.id.split('_');
  const imageId = parts.slice(0, -1).join('_');
  return `/images/past-exam/${imageId}_thumbnail.png`;
}

// 시험 이름 생성
function getExamName(year: number, month: string, region: string | null): string {
  const regionText = region ? ` (${region})` : '';
  return `${year}년 ${month}월 고2 학력평가${regionText}`;
}

export function G2Page() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedExamTypes, setSelectedExamTypes] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { interestSubjectIds, fetchSettings } = useUserAppSettingStore();

  useEffect(() => {
    if (user) fetchSettings(user.id);
  }, [user, fetchSettings]);

  // Filter 고2 학평 exams, group by exam event
  const examGroups = useMemo(() => {
    const g2Exams = examsData.exams.filter(
      (exam: Exam) => exam.grade === '고2' && exam.examType === '학평'
    );

    const groups: Record<string, ExamGroup> = {};

    g2Exams.forEach((exam: Exam) => {
      const regionKey = exam.region || 'NA';
      const groupKey = `${exam.year}_${exam.month}_${regionKey}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: `${exam.year}_${exam.month}_학평_고2_${regionKey}`,
          name: getExamName(exam.year, exam.month, exam.region),
          year: exam.year,
          month: exam.month,
          region: exam.region,
          thumbnailPath: getThumbnailPath(exam),
          subjects: [],
        };
      }
      groups[groupKey].subjects.push(exam);
    });

    // Sort subjects and return sorted by year (newest first), then month (descending)
    return Object.values(groups)
      .map(group => {
        group.subjects.sort((a, b) => a.subject.localeCompare(b.subject));
        if (group.subjects.length > 0) {
          group.thumbnailPath = getThumbnailPath(group.subjects[0]);
        }
        return group;
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return parseInt(b.month) - parseInt(a.month);
      });
  }, []);

  // Get available years for filter
  const availableYears = useMemo(() => {
    const years = new Set(examGroups.map(g => g.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [examGroups]);

  // Toggle exam type selection
  const toggleExamType = (key: string) => {
    setSelectedExamTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Filter by selected year and exam types
  const filteredGroups = useMemo(() => {
    let result = examGroups;

    // Year filter
    if (selectedYear !== 'all') {
      result = result.filter(group => group.year === parseInt(selectedYear));
    }

    // Exam type filter (month_학평)
    if (selectedExamTypes.size > 0) {
      result = result.filter(group => {
        const groupKey = `${group.month}_학평`;
        return selectedExamTypes.has(groupKey);
      });
    }

    return result;
  }, [examGroups, selectedYear, selectedExamTypes]);

  // Get display text for exam type filter button
  const examTypeButtonText = useMemo(() => {
    if (selectedExamTypes.size === 0) {
      return '전체 시험';
    }
    if (selectedExamTypes.size === 1) {
      const key = Array.from(selectedExamTypes)[0];
      const option = EXAM_TYPE_OPTIONS.find(o => o.key === key);
      return option?.label || key;
    }
    return `${selectedExamTypes.size}개 선택`;
  }, [selectedExamTypes]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-end gap-2">
          <h1 className="text-lg font-semibold leading-none text-[var(--foreground)]">고2 학력평가</h1>
          <span className="text-xs text-[var(--gray-500)] leading-none pb-0.5">
            {filteredGroups.length}개 시험
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Year Select */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue placeholder="연도" />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-[300px] overflow-y-auto">
              <SelectItem value="all" className="cursor-pointer hover:bg-gray-100">전체 연도</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)} className="cursor-pointer hover:bg-gray-100">
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Exam Type Multi-Select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-between gap-2 h-8 px-3 text-sm bg-white border border-[var(--border)] rounded-md hover:bg-gray-50 transition-colors cursor-pointer min-w-[120px]">
                <span className="truncate">{examTypeButtonText}</span>
                <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white min-w-[160px]" align="end">
              {EXAM_TYPE_OPTIONS.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.key}
                  checked={selectedExamTypes.has(option.key)}
                  onCheckedChange={() => toggleExamType(option.key)}
                  className="cursor-pointer"
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Exam List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredGroups.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">
            해당 조건의 고2 학력평가 기출이 없습니다.
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
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                          interestSubjectIds.includes(exam.subject)
                            ? 'bg-[#fff0f7] text-[#FF00A1] font-medium'
                            : 'bg-gray-100 text-gray-700'
                        }`}
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
