'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { useTaggedChapters } from '@/lib/hooks/useTaggedChapters';
import type { ChapterTreeItem } from '@/lib/types';
import { getSubjectLabel } from '@/lib/utils/subjectUtils';

export default function ByChapterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [userSubjects, setUserSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Fetch chapters for selected subject
  const { chapters, loading: chaptersLoading, error: chaptersError } = useTaggedChapters(selectedSubject || '');

  useEffect(() => {
    async function fetchUserSubjects() {
      if (!user) {
        setLoading(false);
        return;
      }

      const supabase = createClient();

      // 사용자의 관심 과목 가져오기
      const { data: settings } = await supabase
        .from('user_app_setting')
        .select('interest_subject_ids')
        .eq('user_id', user.id)
        .single();

      if (settings?.interest_subject_ids && settings.interest_subject_ids.length > 0) {
        setUserSubjects(settings.interest_subject_ids);
        setSelectedSubject(settings.interest_subject_ids[0] || null);
      }

      setLoading(false);
    }

    if (!authLoading) {
      fetchUserSubjects();
    }
  }, [user, authLoading]);

  // Auto-expand root when chapters load
  useEffect(() => {
    if (chapters && chapters.length > 0) {
      const rootId = chapters[0]?.id;
      if (rootId) {
        setExpandedItems(new Set([rootId]));
      }
    }
  }, [chapters]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const renderTreeItem = (item: ChapterTreeItem, level: number = 0) => {
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <div
          className={`
            flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors
            hover:bg-gray-50
            ${level === 0 ? 'font-medium' : ''}
          `}
          style={{ paddingLeft: `${12 + level * 24}px` }}
          onClick={() => hasChildren && toggleExpanded(item.id)}
        >
          {hasChildren ? (
            <span className="w-5 h-5 flex items-center justify-center text-gray-400">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
          ) : (
            <span className="w-5 h-5" />
          )}
          <span className={`text-sm ${level === 0 ? 'text-[var(--foreground)]' : 'text-gray-600'}`}>
            {item.label}
          </span>
          {/* TODO: 학습 현황 표시 (푼 문제 수, 정답률 등) */}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {item.children!.map(child => renderTreeItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader className="animate-spin w-6 h-6 text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">로그인이 필요합니다.</p>
        <button
          onClick={() => router.push('/auth/signin')}
          className="px-4 py-2 bg-[#FF00A1] text-white rounded-lg hover:bg-[#E0008E] transition-colors"
        >
          로그인하기
        </button>
      </div>
    );
  }

  if (userSubjects.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">관심 과목을 설정해주세요.</p>
        <button
          onClick={() => router.push('/settings/subjects')}
          className="px-4 py-2 bg-[#FF00A1] text-white rounded-lg hover:bg-[#E0008E] transition-colors"
        >
          앱 설정에서 설정하기
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">단원별 학습 현황</h1>
      </div>

      {/* 과목 탭 */}
      <div className="flex gap-1 px-4 pt-3 pb-2 bg-white border-b border-[var(--border)]">
        {userSubjects.map((subjectId) => (
          <button
            key={subjectId}
            onClick={() => setSelectedSubject(subjectId)}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${selectedSubject === subjectId
                ? 'bg-[#FF00A1] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {getSubjectLabel(subjectId) || subjectId}
          </button>
        ))}
      </div>

      {/* 단원 트리 */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {chaptersLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="animate-spin w-5 h-5 text-gray-400" />
          </div>
        ) : chaptersError ? (
          <div className="text-center py-8 text-red-500">
            단원 정보를 불러오는데 실패했습니다.
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {selectedSubject ? `${getSubjectLabel(selectedSubject) || selectedSubject} 과목의 단원 정보가 없습니다.` : '과목을 선택해주세요.'}
          </div>
        ) : (
          <div className="space-y-1">
            {chapters.map(item => renderTreeItem(item))}
          </div>
        )}
      </div>
    </div>
  );
}
