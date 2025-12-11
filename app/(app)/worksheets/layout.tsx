import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '공개 학습지 - KIDARI',
  description: '다른 선생님들이 만든 통합사회 학습지를 둘러보세요. 공개된 학습지를 참고하여 나만의 학습지를 제작할 수 있습니다.',
  openGraph: {
    title: '공개 학습지 - KIDARI',
    description: '다른 선생님들이 만든 통합사회 학습지를 둘러보세요.',
  },
}

export default function WorksheetsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
