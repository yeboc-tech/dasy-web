import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '수능·모의고사 기출 | KIDARI',
  description: '수능, 모의평가, 학력평가 기출문제와 해설을 다운로드하세요. 경제, 사회문화, 생활과윤리, 정치와법, 세계지리, 한국지리 등 사회탐구 전 과목을 지원합니다.',
  keywords: ['수능 기출', '모의고사', '학력평가', '사회탐구', '기출문제', '해설', 'PDF 다운로드'],
  openGraph: {
    title: '수능·모의고사 기출 | KIDARI',
    description: '수능, 모의평가, 학력평가 기출문제와 해설을 다운로드하세요.',
    type: 'website',
  },
};

export default function ExamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
