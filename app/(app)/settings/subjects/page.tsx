'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader, Check, ChevronDown } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getSubjectsByYear, TONGHAP_SUBJECT_IDS } from '@/lib/utils/subjectUtils';

type OmrPosition = 'left' | 'right';

// 올해부터 5년간 수능 연도 생성
const currentYear = new Date().getFullYear();
const suneungYears = Array.from({ length: 5 }, (_, i) => currentYear + i);

export default function AppSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  // 수능 연도 state
  const [suneungYear, setSuneungYear] = useState<number | null>(null);

  // OMR position state
  const [omrPosition, setOmrPosition] = useState<OmrPosition>('right');

  // 선택된 과목 state
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      // 사용자 설정 가져오기
      if (user) {
        const { data: settings } = await supabase
          .from('user_app_setting')
          .select('omr_position, interest_subject_ids, suneung_year')
          .eq('user_id', user.id)
          .single();

        if (settings) {
          setSuneungYear(settings.suneung_year || null);
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

  const updateSettings = async (updates: { suneung_year?: number; omr_position?: OmrPosition; interest_subject_ids?: string[] }) => {
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

  const handleSuneungYearChange = async (year: number) => {
    setSuneungYear(year);

    if (year >= 2027) {
      // 2027년 이후: 통합사회 자동 선택
      const tonghapIds = TONGHAP_SUBJECT_IDS;
      setSelectedSubjects(new Set(tonghapIds));
      await updateSettings({ suneung_year: year, interest_subject_ids: tonghapIds });
    } else {
      // 2026년: 빈 배열로 초기화
      setSelectedSubjects(new Set());
      await updateSettings({ suneung_year: year, interest_subject_ids: [] });
    }
  };

  const handleOmrPositionChange = async (position: OmrPosition) => {
    setOmrPosition(position);
    await updateSettings({ omr_position: position });
  };

  const toggleSubject = async (subjectId: string) => {
    const newSelected = new Set(selectedSubjects);

    if (newSelected.has(subjectId)) {
      newSelected.delete(subjectId);
    } else {
      newSelected.add(subjectId);
    }

    setSelectedSubjects(newSelected);
    await updateSettings({ interest_subject_ids: Array.from(newSelected) });
  };

  // 수능 연도에 따라 과목 필터링 (하드코딩된 과목 사용)
  const filteredSubjects = useMemo(() => {
    return getSubjectsByYear(suneungYear);
  }, [suneungYear]);

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
              {/* 수능 연도 설정 */}
              <div className="p-4 border-b border-[var(--border)]">
                <h2 className="text-sm font-medium text-black mb-2">대학수학능력시험 목표 연도</h2>
                <p className="text-sm text-[var(--gray-600)] mb-4">
                  목표로 하는 수능 연도를 선택하세요.
                </p>
                <div className="relative w-48">
                  <select
                    value={suneungYear || ''}
                    onChange={(e) => handleSuneungYearChange(Number(e.target.value))}
                    disabled={saving}
                    className={`
                      w-full px-4 py-2.5 pr-10 rounded-lg text-sm font-medium appearance-none
                      border border-gray-200 bg-white text-gray-700
                      focus:outline-none focus:ring-2 focus:ring-[#FF00A1] focus:border-transparent
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <option value="" disabled>연도 선택</option>
                    {suneungYears.map((year) => (
                      <option key={year} value={year}>
                        {year}학년도 수능
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

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
                  {filteredSubjects.map((subject) => {
                    const isSelected = selectedSubjects.has(subject.id);
                    return (
                      <button
                        key={subject.id}
                        type="button"
                        onClick={() => toggleSubject(subject.id)}
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
                        {subject.label}
                      </button>
                    );
                  })}
                </div>

                {filteredSubjects.length === 0 && (
                  <p className="text-sm text-gray-500">선택 가능한 과목이 없습니다.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
