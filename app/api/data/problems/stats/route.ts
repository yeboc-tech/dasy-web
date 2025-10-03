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

  type ChapterWithSubjects = {
    id: unknown;
    name: unknown;
    subjects: { id: unknown; name: unknown }[];
  }[];

  const missingSubject = allProblems?.filter(p => {
    const chapters = p.chapters as unknown as ChapterWithSubjects;
    return !chapters || !Array.isArray(chapters) || chapters.length === 0 || !chapters[0]?.subjects || !Array.isArray(chapters[0].subjects) || chapters[0].subjects.length === 0;
  }).length || 0;

  const missingChapter = allProblems?.filter(p => {
    const chapters = p.chapters as unknown as ChapterWithSubjects;
    return !chapters || !Array.isArray(chapters) || chapters.length === 0;
  }).length || 0;

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
