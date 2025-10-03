import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  // Get total count
  const { count: total } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true });

  // Count missing values for each column
  const { count: missingSource } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true })
    .or('source.is.null,source.eq.');

  const { count: missingExamYear } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true })
    .is('exam_year', null);

  const { count: missingCorrectRate } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true })
    .is('correct_rate', null);

  const { count: missingAnswer } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true })
    .is('answer', null);

  // Count missing chapter_id
  const { count: missingChapter } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true })
    .is('chapter_id', null);

  // For subject, we need to join chapters and check if subject exists
  const { data: problemsWithChapters } = await supabase
    .from('problems')
    .select(`
      id,
      chapter_id,
      chapters (
        id,
        subject_id
      )
    `)
    .not('chapter_id', 'is', null);

  // Count problems that have chapter but missing subject
  const missingSubject = (missingChapter || 0) + (problemsWithChapters?.filter(p => {
    const chapter = p.chapters as unknown as { id: unknown; subject_id: unknown } | null;
    return !chapter || !chapter.subject_id;
  }).length || 0);

  return NextResponse.json({
    total: total || 0,
    stats: {
      source: missingSource || 0,
      exam_year: missingExamYear || 0,
      subject: missingSubject,
      chapter: missingChapter,
      correct_rate: missingCorrectRate || 0,
      answer: missingAnswer || 0,
    },
  });
}
