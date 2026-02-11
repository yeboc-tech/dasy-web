'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ChapterSolvedInfo {
  solved: number;
  total: number;
  percent: number;
}

interface TagRow {
  problem_id: string;
  tag_ids: string[];
  year: number;
}

function getYearFromProblemId(problemId: string): number {
  const parts = problemId.split('_');
  return parseInt(parts[2], 10);
}

export function useChapterSolvedCounts(
  userId: string | undefined,
  subjectId: string | null,
  selectedRange: 'recent3' | 'recent5' | 'total'
) {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [solvedSet, setSolvedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // fetch는 userId/subjectId가 바뀔 때만
  useEffect(() => {
    if (!userId || !subjectId) {
      setTags([]);
      setSolvedSet(new Set());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      const supabase = createClient();

      // 1. problem_tags에서 해당 과목 문제 조회
      const tagType = subjectId!.startsWith('통합사회_')
        ? `단원_자세한${subjectId}`
        : `단원_사회탐구_${subjectId}`;

      const { data: rawTags } = await supabase
        .from('problem_tags')
        .select('problem_id, tag_ids')
        .eq('type', tagType);

      if (cancelled) return;

      const parsed: TagRow[] = (rawTags || []).map(t => ({
        problem_id: t.problem_id,
        tag_ids: t.tag_ids,
        year: getYearFromProblemId(t.problem_id),
      }));

      // 2. 사용자 풀이 기록 조회
      const solved = new Set<string>();

      // solve_session_record
      const { data: sessionRecords } = await supabase
        .from('solve_session_record')
        .select('problem_id')
        .eq('user_id', userId!)
        .like('problem_id', `${subjectId}_%`);

      if (cancelled) return;
      sessionRecords?.forEach(r => solved.add(r.problem_id));

      // solves (학습지 기반 풀이)
      const { data: solves } = await supabase
        .from('solves')
        .select('results')
        .eq('user_id', userId!);

      if (cancelled) return;

      if (solves) {
        const prefix = `${subjectId}_`;
        for (const solve of solves) {
          if (solve.results) {
            for (const problemId of Object.keys(solve.results)) {
              if (problemId.startsWith(prefix)) {
                solved.add(problemId);
              }
            }
          }
        }
      }

      if (!cancelled) {
        setTags(parsed);
        setSolvedSet(solved);
        setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [userId, subjectId]);

  // 범위 변경은 클라이언트에서 필터링만
  const data = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const chapterProblems: Record<string, Set<string>> = {};

    for (const tag of tags) {
      if (selectedRange === 'recent3' && tag.year < currentYear - 2) continue;
      if (selectedRange === 'recent5' && tag.year < currentYear - 4) continue;

      for (const chapterId of tag.tag_ids) {
        if (!chapterProblems[chapterId]) {
          chapterProblems[chapterId] = new Set();
        }
        chapterProblems[chapterId].add(tag.problem_id);
      }
    }

    const result: Record<string, ChapterSolvedInfo> = {};
    for (const [chapterId, problemIds] of Object.entries(chapterProblems)) {
      const total = problemIds.size;
      let solved = 0;
      for (const pid of problemIds) {
        if (solvedSet.has(pid)) solved++;
      }
      result[chapterId] = {
        solved,
        total,
        percent: total > 0 ? Math.round((solved / total) * 100) : 0,
      };
    }

    return result;
  }, [tags, solvedSet, selectedRange]);

  return { data, loading };
}
