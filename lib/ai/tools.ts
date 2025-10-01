import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/client';
import type { ProblemMetadata } from '@/lib/types/problems';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for client-side usage in development
});

export interface SearchProblemsParams {
  query: string;
  limit?: number;
}

interface SearchResult {
  id: string;
  problem_filename: string;
  answer_filename?: string;
  answer?: number;
  chapter_id: string | null;
  difficulty: string;
  problem_type: string;
  correct_rate?: number;
  exam_year?: number;
  created_at: string;
  updated_at: string;
}

interface ProblemSubject {
  problem_id: string;
  subjects: {
    name: string;
  };
}

export async function searchProblemsByEmbedding({ query, limit = 20 }: SearchProblemsParams) {
  try {
    console.log('🔍 searchProblemsByEmbedding called with:', { query, limit });

    // Create embedding for the search query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log('📊 Generated embedding, length:', queryEmbedding.length);

    // Search in Supabase using vector similarity
    const supabase = createClient();

    console.log('🎯 Calling supabase.rpc with params:', { query_embedding: 'vector(' + queryEmbedding.length + ')', match_count: limit });
    const { data: searchResults, error } = await supabase.rpc('search_problems_by_embedding', {
      query_embedding: queryEmbedding,
      match_count: limit
    }) as { data: SearchResult[] | null; error: Error | null };

    if (error) {
      console.error('❌ Error searching problems:', error);
      return {
        success: false,
        error: error.message,
        problems: []
      };
    }

    console.log('✅ Search results received:', searchResults?.length || 0, 'problems');
    console.log('📋 Raw search results:', searchResults?.slice(0, 3)); // Show first 3 for debugging

    // Transform results to match ProblemMetadata interface
    // We need to fetch the tags separately since the function doesn't include them
    const problemIds = searchResults?.map(p => p.id) || [];

    if (problemIds.length === 0) {
      return {
        success: true,
        problems: [],
        message: `No problems found matching your query: "${query}"`
      };
    }

    // Fetch tags for the problems
    const { data: problemSubjects, error: tagsError } = await supabase
      .from('problem_subjects')
      .select(`
        problem_id,
        subjects(name)
      `)
      .in('problem_id', problemIds) as { data: ProblemSubject[] | null; error: Error | null };

    if (tagsError) {
      console.error('Error fetching tags:', tagsError);
    }

    // Create a map of problem_id to tags
    const tagsMap = new Map<string, string[]>();
    problemSubjects?.forEach(ps => {
      if (!tagsMap.has(ps.problem_id)) {
        tagsMap.set(ps.problem_id, []);
      }
      tagsMap.get(ps.problem_id)!.push(ps.subjects.name);
    });

    // Transform to ProblemMetadata format
    const problems: ProblemMetadata[] = (searchResults || []).map(result => ({
      id: result.id,
      problem_filename: result.problem_filename,
      answer_filename: result.answer_filename,
      answer: result.answer,
      chapter_id: result.chapter_id,
      difficulty: result.difficulty,
      problem_type: result.problem_type,
      correct_rate: result.correct_rate,
      exam_year: result.exam_year,
      created_at: result.created_at,
      updated_at: result.updated_at,
      tags: tagsMap.get(result.id) || []
    }));

    console.log('🎉 Final result: returning', problems.length, 'problems');

    return {
      success: true,
      problems,
      message: `Found ${problems.length} problems matching your query: "${query}"`
    };

  } catch (error) {
    console.error('Error in searchProblemsByEmbedding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      problems: []
    };
  }
}

// Tool definition for the OpenAI agent
export const searchProblemsToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'search_problems_by_embedding',
    description: 'Search for problems using natural language queries by converting them to embeddings and finding similar problems in the database',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query to search for problems (e.g., "economics related problems", "questions about supply and demand")'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of problems to return (default: 20)',
          default: 20
        }
      },
      required: ['query']
    }
  }
};