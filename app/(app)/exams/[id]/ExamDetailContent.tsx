'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Download, ExternalLink } from 'lucide-react';
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

function getImagePath(exam: Exam): string {
  // exam.id: 경제_고3_2025_11_수능_NA
  // 이미지: 경제_고3_2025_11_수능.png
  const parts = exam.id.split('_');
  const imageId = parts.slice(0, -1).join('_');
  return `/images/past-exam/${imageId}.png`;
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

  const scrollToSubject = (subjectId: string) => {
    const element = document.getElementById(subjectId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (subjects.length === 0) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-4 shrink-0 bg-white">
          <button
            onClick={() => router.back()}
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
      {/* Header */}
      <div className="h-14 border-b border-[var(--border)] flex items-center px-4 shrink-0 bg-white">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--gray-100)] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" id="exam-scroll-container">
        <div className="flex max-w-5xl mx-auto">
          {/* 본문 */}
          <div className="flex-1 px-6 py-8 max-w-3xl">
            {/* 제목 */}
            <div className="text-center mb-12">
              <h1 className="text-2xl font-bold text-[var(--foreground)]">
                {examName}
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                {subjects.length}개 과목
              </p>
            </div>

            {/* 과목별 섹션 */}
            <div className="space-y-24">
              {subjects.map((exam) => (
                <section key={exam.id} id={exam.id} className="scroll-mt-20 text-center">
                  {/* 과목 제목 */}
                  <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">
                    {exam.subject}
                  </h2>

                  {/* 본문 이미지 */}
                  <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 max-w-md mx-auto">
                    <Image
                      src={getImagePath(exam)}
                      alt={`${examName} ${exam.subject}`}
                      width={448}
                      height={634}
                      className="w-full h-auto"
                    />
                  </div>

                  {/* 다운로드 링크들 */}
                  <div className="space-y-3 inline-flex flex-col items-center">
                    {/* 문제 PDF */}
                    {exam.hasProblem && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Download className="w-4 h-4" />
                        <span>{examName} {exam.subject} 문제</span>
                        <button
                          onClick={() => handleDownload(exam.problemPdf)}
                          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                        >
                          [PDF 다운로드]
                        </button>
                      </div>
                    )}

                    {/* 해설 PDF */}
                    {exam.hasAnswer && exam.answerPdf && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Download className="w-4 h-4" />
                        <span>{examName} {exam.subject} 해설</span>
                        <button
                          onClick={() => handleDownload(exam.answerPdf!)}
                          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                        >
                          [PDF 다운로드]
                        </button>
                      </div>
                    )}

                    {/* 키다리에서 바로 풀기 */}
                    <div className="flex items-center gap-2 text-gray-700">
                      <ExternalLink className="w-4 h-4" />
                      <span>{examName} {exam.subject}</span>
                      {exam.worksheet_id ? (
                        <button
                          onClick={() => router.push(`/solve/${exam.worksheet_id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                        >
                          [키다리에서 바로 풀기]
                        </button>
                      ) : (
                        <>
                          <span className="text-gray-400">[키다리에서 바로 풀기]</span>
                          <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">준비중</span>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>

          {/* 우측 목차 (고정) */}
          <div className="w-48 shrink-0 hidden lg:block">
            <div className="sticky top-8 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">목차</h2>
              <ul className="flex flex-col gap-1">
                {subjects.map((exam) => (
                  <li key={exam.id}>
                    <button
                      onClick={() => scrollToSubject(exam.id)}
                      className="flex items-center gap-2 text-left px-2 py-1.5 text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors cursor-pointer w-full"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                      {exam.subject}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
