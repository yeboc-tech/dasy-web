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

  // For chapter and subject, we need to join and check
  const { data: allProblems } = await supabase
    .from('problems')
    .select(`
      id,
      chapters (
        id,
        name,
        subjects (
          id,
          name
        )
      )
    `);

  const missingSubject = allProblems?.filter(p => !p.chapters?.subjects?.name).length || 0;
  const missingChapter = allProblems?.filter(p => !p.chapters?.name).length || 0;

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
