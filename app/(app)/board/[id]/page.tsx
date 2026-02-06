import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BoardDetailContent from './BoardDetailContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('board')
    .select('title')
    .eq('id', parseInt(id))
    .single();

  if (!item) {
    return {
      title: '게시물을 찾을 수 없습니다 | KIDARI',
    };
  }

  return {
    title: `${item.title} | KIDARI`,
    description: item.title,
  };
}

export default async function BoardDetailPage({ params }: PageProps) {
  const { id } = await params;
  const boardId = parseInt(id);

  if (isNaN(boardId)) {
    notFound();
  }

  const supabase = await createClient();

  // Fetch board item
  const { data: item, error } = await supabase
    .from('board')
    .select('*')
    .eq('id', boardId)
    .single();

  if (error || !item) {
    notFound();
  }

  // Increment view count
  await supabase
    .from('board')
    .update({ view_count: item.view_count + 1 })
    .eq('id', boardId);

  return <BoardDetailContent item={{ ...item, view_count: item.view_count + 1 }} />;
}
