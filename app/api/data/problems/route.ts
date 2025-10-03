import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const search = searchParams.get('search') || '';
  const subject = searchParams.get('subject') || '';
  const difficulty = searchParams.get('difficulty') || '';
  const source = searchParams.get('source') || '';
  const id = searchParams.get('id') || '';
  const problemFile = searchParams.get('problemFile') || '';
  const answerFile = searchParams.get('answerFile') || '';

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let query = supabase
    .from('problems')
    .select(`
      id,
      problem_filename,
      answer_filename,
      source,
      exam_year,
      difficulty,
      correct_rate,
      answer,
      created_at,
      updated_at,
      chapter_id,
      chapters (
        id,
        name,
        subjects (
          id,
          name
        )
      )
    `, { count: 'exact' });

  // Apply filters
  if (search) {
    query = query.or(`problem_filename.ilike.%${search}%,source.ilike.%${search}%`);
  }

  if (difficulty) {
    query = query.eq('difficulty', difficulty);
  }

  if (source) {
    if (source === '__EMPTY__') {
      // Special marker means search for null or empty values
      query = query.or('source.is.null,source.eq.');
    } else {
      query = query.ilike('source', `%${source}%`);
    }
  }

  if (problemFile) {
    if (problemFile === '__EMPTY__') {
      // Special marker means search for null or empty values
      query = query.or('problem_filename.is.null,problem_filename.eq.');
    } else {
      query = query.ilike('problem_filename', `%${problemFile}%`);
    }
  }

  if (answerFile) {
    if (answerFile === '__EMPTY__') {
      // Special marker means search for null or empty values
      query = query.or('answer_filename.is.null,answer_filename.eq.');
    } else {
      query = query.ilike('answer_filename', `%${answerFile}%`);
    }
  }

  // Pagination
  query = query.range(start, end).order('created_at', { ascending: false });

  const result = await query;
  let problems = result.data;
  const error = result.error;
  let count = result.count;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by ID on the client side (after fetching) since UUID doesn't support ILIKE
  if (id && problems) {
    if (id === '__EMPTY__') {
      // Special marker means search for null or empty values
      problems = problems.filter(p => !p.id || p.id === '');
    } else {
      problems = problems.filter(p => p.id.toLowerCase().includes(id.toLowerCase()));
    }
    count = problems.length;
  }

  return NextResponse.json({
    problems,
    total: count || 0,
    page,
    pageSize,
  });
}
