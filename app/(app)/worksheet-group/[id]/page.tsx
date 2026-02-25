import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WorksheetGroupDetailContent from './WorksheetGroupDetailContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('worksheet_group')
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

export default async function WorksheetGroupDetailPage({ params }: PageProps) {
  const { id } = await params;
  const worksheetGroupId = parseInt(id);

  if (isNaN(worksheetGroupId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from('worksheet_group')
    .select('*')
    .eq('id', worksheetGroupId)
    .single();

  if (error || !item) {
    notFound();
  }

  // Increment view count
  await supabase
    .from('worksheet_group')
    .update({ view_count: item.view_count + 1 })
    .eq('id', worksheetGroupId);

  return <WorksheetGroupDetailContent item={{ ...item, view_count: item.view_count + 1 }} />;
}
