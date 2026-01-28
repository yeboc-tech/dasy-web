'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  month: string;
  monthNum: number;
  examType: string;
  grade: string;
  region: string | null;
  subjects: Exam[];
}

function getExamName(group: ExamGroup): string {
  const { year, month, examType, grade } = group;

  if (examType === '수능') {
    return `${year}학년도 대학수학능력시험`;
  } else if (examType === '모평') {
    return `${year}학년도 ${month}월 모의평가`;
  } else {
    // 학평
    return `${year}년 ${month}월 ${grade} 학력평가`;
  }
}

function ExamsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [selectedYear, setSelectedYear] = useState<string>(searchParams.get('year') || 'all');
  const [selectedMonth, setSelectedMonth] = useState<string>(searchParams.get('month') || 'all');
  const [selectedGrade, setSelectedGrade] = useState<string>(searchParams.get('grade') || 'all');
  const [selectedExamType, setSelectedExamType] = useState<string>(searchParams.get('type') || 'all');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');

  const { filters } = examsData.metadata;

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedYear !== 'all') params.set('year', selectedYear);
    if (selectedMonth !== 'all') params.set('month', selectedMonth);
    if (selectedGrade !== 'all') params.set('grade', selectedGrade);
    if (selectedExamType !== 'all') params.set('type', selectedExamType);
    if (searchTerm) params.set('q', searchTerm);

    const queryString = params.toString();
    const newUrl = queryString ? `/exams?${queryString}` : '/exams';

    // Only update if different to avoid unnecessary history entries
    if (window.location.pathname + window.location.search !== newUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [selectedYear, selectedMonth, selectedGrade, selectedExamType, searchTerm, router]);

  // Group exams by exam event (year + month + examType + grade + region)
  const examGroups = useMemo(() => {
    const groups: Record<string, ExamGroup> = {};

    examsData.exams.forEach((exam: Exam) => {
      const groupId = `${exam.year}_${exam.month}_${exam.examType}_${exam.grade}_${exam.region || 'NA'}`;

      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          name: '',
          year: exam.year,
          month: exam.month,
          monthNum: exam.monthNum,
          examType: exam.examType,
          grade: exam.grade,
          region: exam.region,
          subjects: [],
        };
      }
      groups[groupId].subjects.push(exam);
    });

    // Generate names and sort subjects
    Object.values(groups).forEach(group => {
      group.name = getExamName(group);
      group.subjects.sort((a, b) => a.subject.localeCompare(b.subject));
    });

    // Sort groups by date (newest first)
    return Object.values(groups).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (b.monthNum !== a.monthNum) return b.monthNum - a.monthNum;
      return a.grade.localeCompare(b.grade);
    });
  }, []);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return examGroups.filter(group => {
      if (selectedYear !== 'all' && group.year !== parseInt(selectedYear)) return false;
      if (selectedMonth !== 'all' && group.month !== selectedMonth) return false;
      if (selectedGrade !== 'all' && group.grade !== selectedGrade) return false;
      if (selectedExamType !== 'all' && group.examType !== selectedExamType) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        if (!group.name.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [examGroups, selectedYear, selectedMonth, selectedGrade, selectedExamType, searchTerm]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-end gap-2">
          <h1 className="text-lg font-semibold leading-none text-[var(--foreground)]">수능·모의고사 기출</h1>
          <span className="text-xs text-[var(--gray-500)] leading-none pb-0.5">
            {filteredGroups.length}개 시험
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="제목으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-64 pl-8"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white px-4 py-3 border-b border-[var(--border)] flex items-center gap-6">
        {/* Year & Month Filters */}
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] h-auto py-1.5 pl-3 pr-2 text-sm font-medium rounded-lg border-gray-300 shadow-none">
              <SelectValue placeholder="연도" />
            </SelectTrigger>
            <SelectContent className="bg-white shadow-none max-h-[300px] overflow-y-auto">
              <SelectItem value="all" className="cursor-pointer hover:bg-gray-100">전체 연도</SelectItem>
              {filters.years.map((year) => (
                <SelectItem key={year} value={String(year)} className="cursor-pointer hover:bg-gray-100">
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[100px] h-auto py-1.5 pl-3 pr-2 text-sm font-medium rounded-lg border-gray-300 shadow-none">
              <SelectValue placeholder="월" />
            </SelectTrigger>
            <SelectContent className="bg-white shadow-none max-h-[300px] overflow-y-auto">
              <SelectItem value="all" className="cursor-pointer hover:bg-gray-100">전체 월</SelectItem>
              {filters.months.map((month) => (
                <SelectItem key={month} value={month} className="cursor-pointer hover:bg-gray-100">
                  {parseInt(month)}월
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Grade Filter */}
        <div className="flex gap-2">
          {['all', ...filters.grades].map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all border cursor-pointer ${
                selectedGrade === grade
                  ? 'border-black text-black bg-gray-100'
                  : 'bg-white text-black border-gray-300 hover:bg-gray-50'
              }`}
            >
              {grade === 'all' ? '전체' : grade}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Exam Type Filter */}
        <div className="flex gap-2">
          {['all', '모평', '학평', '수능'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedExamType(type)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all border cursor-pointer ${
                selectedExamType === type
                  ? 'border-black text-black bg-gray-100'
                  : 'bg-white text-black border-gray-300 hover:bg-gray-50'
              }`}
            >
              {type === 'all' ? '전체' : type === '수능' ? '수능' : type === '모평' ? '모의평가' : '학력평가'}
            </button>
          ))}
        </div>

      </div>

      {/* Exam List */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: '320px' }} />
            <col />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[var(--gray-50)] shadow-[0_1px_0_var(--border)]">
            <tr>
              <th className="h-10 px-4 text-left align-middle font-medium text-[var(--foreground)] whitespace-nowrap bg-[var(--gray-50)]">
                시험명
              </th>
              <th className="h-10 px-4 text-left align-middle font-medium text-[var(--foreground)] whitespace-nowrap bg-[var(--gray-50)]">
                과목
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map((group) => (
              <tr
                key={group.id}
                onClick={() => router.push(`/exams/${encodeURIComponent(group.id)}`)}
                className="hover:bg-gray-50 cursor-pointer transition-colors border-b border-[var(--border)]"
              >
                <td className="p-4 align-middle">
                  <span className="font-medium">{group.name}</span>
                </td>
                <td className="p-4 align-middle">
                  <div className="flex flex-wrap gap-1.5">
                    {group.subjects.map((exam) => (
                      <span
                        key={exam.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {exam.subject}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {filteredGroups.length === 0 && (
              <tr>
                <td colSpan={2} className="h-48 text-center align-middle text-gray-500">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ExamsPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-full flex items-center justify-center">
        <Loader className="animate-spin w-4 h-4" />
      </div>
    }>
      <ExamsPageContent />
    </Suspense>
  );
}
