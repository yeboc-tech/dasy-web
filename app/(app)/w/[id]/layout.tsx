import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: worksheet } = await supabase
    .from('worksheets')
    .select('title, author, is_public')
    .eq('id', id)
    .single()

  if (!worksheet) {
    return {
      title: '학습지를 찾을 수 없습니다 - KIDARI',
    }
  }

  const title = `${worksheet.title} - KIDARI`
  const description = worksheet.author
    ? `${worksheet.author} 선생님이 제작한 학습지입니다.`
    : '통합사회 기출문제로 제작된 학습지입니다.'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    robots: worksheet.is_public
      ? { index: true, follow: true }
      : { index: false, follow: false },
  }
}

export default function WorksheetLayout({ children }: Props) {
  return children
}
