import type { Metadata } from 'next';
import examsData from '@/data/exams.json';
import ExamDetailContent from './ExamDetailContent';

type Exam = typeof examsData.exams[number];

function getExamName(examType: string, year: number, month: string, grade: string): string {
  if (examType === '수능') {
    return `${year}학년도 대학수학능력시험`;
  } else if (examType === '모평') {
    return `${year}학년도 ${month}월 모의평가`;
  } else {
    return `${year}년 ${month}월 ${grade} 학력평가`;
  }
}

function parseGroupId(groupId: string) {
  const decodedId = decodeURIComponent(groupId);
  const parts = decodedId.split('_');
  if (parts.length < 5) return null;

  const [year, month, examType, grade, region] = parts;
  const regionValue = region === 'NA' ? null : region;

  const matchingExams = examsData.exams.filter((exam: Exam) =>
    exam.year === parseInt(year) &&
    exam.month === month &&
    exam.examType === examType &&
    exam.grade === grade &&
    exam.region === regionValue
  );

  if (matchingExams.length === 0) return null;

  return {
    examName: getExamName(examType, parseInt(year), month, grade),
    subjects: matchingExams.map(e => e.subject),
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const examInfo = parseGroupId(id);

  if (!examInfo) {
    return {
      title: '시험을 찾을 수 없습니다 | KIDARI',
    };
  }

  const subjectList = examInfo.subjects.slice(0, 5).join(', ');
  const moreText = examInfo.subjects.length > 5 ? ` 외 ${examInfo.subjects.length - 5}개` : '';

  return {
    title: `${examInfo.examName} | KIDARI`,
    description: `${examInfo.examName} 기출문제와 해설을 다운로드하세요. ${subjectList}${moreText} 과목을 지원합니다.`,
    openGraph: {
      title: `${examInfo.examName} | KIDARI`,
      description: `${examInfo.examName} 기출문제와 해설을 다운로드하세요.`,
      type: 'website',
    },
  };
}

export default async function ExamDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ExamDetailContent groupId={id} />;
}
