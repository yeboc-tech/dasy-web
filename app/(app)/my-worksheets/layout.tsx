import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '내 학습지 - KIDARI',
  description: '내가 만든 학습지를 관리하고 수정하세요. PDF로 다운로드하거나 공개 설정을 변경할 수 있습니다.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function MyWorksheetsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
