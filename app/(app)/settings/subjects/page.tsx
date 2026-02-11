'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader, ChevronDown, TabletSmartphone, FileText } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/contexts/auth-context';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';
import { getSubjectsByYear, TONGHAP_SUBJECT_IDS } from '@/lib/utils/subjectUtils';

// 올해부터 5년간 수능 연도 생성
const currentYear = new Date().getFullYear();
const suneungYears = Array.from({ length: 5 }, (_, i) => currentYear + i);

export default function AppSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);

  const {
    suneungYear,
    currentGrade,
    solveMode,
    omrPosition,
    problemRange,
    interestSubjectIds,
    loading,
    fetchSettings,
    updateSettings,
  } = useUserAppSettingStore();

  useEffect(() => {
    if (!authLoading && user) {
      fetchSettings(user.id);
    }
  }, [user, authLoading, fetchSettings]);

  const handleSuneungYearChange = async (year: number) => {
    if (!user) return;
    setSaving(true);

    if (year >= 2027) {
      // 2027년 이후: 통합사회 자동 선택
      await updateSettings(user.id, { suneung_year: year, interest_subject_ids: TONGHAP_SUBJECT_IDS });
    } else {
      // 2026년: 빈 배열로 초기화
      await updateSettings(user.id, { suneung_year: year, interest_subject_ids: [] });
    }

    setSaving(false);
  };

  const handleCurrentGradeChange = async (grade: 'g3' | 'g2' | 'g1') => {
    if (!user) return;
    setSaving(true);
    await updateSettings(user.id, { current_grade: grade });
    setSaving(false);
  };

  const handleSolveModeChange = async (mode: 'pdf' | 'tablet') => {
    if (!user) return;
    setSaving(true);
    await updateSettings(user.id, { solve_mode: mode });
    setSaving(false);
  };

  const handleOmrPositionChange = async (position: 'left' | 'right') => {
    if (!user) return;
    setSaving(true);
    await updateSettings(user.id, { omr_position: position });
    setSaving(false);
  };

  const handleProblemRangeChange = async (range: 'recent3' | 'recent5' | 'total') => {
    if (!user) return;
    setSaving(true);
    await updateSettings(user.id, { problem_range: range });
    setSaving(false);
  };

  const toggleSubject = async (subjectId: string) => {
    if (!user) return;

    const newSelected = new Set(interestSubjectIds);

    if (newSelected.has(subjectId)) {
      newSelected.delete(subjectId);
    } else {
      // 최대 2개까지만 선택 가능
      if (newSelected.size >= 2) {
        return;
      }
      newSelected.add(subjectId);
    }

    setSaving(true);
    await updateSettings(user.id, { interest_subject_ids: Array.from(newSelected) });
    setSaving(false);
  };

  // 수능 연도에 따라 과목 필터링 (하드코딩된 과목 사용)
  const filteredSubjects = useMemo(() => {
    return getSubjectsByYear(suneungYear);
  }, [suneungYear]);

  const selectedSubjects = new Set(interestSubjectIds);

  return (
    <ProtectedRoute>
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">앱 설정</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading || authLoading ? (
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

              {/* Current Grade Setting */}
              <div className="p-4 border-b border-[var(--border)]">
                <h2 className="text-sm font-medium text-black mb-4">현재 학년</h2>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleCurrentGradeChange('g3')}
                    disabled={saving}
                    className={`
                      px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${currentGrade === 'g3'
                        ? 'bg-[#fff0f7] text-[#FF00A1]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    고3
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurrentGradeChange('g2')}
                    disabled={saving}
                    className={`
                      px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${currentGrade === 'g2'
                        ? 'bg-[#fff0f7] text-[#FF00A1]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    고2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurrentGradeChange('g1')}
                    disabled={saving}
                    className={`
                      px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${currentGrade === 'g1'
                        ? 'bg-[#fff0f7] text-[#FF00A1]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    고1
                  </button>
                </div>
              </div>

              {/* Problem Range Setting */}
              <div className="p-4 border-b border-[var(--border)]">
                <h2 className="text-sm font-medium text-black mb-4">학습 목표</h2>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleProblemRangeChange('recent3')}
                    disabled={saving}
                    className={`
                      px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${problemRange === 'recent3'
                        ? 'bg-[#fff0f7] text-[#FF00A1]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    최근 3개년
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProblemRangeChange('recent5')}
                    disabled={saving}
                    className={`
                      px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${problemRange === 'recent5'
                        ? 'bg-[#fff0f7] text-[#FF00A1]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    최근 5개년
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProblemRangeChange('total')}
                    disabled={saving}
                    className={`
                      px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${problemRange === 'total'
                        ? 'bg-[#fff0f7] text-[#FF00A1]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    전체
                  </button>
                </div>
              </div>

              {/* Interest Subjects Setting */}
              <div className="p-4 border-b border-[var(--border)]">
                <h2 className="text-sm font-medium text-black mb-2">학습 과목</h2>
                <p className="text-sm text-[var(--gray-600)] mb-4">
                  학습할 과목을 선택하세요 (최대 2개).
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
                          px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                          ${isSelected
                            ? 'bg-[#fff0f7] text-[#FF00A1]'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                          ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        {subject.label}
                      </button>
                    );
                  })}
                </div>

                {filteredSubjects.length === 0 && (
                  <p className="text-sm text-gray-500">선택 가능한 과목이 없습니다.</p>
                )}
              </div>

              {/* Solve Mode Setting */}
              <div className="p-4 border-b border-[var(--border)]">
                <h2 className="text-sm font-medium text-black mb-2">풀기 모드</h2>
                <p className="text-sm text-[var(--gray-600)] mb-4">
                  문제 풀이 시 기본 모드를 설정합니다.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleSolveModeChange('tablet')}
                    disabled={saving}
                    className={`
                      flex items-center gap-1.5
                      px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${solveMode === 'tablet'
                        ? 'bg-[#fff0f7] text-[#FF00A1]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <TabletSmartphone className="w-4 h-4 -rotate-90" />
                    태블릿모드
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSolveModeChange('pdf')}
                    disabled={saving}
                    className={`
                      flex items-center gap-1.5
                      px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${solveMode === 'pdf'
                        ? 'bg-[#fff0f7] text-[#FF00A1]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <FileText className="w-4 h-4" />
                    PDF모드
                  </button>
                </div>
              </div>

              {/* OMR Position Setting */}
              <div className="p-4">
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
                      px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${omrPosition === 'left'
                        ? 'bg-[#fff0f7] text-[#FF00A1]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    좌측
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOmrPositionChange('right')}
                    disabled={saving}
                    className={`
                      px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${omrPosition === 'right'
                        ? 'bg-[#fff0f7] text-[#FF00A1]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    우측
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
