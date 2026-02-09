'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Target, BookOpen, BarChart3, Sparkles, FileText, ChevronRight, Lightbulb } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useUserAppSettingStore } from '@/lib/zustand/userAppSettingStore';
import { getSubjectLabel } from '@/lib/utils/subjectUtils';

export default function MyDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { interestSubjectIds, fetchSettings } = useUserAppSettingStore();

  useEffect(() => {
    if (!authLoading && user) {
      fetchSettings(user.id);
    }
  }, [user, authLoading, fetchSettings]);

  // 연도 계산
  const currentYear = new Date().getFullYear();
  const recent5Start = currentYear - 5;
  const recent5End = currentYear - 1;

  // TODO: 실제 데이터로 교체
  const currentYearData = [
    { turn: 1, completed: 0, total: 50 },
    { turn: 2, completed: 0, total: 50 },
    { turn: 3, completed: 0, total: 50 },
  ];

  const turnData = [
    { turn: 1, completed: 45, total: 100 },
    { turn: 2, completed: 20, total: 100 },
    { turn: 3, completed: 5, total: 100 },
  ];

  // 단원별 학습 분석 코멘트 (내가 푼 문제 기반)
  const chapterAnalysisComment: Record<string, string> = {
    '경제': '<b>경제생활과 경제 문제</b> 단원을 가장 많이 학습했어요. <b>세계 시장과 교역</b> 단원은 아직 학습량이 부족하니 집중해보세요.',
    '동아시아사': '<b>동아시아 세계의 성립과 변화</b> 단원 학습이 잘 진행되고 있어요. <b>오늘날의 동아시아</b> 단원의 정답률이 낮으니 복습이 필요합니다.',
    '사회문화': '<b>문화와 사회</b> 단원에서 높은 정답률을 보이고 있어요! <b>사회 계층과 불평등</b> 단원은 정답률이 낮으니 개념 정리가 필요합니다.',
    '생활과윤리': '<b>현대의 삶과 실천 윤리</b> 단원을 잘 이해하고 있어요. <b>과학과 윤리</b> 단원은 학습량과 정답률 모두 보완이 필요합니다.',
    '세계사': '<b>인류의 출현과 문명의 발생</b> 단원에서 뛰어난 정답률을 보여요! <b>서아시아·인도 지역의 역사</b> 단원도 꾸준히 학습해보세요.',
    '세계지리': '<b>세계화와 지역 이해</b> 단원의 정답률이 우수해요. <b>몬순 아시아와 오세아니아</b> 단원은 더 많은 문제 풀이가 필요합니다.',
    '윤리와사상': '<b>인간과 윤리 사상</b> 단원을 잘 이해하고 있어요. <b>서양 윤리 사상</b> 단원은 학습량 대비 정답률이 낮으니 복습해보세요.',
    '정치와법': '<b>민주 국가와 정부</b> 단원에서 좋은 성적을 보이고 있어요. <b>정치 과정과 참여</b> 단원의 정답률 향상이 필요합니다.',
    '한국지리': '<b>국토 인식과 지리 정보</b> 단원의 정답률이 높아요! <b>거주 공간의 변화와 지역 개발</b> 단원은 더 집중해서 학습해보세요.',
    '통합사회': '<b>인간, 사회, 환경과 행복</b> 단원을 잘 이해하고 있어요. <b>생활 공간과 사회</b> 단원은 추가 학습이 필요합니다.',
  };

  // 단원별 학습 현황 목 데이터 (내가 푼 문제 기반)
  const chapterProgressData: Record<string, { chapter: string; solved: number; total: number; accuracy: number }[]> = {
    '경제': [
      { chapter: '경제생활과 경제 문제', solved: 12, total: 25, accuracy: 75 },
      { chapter: '시장과 경제 활동', solved: 8, total: 30, accuracy: 62 },
      { chapter: '국가와 경제 활동', solved: 5, total: 28, accuracy: 80 },
      { chapter: '세계 시장과 교역', solved: 3, total: 22, accuracy: 67 },
    ],
    '동아시아사': [
      { chapter: '동아시아 역사의 시작', solved: 10, total: 20, accuracy: 70 },
      { chapter: '동아시아 세계의 성립과 변화', solved: 15, total: 35, accuracy: 73 },
      { chapter: '동아시아의 사회 변동과 문화 교류', solved: 7, total: 25, accuracy: 57 },
      { chapter: '오늘날의 동아시아', solved: 2, total: 18, accuracy: 50 },
    ],
    '사회문화': [
      { chapter: '사회·문화 현상의 탐구', solved: 14, total: 22, accuracy: 79 },
      { chapter: '개인과 사회 구조', solved: 11, total: 28, accuracy: 64 },
      { chapter: '문화와 사회', solved: 6, total: 20, accuracy: 83 },
      { chapter: '사회 계층과 불평등', solved: 9, total: 32, accuracy: 56 },
    ],
    '생활과윤리': [
      { chapter: '현대의 삶과 실천 윤리', solved: 8, total: 18, accuracy: 75 },
      { chapter: '생명과 윤리', solved: 12, total: 30, accuracy: 67 },
      { chapter: '사회와 윤리', solved: 10, total: 28, accuracy: 70 },
      { chapter: '과학과 윤리', solved: 4, total: 22, accuracy: 50 },
    ],
    '세계사': [
      { chapter: '인류의 출현과 문명의 발생', solved: 7, total: 15, accuracy: 86 },
      { chapter: '동아시아 지역의 역사', solved: 13, total: 32, accuracy: 69 },
      { chapter: '서아시아·인도 지역의 역사', solved: 9, total: 25, accuracy: 67 },
      { chapter: '유럽·아메리카 지역의 역사', solved: 11, total: 35, accuracy: 73 },
    ],
    '세계지리': [
      { chapter: '세계화와 지역 이해', solved: 6, total: 18, accuracy: 83 },
      { chapter: '세계의 자연환경과 인간 생활', solved: 14, total: 38, accuracy: 64 },
      { chapter: '세계의 인문환경과 인문 경관', solved: 8, total: 28, accuracy: 75 },
      { chapter: '몬순 아시아와 오세아니아', solved: 5, total: 20, accuracy: 60 },
    ],
    '윤리와사상': [
      { chapter: '인간과 윤리 사상', solved: 9, total: 20, accuracy: 78 },
      { chapter: '동양과 한국 윤리 사상', solved: 16, total: 40, accuracy: 69 },
      { chapter: '서양 윤리 사상', solved: 12, total: 35, accuracy: 67 },
      { chapter: '사회사상', solved: 7, total: 25, accuracy: 71 },
    ],
    '정치와법': [
      { chapter: '민주주의와 헌법', solved: 11, total: 28, accuracy: 73 },
      { chapter: '민주 국가와 정부', solved: 8, total: 25, accuracy: 75 },
      { chapter: '정치 과정과 참여', solved: 10, total: 30, accuracy: 60 },
      { chapter: '개인 생활과 법', solved: 6, total: 22, accuracy: 67 },
    ],
    '한국지리': [
      { chapter: '국토 인식과 지리 정보', solved: 5, total: 15, accuracy: 80 },
      { chapter: '지형 환경과 인간 생활', solved: 12, total: 35, accuracy: 67 },
      { chapter: '기후 환경과 인간 생활', solved: 9, total: 28, accuracy: 78 },
      { chapter: '거주 공간의 변화와 지역 개발', solved: 7, total: 25, accuracy: 57 },
    ],
    '통합사회': [
      { chapter: '인간, 사회, 환경과 행복', solved: 10, total: 22, accuracy: 82 },
      { chapter: '자연환경과 인간', solved: 8, total: 25, accuracy: 75 },
      { chapter: '생활 공간과 사회', solved: 6, total: 20, accuracy: 67 },
      { chapter: '인권 보장과 헌법', solved: 11, total: 28, accuracy: 73 },
    ],
  };

  // 과목별 기출문제 TIP 목 데이터
  const chapterAnalysis: Record<string, string> = {
    '경제': '<b>시장과 경제</b> 단원의 수요·공급 곡선 문제가 자주 출제됩니다. <b>국제 경제</b> 파트에서 환율과 무역수지 개념을 집중적으로 복습하세요. 금융 상품 비교 문제도 최근 출제 빈도가 높아지고 있습니다.',
    '동아시아사': '<b>동아시아 세계의 성립</b>과 <b>국제 관계의 다원화</b> 단원에서 출제 비중이 높습니다. 특히 중국 왕조별 대외 정책과 조공·책봉 관계를 정리해두세요. 근대화 과정에서 각국의 개항 순서와 배경도 중요합니다.',
    '사회문화': '<b>사회 계층과 불평등</b> 단원의 계층 이동 유형 문제가 핵심입니다. <b>사회 조사 방법론</b>에서 양적·질적 연구의 차이점을 명확히 구분하세요. 일탈 이론과 사회화 기관 관련 문제도 자주 출제됩니다.',
    '생활과윤리': '<b>생명 윤리</b>와 <b>사회 윤리</b> 단원의 출제 비중이 높습니다. 특히 동·서양 사상가별 입장 비교 문제를 집중 학습하세요. 환경 윤리에서 인간중심주의와 생태중심주의 구분도 필수입니다.',
    '세계사': '<b>시민 혁명과 산업 혁명</b> 단원이 출제 빈도가 가장 높습니다. <b>제국주의와 두 차례 세계 대전</b> 파트의 인과관계를 정리하세요. 동서양 문명의 교류와 르네상스 관련 문제도 꾸준히 출제됩니다.',
    '세계지리': '<b>기후와 지형</b> 단원의 그래프 해석 문제가 핵심입니다. <b>도시와 도시화</b> 파트에서 세계 주요 도시의 특징을 비교 정리하세요. 에너지 자원의 분포와 국제 이동 관련 문제도 중요합니다.',
    '윤리와사상': '<b>한국과 동양 윤리</b>에서 유교 사상가별 핵심 개념 비교가 자주 출제됩니다. <b>서양 윤리</b>의 공리주의와 의무론 구분을 명확히 하세요. 사회사상에서 자유주의와 공동체주의 비교도 필수입니다.',
    '정치와법': '<b>민주주의와 헌법</b> 단원의 기본권 제한 문제가 핵심입니다. <b>정치 과정과 참여</b>에서 선거 제도 비교 문제를 집중 학습하세요. 국제 정치와 법 단원도 최근 출제 비중이 높아지고 있습니다.',
    '한국지리': '<b>지형과 기후</b> 단원의 지형도 해석 문제가 자주 출제됩니다. <b>인구와 도시</b> 파트에서 수도권 집중 현상과 도시 구조를 정리하세요. 지역별 산업 특성과 교통망 관련 문제도 중요합니다.',
    '통합사회': '<b>인권과 정의</b> 단원과 <b>시장 경제와 금융</b> 파트의 출제 비중이 높습니다. 문화 다양성과 세계화 관련 개념을 정리해두세요. 환경 문제와 지속 가능한 발전 단원도 자주 출제됩니다.',
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">내 학습 현황</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 이번년도 기출문제 복습현황 */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#FF00A1]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">이번년도 기출문제 복습현황 ({currentYear})</h2>
          </div>

          <div className="space-y-4">
            {currentYearData.map(({ turn, completed, total }) => {
              const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <div key={turn} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[var(--foreground)]">{turn}턴</span>
                    <span className="text-[var(--gray-500)]">{completed} / {total} ({percentage}%)</span>
                  </div>
                  <div className="h-3 bg-[#FFF0F7] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF00A1] rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 지난 5개년 기출문제 복습현황 */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-[#FF00A1]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">지난 5개년 기출문제 복습현황 ({recent5Start} ~ {recent5End})</h2>
          </div>

          <div className="space-y-4">
            {turnData.map(({ turn, completed, total }) => {
              const percentage = Math.round((completed / total) * 100);
              return (
                <div key={turn} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[var(--foreground)]">{turn}턴</span>
                    <span className="text-[var(--gray-500)]">{completed} / {total} ({percentage}%)</span>
                  </div>
                  <div className="h-3 bg-[#FFF0F7] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF00A1] rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 단원별 기출 학습 현황 */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-[#FF00A1]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">단원별 기출 학습 현황</h2>
          </div>

          {interestSubjectIds.length > 0 ? (
            <div className="space-y-6">
              {interestSubjectIds.map((subjectId) => {
                const chapters = chapterProgressData[subjectId] || [];
                const comment = chapterAnalysisComment[subjectId] || '';
                return (
                  <div key={subjectId}>
                    <h3 className="text-sm font-medium text-[#FF00A1] mb-2">
                      {getSubjectLabel(subjectId) || subjectId}
                    </h3>
                    {comment && (
                      <p
                        className="text-sm text-gray-600 leading-relaxed mb-3"
                        dangerouslySetInnerHTML={{ __html: comment }}
                      />
                    )}
                    <div className="space-y-2">
                      {chapters.map((item, idx) => {
                        const progressPercent = Math.round((item.solved / item.total) * 100);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-700 truncate flex-1 mr-2">{item.chapter}</span>
                              <span className="text-gray-500 whitespace-nowrap">
                                {item.solved}/{item.total} · 정답률 {item.accuracy}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#FF00A1] rounded-full transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-400 py-8 text-center">
              관심 과목을 설정해주세요.
            </div>
          )}

          <Link
            href="/my/by-chapter"
            className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-[#FF00A1] transition-colors pt-4 mt-4 border-t border-gray-100"
          >
            상세보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 난이도별 기출 학습 현황 */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[#FF00A1]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">난이도별 기출 학습 현황</h2>
          </div>

          {/* TODO: 난이도별 학습 현황 내용 추가 */}
          <div className="text-sm text-gray-400 py-8 text-center">
            준비 중
          </div>

          <Link
            href="/my/by-difficulty"
            className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-[#FF00A1] transition-colors pt-2 border-t border-gray-100"
          >
            상세보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 시험별 학습 현황 */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-[#FF00A1]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">시험별 학습 현황</h2>
          </div>

          {/* TODO: 시험별 학습 현황 내용 추가 */}
          <div className="text-sm text-gray-400 py-8 text-center">
            준비 중
          </div>

          <Link
            href="/my/by-exam"
            className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-[#FF00A1] transition-colors pt-2 border-t border-gray-100"
          >
            상세보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 과목별 기출문제 TIP */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-[#FF00A1]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">과목별 기출문제 TIP</h2>
          </div>

          {interestSubjectIds.length > 0 ? (
            <div className="space-y-4">
              {interestSubjectIds.map((subjectId) => (
                <div key={subjectId} className="space-y-2">
                  <h3 className="text-sm font-medium text-[#FF00A1]">
                    {getSubjectLabel(subjectId) || subjectId}
                  </h3>
                  <p
                    className="text-sm text-gray-600 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: chapterAnalysis[subjectId] || '분석 데이터를 준비 중입니다.'
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 py-8 text-center">
              관심 과목을 설정해주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
