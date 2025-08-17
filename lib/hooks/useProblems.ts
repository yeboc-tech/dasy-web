'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ProblemMetadata } from '@/lib/types/problems';

export interface DatabaseProblem {
  id: string;
  filename: string;
  chapter_id: string | null;
  difficulty: string;
  problem_type: string;
  created_at: string;
  updated_at: string;
  subjects: { name: string }[];
}

export function useProblems() {
  const [problems, setProblems] = useState<ProblemMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProblems = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const supabase = createClient();
        
        // Fetch problems with their related subjects
        const { data, error: fetchError } = await supabase
          .from('problems')
          .select(`
            id,
            filename,
            chapter_id,
            difficulty,
            problem_type,
            created_at,
            updated_at,
            problem_subjects(
              subjects(name)
            )
          `)
          .order('filename');

        if (fetchError) {
          throw new Error(`Failed to fetch problems: ${fetchError.message}`);
        }

        // Transform the data to match ProblemMetadata interface
        const transformedProblems: ProblemMetadata[] = (data || []).map((problem: any) => ({
          id: problem.id,
          filename: problem.filename,
          chapter_id: problem.chapter_id,
          difficulty: problem.difficulty,
          problem_type: problem.problem_type,
          tags: problem.problem_subjects?.map((ps: any) => ps.subjects.name) || [],
          created_at: problem.created_at,
          updated_at: problem.updated_at
        }));

        setProblems(transformedProblems);
      } catch (err) {
        console.error('Error loading problems:', err);
        setError(err instanceof Error ? err.message : 'Failed to load problems');
      } finally {
        setLoading(false);
      }
    };

    loadProblems();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = createClient();
      
      const { data, error: fetchError } = await supabase
        .from('problems')
        .select(`
          id,
          filename,
          chapter_id,
          difficulty,
          problem_type,
          created_at,
          updated_at,
          problem_subjects(
            subjects(name)
          )
        `)
        .order('filename');

      if (fetchError) {
        throw new Error(`Failed to fetch problems: ${fetchError.message}`);
      }

      const transformedProblems: ProblemMetadata[] = (data || []).map((problem: any) => ({
        id: problem.id,
        filename: problem.filename,
        chapter_id: problem.chapter_id,
        difficulty: problem.difficulty,
        problem_type: problem.problem_type,
        tags: problem.problem_subjects?.map((ps: any) => ps.subjects.name) || [],
        created_at: problem.created_at,
        updated_at: problem.updated_at
      }));

      setProblems(transformedProblems);
    } catch (err) {
      console.error('Error refetching problems:', err);
      setError(err instanceof Error ? err.message : 'Failed to refetch problems');
    } finally {
      setLoading(false);
    }
  };

  return {
    problems,
    loading,
    error,
    refetch
  };
}
