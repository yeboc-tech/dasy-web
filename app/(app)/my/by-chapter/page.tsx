'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';
import { useSsotChapters } from '@/lib/hooks/useSsotChapters';
import { useChapterSolvedCounts } from '@/lib/hooks/useChapterSolvedCounts';
import type { ChapterTreeItem } from '@/lib/types';
import { getSubjectLabel } from '@/lib/utils/subjectUtils';

export default function ByChapterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { interestSubjectIds, problemRange, loading, fetchSettings } = useUserAppSettingStore();
  const [selectedRange, setSelectedRange] = useState<'recent3' | 'recent5' | 'total' | null>(null);
  const activeRange = selectedRange || problemRange || 'total';

  // ssot에서 단원 정보 가져오기
  const { chapters, loading: chaptersLoading, error: chaptersError } = useSsotChapters(selectedSubject || '');

  // 단원별 풀이 현황 가져오기
  const { data: solvedCounts, loading: solvedLoading } = useChapterSolvedCounts(user?.id, selectedSubject, activeRange);

  useEffect(() => {
    if (!authLoading && user) {
      fetchSettings(user.id);
    }
  }, [user, authLoading, fetchSettings]);

  // 과목이 로드되면 첫 번째 과목 선택
  useEffect(() => {
    if (interestSubjectIds.length > 0 && !selectedSubject) {
      setSelectedSubject(interestSubjectIds[0]);
    }
  }, [interestSubjectIds, selectedSubject]);

  // Auto-expand all items when chapters load
  useEffect(() => {
    if (chapters && chapters.length > 0) {
      const allIds = new Set<string>();

      const collectIds = (items: ChapterTreeItem[]) => {
        items.forEach(item => {
          allIds.add(item.id);
          if (item.children) {
            collectIds(item.children);
          }
        });
      };

      collectIds(chapters);
      setExpandedItems(allIds);
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
    const info = solvedCounts[item.id];

    return (
      <div key={item.id}>
        <div
          className={`
            flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors
            hover:bg-gray-50
            ${level === 0 ? 'font-medium' : ''}
          `}
          style={{ paddingLeft: `${12 + level * 24}px` }}
          onClick={() => hasChildren && toggleExpanded(item.id)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <span className="w-5 h-5 flex items-center justify-center text-gray-400 shrink-0">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </span>
            ) : (
              <span className="w-5 h-5 shrink-0" />
            )}
            <span className={`text-sm truncate ${level === 0 ? 'text-[var(--foreground)]' : 'text-gray-600'}`}>
              {item.label}
            </span>
          </div>

          {info && info.total > 0 && (
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    info.percent === 100 ? 'bg-green-400' : 'bg-[#FF00A1]'
                  }`}
                  style={{ width: `${info.percent}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 tabular-nums w-14 text-right">
                {info.solved}/{info.total}
              </span>
            </div>
          )}
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

  if (interestSubjectIds.length === 0) {
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

      {/* 과목 탭 + 범위 선택 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 bg-white border-b border-[var(--border)]">
        <div className="flex gap-1">
          {interestSubjectIds.map((subjectId) => (
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
        <div className="flex">
          {([
            { key: 'recent3', label: '3개년' },
            { key: 'recent5', label: '5개년' },
            { key: 'total', label: '전체' },
          ] as const).map(({ key, label }, i, arr) => (
            <button
              key={key}
              onClick={() => setSelectedRange(key)}
              className={`
                px-3 py-1.5 text-xs font-medium transition-colors border border-gray-200
                ${i === 0 ? 'rounded-l-lg' : ''}
                ${i === arr.length - 1 ? 'rounded-r-lg' : ''}
                ${i > 0 ? '-ml-px' : ''}
                ${activeRange === key
                  ? 'bg-[#FF00A1] text-white border-[#FF00A1] z-10 relative'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 단원 트리 */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {chaptersLoading || solvedLoading ? (
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
