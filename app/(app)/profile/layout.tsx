import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '프로필 - KIDARI',
  description: '계정 정보를 확인하고 설정을 변경하세요.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
