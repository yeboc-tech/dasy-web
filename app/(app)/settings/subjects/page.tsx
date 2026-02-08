'use client';

import { useState, useEffect } from 'react';
import { Loader, Check } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';

interface Subject {
  id: string;
  name: string;
}

type OmrPosition = 'left' | 'right';

export default function AppSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  // OMR position state
  const [omrPosition, setOmrPosition] = useState<OmrPosition>('right');

  // Subject state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      // 전체 과목 목록
      const { data: allSubjects } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');

      if (allSubjects) {
        setSubjects(allSubjects);
      }

      // 사용자 설정 가져오기
      if (user) {
        const { data: settings } = await supabase
          .from('user_app_setting')
          .select('omr_position, interest_subject_ids')
          .eq('user_id', user.id)
          .single();

        if (settings) {
          setOmrPosition(settings.omr_position || 'right');
          setSelectedSubjects(new Set(settings.interest_subject_ids || []));
        }
      }

      setLoading(false);
    }

    if (!authLoading && user) {
      fetchSettings();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, supabase]);

  const updateSettings = async (updates: { omr_position?: OmrPosition; interest_subject_ids?: string[] }) => {
    if (!user || saving) return;

    setSaving(true);

    const { error } = await supabase
      .from('user_app_setting')
      .upsert({
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving settings:', error);
    }

    setSaving(false);
  };

  const handleOmrPositionChange = async (position: OmrPosition) => {
    setOmrPosition(position);
    await updateSettings({ omr_position: position });
  };

  const toggleSubject = async (subjectName: string) => {
    const newSelected = new Set(selectedSubjects);

    if (newSelected.has(subjectName)) {
      newSelected.delete(subjectName);
    } else {
      newSelected.add(subjectName);
    }

    setSelectedSubjects(newSelected);
    await updateSettings({ interest_subject_ids: Array.from(newSelected) });
  };

  return (
    <ProtectedRoute>
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">앱 설정</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="animate-spin w-6 h-6 text-gray-400" />
            </div>
          ) : (
            <div className="max-w-2xl">
              {/* OMR Position Setting */}
              <div className="p-4 border-b border-[var(--border)]">
                <h2 className="text-sm font-medium text-black mb-2">OMR 시트 위치</h2>
                <p className="text-sm text-[var(--gray-600)] mb-4">
                  문제 풀이 화면에서 OMR 시트의 위치를 설정합니다.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleOmrPositionChange('left')}
                    disabled={saving}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${omrPosition === 'left'
                        ? 'bg-[#FF00A1] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {omrPosition === 'left' && <Check className="w-4 h-4" />}
                    좌측
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOmrPositionChange('right')}
                    disabled={saving}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${omrPosition === 'right'
                        ? 'bg-[#FF00A1] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {omrPosition === 'right' && <Check className="w-4 h-4" />}
                    우측
                  </button>
                </div>
              </div>

              {/* Interest Subjects Setting */}
              <div className="p-4">
                <h2 className="text-sm font-medium text-black mb-2">관심 과목</h2>
                <p className="text-sm text-[var(--gray-600)] mb-4">
                  관심 있는 과목을 선택하세요. 선택한 과목을 기반으로 맞춤 콘텐츠를 제공합니다.
                </p>
                <div className="flex flex-wrap gap-3">
                  {subjects.map((subject) => {
                    const isSelected = selectedSubjects.has(subject.name);
                    return (
                      <button
                        key={subject.id}
                        type="button"
                        onClick={() => toggleSubject(subject.name)}
                        disabled={saving}
                        className={`
                          flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                          ${isSelected
                            ? 'bg-[#FF00A1] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                          ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                        {subject.name}
                      </button>
                    );
                  })}
                </div>

                {subjects.length === 0 && (
                  <p className="text-sm text-gray-500">등록된 과목이 없습니다.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
