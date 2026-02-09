'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getSubjectLabel } from '@/lib/utils/subjectUtils';

export default function ByExamPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [userSubjects, setUserSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        <h1 className="text-lg font-semibold text-[var(--foreground)]">시험별 학습 현황</h1>
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

      {/* 시험별 현황 */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        <div className="space-y-3">
          {/* TODO: 실제 시험 데이터로 교체 */}
          <div className="text-center text-gray-500 py-8">
            시험별 학습 현황이 곧 제공될 예정입니다.
          </div>
        </div>
      </div>
    </div>
  );
}
