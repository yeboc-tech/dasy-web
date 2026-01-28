'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download } from 'lucide-react';
import { CustomButton } from '@/components/custom-button';
import { toast } from 'sonner';
import examsData from '@/data/exams.json';

type Exam = typeof examsData.exams[number];

const S3_BASE_URL = 'https://cdn.y3c.kr/tongkidari/pdfs';

function getExamName(examType: string, year: number, month: string, grade: string): string {
  if (examType === '수능') {
    return `${year}학년도 대학수학능력시험`;
  } else if (examType === '모평') {
    return `${year}학년도 ${month}월 모의평가`;
  } else {
    return `${year}년 ${month}월 ${grade} 학력평가`;
  }
}

function getDownloadText(exam: Exam, type: '문제' | '해설'): string {
  const { examType, year, month, grade, subject } = exam;

  if (examType === '수능') {
    return `${year}학년도 대학수학능력시험 ${subject} ${type}`;
  } else if (examType === '모평') {
    return `${year}학년도 ${grade} ${month}월 모의평가 ${subject} ${type}`;
  } else {
    return `${year}년 ${grade} ${month}월 학력평가 ${subject} ${type}`;
  }
}

interface ExamDetailContentProps {
  groupId: string;
}

export default function ExamDetailContent({ groupId }: ExamDetailContentProps) {
  const router = useRouter();

  const { examName, subjects } = useMemo(() => {
    const decodedId = decodeURIComponent(groupId);
    const parts = decodedId.split('_');
    if (parts.length < 5) {
      return { examName: '', subjects: [] };
    }

    const [year, month, examType, grade, region] = parts;
    const regionValue = region === 'NA' ? null : region;

    const matchingExams = examsData.exams.filter((exam: Exam) =>
      exam.year === parseInt(year) &&
      exam.month === month &&
      exam.examType === examType &&
      exam.grade === grade &&
      exam.region === regionValue
    );

    matchingExams.sort((a, b) => a.subject.localeCompare(b.subject));

    const name = matchingExams.length > 0
      ? getExamName(examType, parseInt(year), month, grade)
      : '';

    return { examName: name, subjects: matchingExams };
  }, [groupId]);

  const handleDownload = async (filename: string) => {
    const url = `${S3_BASE_URL}/${encodeURIComponent(filename)}`;
    const TIMEOUT_MS = 30000;

    try {
      toast.loading(`${filename} 다운로드 중...`, { id: filename });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);

      toast.success(`${filename} 다운로드 완료`, { id: filename });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error(`${filename} 다운로드 시간 초과`, { id: filename });
      } else {
        toast.error(`${filename} 다운로드 실패`, { id: filename });
      }
    }
  };

  const downloadFile = async (filename: string): Promise<boolean> => {
    const url = `${S3_BASE_URL}/${encodeURIComponent(filename)}`;
    const TIMEOUT_MS = 30000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) return false;

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);
      return true;
    } catch {
      return false;
    }
  };

  const handleDownloadAll = async () => {
    const totalFiles = subjects.reduce((count, exam) => {
      return count + (exam.hasProblem ? 1 : 0) + (exam.hasAnswer ? 1 : 0);
    }, 0);

    toast.loading(`${totalFiles}개 파일 다운로드 중...`, { id: 'download-all' });

    let successCount = 0;
    for (const exam of subjects) {
      if (exam.hasProblem) {
        if (await downloadFile(exam.problemPdf)) successCount++;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      if (exam.hasAnswer && exam.answerPdf) {
        if (await downloadFile(exam.answerPdf)) successCount++;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    toast.success(`${successCount}개 파일 다운로드 완료`, { id: 'download-all' });
  };

  if (subjects.length === 0) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-4 shrink-0 bg-white">
          <button
            onClick={() => router.push('/exams')}
            className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--gray-100)] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          시험을 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/exams')}
            className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--gray-100)] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-end gap-2">
            <h1 className="text-lg font-semibold leading-none text-[var(--foreground)]">
              {examName}
            </h1>
            <span className="text-xs text-[var(--gray-500)] leading-none pb-0.5">
              {subjects.length}개 과목
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CustomButton
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
          >
            전체 다운로드
          </CustomButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <colgroup>
            <col />
            <col style={{ width: '380px' }} />
            <col style={{ width: '380px' }} />
            <col style={{ width: '80px' }} />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[var(--gray-50)] shadow-[0_1px_0_var(--border)]">
            <tr>
              <th className="h-10 px-4 text-left align-middle font-medium text-[var(--foreground)] whitespace-nowrap bg-[var(--gray-50)]">
                과목
              </th>
              <th className="h-10 px-4 text-left align-middle font-medium text-[var(--foreground)] whitespace-nowrap bg-[var(--gray-50)]">
                문제
              </th>
              <th className="h-10 px-4 text-left align-middle font-medium text-[var(--foreground)] whitespace-nowrap bg-[var(--gray-50)]">
                해설
              </th>
              <th className="h-10 px-4 text-right align-middle font-medium text-[var(--foreground)] whitespace-nowrap bg-[var(--gray-50)]">
                전체
              </th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((exam) => (
              <tr
                key={exam.id}
                className="border-b border-[var(--border)]"
              >
                <td className="p-4 align-middle">
                  <span className="font-medium">{exam.subject}</span>
                </td>
                <td className="p-4 align-middle">
                  {exam.hasProblem ? (
                    <button
                      onClick={() => handleDownload(exam.problemPdf)}
                      className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black cursor-pointer transition-colors"
                    >
                      {getDownloadText(exam, '문제')}
                      <Download className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-sm text-gray-300">-</span>
                  )}
                </td>
                <td className="p-4 align-middle">
                  {exam.hasAnswer && exam.answerPdf ? (
                    <button
                      onClick={() => handleDownload(exam.answerPdf!)}
                      className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black cursor-pointer transition-colors"
                    >
                      {getDownloadText(exam, '해설')}
                      <Download className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-sm text-gray-300">-</span>
                  )}
                </td>
                <td className="p-4 align-middle text-right">
                  <button
                    onClick={async () => {
                      if (exam.hasProblem) await handleDownload(exam.problemPdf);
                      if (exam.hasAnswer && exam.answerPdf) await handleDownload(exam.answerPdf);
                    }}
                    disabled={!exam.hasProblem && !exam.hasAnswer}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-500 bg-[var(--gray-100)] hover:bg-[var(--gray-200)] hover:text-gray-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
