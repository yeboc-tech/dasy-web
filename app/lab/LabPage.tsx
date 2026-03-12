'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ──────────────────────────────────────────────────
interface Problem {
  problem_id: string;
  problem_text: string;
  choices_text: Record<string, string>;
  explanations: Record<string, any>;
  correct_answer: string;
  accuracy_rate: number;
  has_edited_image: boolean;
}

type PageState = 'selecting' | 'solving' | 'explanation' | 'correct';

// ─── Constants ──────────────────────────────────────────────
const CDN_BASE_URL = 'https://cdn.y3c.kr/tongkidari/contents';
const CDN_EDITED_URL = 'https://cdn.y3c.kr/tongkidari/edited-contents';

function getImageUrl(problemId: string, hasEdited: boolean): string {
  if (hasEdited) return `${CDN_EDITED_URL}/${problemId}.png`;
  return `${CDN_BASE_URL}/${problemId}.png`;
}

function parseProblemMeta(problemId: string) {
  const parts = problemId.split('_');
  if (parts.length < 7) return null;
  return {
    year: parseInt(parts[2], 10),
    month: parseInt(parts[3], 10),
    examType: parts[4],
  };
}

const SUBUNITS = [
  { id: '1-1', label: '1-1 사회문화 현상의 이해' },
  { id: '1-2', label: '1-2 사회문화 현상의 연구 방법' },
  { id: '1-3', label: '1-3 자료 수집 방법' },
  { id: '2-1', label: '2-1 사회적 존재로서의 인간' },
  { id: '2-2', label: '2-2 사회 집단과 사회 조직' },
  { id: '2-3', label: '2-3 문화의 이해' },
  { id: '2-4', label: '2-4 현대 사회의 문화 변동' },
  { id: '3-1', label: '3-1 사회 계층과 불평등' },
  { id: '3-2', label: '3-2 다양한 사회 불평등' },
  { id: '3-3', label: '3-3 사회 복지와 복지 제도' },
  { id: '4-1', label: '4-1 사회 변동과 사회 운동' },
  { id: '4-2', label: '4-2 현대 사회의 변화와 대응' },
  { id: '4-3', label: '4-3 전 지구적 수준의 문제' },
  { id: '5-1', label: '5-1 개인과 사회의 관계' },
  { id: '5-2', label: '5-2 일탈 행동의 이해' },
  { id: '5-3', label: '5-3 사회 규범과 사회 통제' },
];

// ─── Answer Button Colors (matching kidari-student-app) ─────
function getAnswerButtonStyle(
  num: string,
  selectedAnswer: string | null,
  confirmed: boolean,
  isCorrect: boolean | null,
) {
  const isSelected = selectedAnswer === num;
  const showCorrect = confirmed && isSelected && isCorrect === true;
  const showWrong = confirmed && isSelected && isCorrect === false;

  const bg = showCorrect ? '#D1FAE5' : showWrong ? '#FFF7ED' : isSelected ? '#E0F2FE' : '#F8FAFC';
  const border = showCorrect ? '#10B981' : showWrong ? '#F97316' : isSelected ? '#0EA5E9' : '#E2E8F0';
  const bottomBorder = showCorrect ? '#10B981' : showWrong ? '#F97316' : isSelected ? '#0EA5E9' : '#CBD5E1';
  const textColor = showCorrect ? '#059669' : showWrong ? '#C2410C' : isSelected ? '#0284C7' : '#334155';

  return { bg, border, bottomBorder, textColor };
}

// ─── Concept Card ───────────────────────────────────────────
const IMPORTANCE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  high: { label: '출제 빈도 높음', bg: '#FEE2E2', text: '#DC2626' },
  medium: { label: '출제 빈도 보통', bg: '#FEF9C3', text: '#A16207' },
  low: { label: '출제 빈도 낮음', bg: '#F1F5F9', text: '#64748B' },
};

function ConceptCard({ concept }: { concept: any }) {
  const [expanded, setExpanded] = useState(false);
  const badge = IMPORTANCE_BADGE[concept.exam_importance] ?? IMPORTANCE_BADGE.medium;

  const hasDetail = concept.explanation || concept.key_terms?.length > 0 || concept.common_mistakes?.length > 0;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}
    >
      {/* Header: term + importance badge */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-[15px] font-bold" style={{ color: '#0C4A6E' }}>
          {concept.term}
        </p>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: badge.bg, color: badge.text }}
        >
          {badge.label}
        </span>
      </div>

      {/* Definition — always visible */}
      <div className="px-4 pb-3">
        <p className="text-[14px] leading-[22px]" style={{ color: '#334155' }}>
          {concept.definition}
        </p>
      </div>

      {/* Expand toggle */}
      {hasDetail && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2.5 text-[13px] font-medium cursor-pointer flex items-center gap-1.5"
            style={{ color: '#0284C7', borderTop: '1px solid #BAE6FD' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {expanded ? (
                <line x1="5" y1="12" x2="19" y2="12" />
              ) : (
                <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>
              )}
            </svg>
            {expanded ? '접기' : '자세히 보기'}
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid #BAE6FD' }}>
              {/* Explanation */}
              {concept.explanation && (
                <div className="pt-3">
                  <p className="text-[13px] leading-[20px]" style={{ color: '#475569' }}>
                    {concept.explanation}
                  </p>
                </div>
              )}

              {/* Key terms */}
              {concept.key_terms?.length > 0 && (
                <div>
                  <p className="text-[13px] font-semibold mb-1.5" style={{ color: '#0369A1' }}>
                    핵심 용어
                  </p>
                  <div className="space-y-1">
                    {concept.key_terms.map((kt: any, i: number) => (
                      <div key={i} className="flex gap-2 text-[13px]" style={{ color: '#334155' }}>
                        <span className="font-medium shrink-0">• {kt.term}</span>
                        <span style={{ color: '#64748B' }}>— {kt.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Common mistakes */}
              {concept.common_mistakes?.length > 0 && (
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}
                >
                  <p className="text-[13px] font-semibold mb-1.5" style={{ color: '#C2410C' }}>
                    자주 하는 실수
                  </p>
                  <div className="space-y-1">
                    {concept.common_mistakes.map((mistake: string, i: number) => (
                      <p key={i} className="text-[13px] leading-[20px]" style={{ color: '#9A3412' }}>
                        • {mistake}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Comparison Table ───────────────────────────────────────
function ComparisonTable({ comparison }: { comparison: any }) {
  if (!comparison.axes?.length) return null;

  // Extract column headers from values of the first axis
  const firstValues = comparison.axes[0]?.values ?? {};
  const columns = Object.keys(firstValues);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF' }}
    >
      {/* Title */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-[15px] font-bold" style={{ color: '#5B21B6' }}>
          {comparison.title}
        </p>
      </div>

      {/* Table */}
      <div className="px-4 pb-4">
        <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                className="text-left py-2 px-3 font-semibold"
                style={{ backgroundColor: '#EDE9FE', color: '#5B21B6', borderBottom: '1px solid #DDD6FE' }}
              />
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-center py-2 px-3 font-semibold"
                  style={{ backgroundColor: '#EDE9FE', color: '#5B21B6', borderBottom: '1px solid #DDD6FE' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.axes.map((axis: any, i: number) => (
              <tr key={i}>
                <td
                  className="py-2 px-3 font-medium"
                  style={{
                    color: '#7C3AED',
                    borderBottom: i < comparison.axes.length - 1 ? '1px solid #EDE9FE' : 'none',
                  }}
                >
                  {axis.axis}
                </td>
                {columns.map((col) => (
                  <td
                    key={col}
                    className="text-center py-2 px-3"
                    style={{
                      color: '#334155',
                      borderBottom: i < comparison.axes.length - 1 ? '1px solid #EDE9FE' : 'none',
                    }}
                  >
                    {axis.values?.[col] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LabPage() {
  const [subunitId, setSubunitId] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageState, setPageState] = useState<PageState>('selecting');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isRetry, setIsRetry] = useState(false);
  const [loading, setLoading] = useState(false);
  const explanationRef = useRef<HTMLDivElement>(null);

  const currentProblem = problems[currentIndex] ?? null;

  // ─── Fetch problems for subunit ─────────────────────────
  const loadSubunit = useCallback(async (id: string) => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .rpc('get_lab_problems', { target_subunit: id });

    if (error) {
      console.error('Failed to load problems:', error);
      setLoading(false);
      return;
    }

    const sorted = (data as any[])
      .filter((p) => p.accuracy_rate != null)
      .sort((a, b) => Number(b.accuracy_rate) - Number(a.accuracy_rate));

    setProblems(sorted);
    setCurrentIndex(0);
    setPageState(sorted.length > 0 ? 'solving' : 'selecting');
    setSelectedAnswer(null);
    setConfirmed(false);
    setIsCorrect(null);
    setIsRetry(false);
    setLoading(false);
  }, []);

  const handleSubunitSelect = (id: string) => {
    setSubunitId(id);
    loadSubunit(id);
  };

  // ─── Answer flow ────────────────────────────────────────
  const handleSelectAnswer = (answer: string) => {
    if (confirmed) return;
    setSelectedAnswer(answer);
  };

  const handleConfirm = () => {
    if (!selectedAnswer || !currentProblem || confirmed) return;
    const correct = selectedAnswer === currentProblem.correct_answer;
    setIsCorrect(correct);
    setConfirmed(true);
  };

  const handleContinue = () => {
    if (isCorrect) {
      if (currentIndex + 1 >= problems.length) {
        setPageState('selecting');
        setSubunitId(null);
        return;
      }
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setConfirmed(false);
      setIsCorrect(null);
      setIsRetry(false);
      setPageState('solving');
    } else {
      setPageState('explanation');
    }
  };

  // Auto-scroll to explanation content when entering explanation screen
  useEffect(() => {
    if (pageState === 'explanation' && explanationRef.current) {
      setTimeout(() => {
        explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [pageState]);

  const handleRetry = () => {
    setSelectedAnswer(null);
    setConfirmed(false);
    setIsCorrect(null);
    setIsRetry(true);
    setPageState('solving');
  };

  const subunitLabel = SUBUNITS.find((s) => s.id === subunitId)?.label ?? subunitId;
  const meta = currentProblem ? parseProblemMeta(currentProblem.problem_id) : null;

  // ─── Shared: Problem card + answer buttons (used in solving & explanation) ───
  const renderProblemCard = (showResult: boolean) => (
    <div className="w-full max-w-lg">
      {/* Problem card */}
      <div
        className="overflow-hidden"
        style={{
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Metadata header */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <p className="text-[13px] font-medium" style={{ color: '#94A3B8' }}>
            {meta ? `${meta.year}년 ${meta.month}월 ${meta.examType}` : ''}
            {currentProblem!.accuracy_rate != null && (
              <span>  ·  정답률 {Math.round(Number(currentProblem!.accuracy_rate))}%</span>
            )}
          </p>
          <p className="text-[13px] mt-1" style={{ color: '#94A3B8' }}>
            {subunitLabel}
          </p>
        </div>

        {/* Problem image */}
        <div className="p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getImageUrl(currentProblem!.problem_id, currentProblem!.has_edited_image)}
            alt="문제"
            className="w-full h-auto"
          />
        </div>
      </div>

      {/* Answer buttons */}
      <div className="flex justify-center gap-2 mt-4">
        {['1', '2', '3', '4', '5'].map((num) => {
          const style = getAnswerButtonStyle(
            num,
            showResult ? selectedAnswer : (pageState === 'solving' ? selectedAnswer : null),
            showResult,
            showResult ? isCorrect : null,
          );
          return (
            <button
              key={num}
              onClick={() => { if (!showResult) handleSelectAnswer(num); }}
              className={`select-none transition-transform ${!showResult ? 'cursor-pointer active:translate-y-[1.5px]' : 'cursor-default'}`}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: style.bg,
                border: `1.5px solid ${style.border}`,
                borderBottom: `3px solid ${style.bottomBorder}`,
                fontSize: 17,
                fontWeight: 700,
                color: style.textColor,
              }}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="h-screen w-screen bg-white flex flex-col">

      {/* ════════════════ SELECTING ════════════════ */}
      {pageState === 'selecting' && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-2">Lab</h1>
            <p className="text-gray-500 mb-6">소단원을 선택하면 학습 사이클이 시작됩니다.</p>
            <div className="grid grid-cols-1 gap-2">
              {SUBUNITS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSubunitSelect(s.id)}
                  className="text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ LOADING ════════════════ */}
      {pageState !== 'selecting' && (loading || !currentProblem) && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">문제를 불러오는 중...</p>
        </div>
      )}

      {/* ════════════════ SOLVING ════════════════ */}
      {pageState === 'solving' && !loading && currentProblem && (
        <>
          {/* Progress header */}
          <div className="max-w-2xl w-full mx-auto px-6 pt-8 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setPageState('selecting'); setSubunitId(null); }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / problems.length) * 100}%`,
                    backgroundColor: '#0EA5E9',
                  }}
                />
              </div>
              <span className="text-[13px] font-medium" style={{ color: '#94A3B8' }}>
                {currentIndex + 1}/{problems.length}
              </span>
            </div>
          </div>

          {/* Scrollable problem content */}
          <div className="flex-1 overflow-y-auto flex justify-center px-6 pb-4">
            {renderProblemCard(confirmed)}
          </div>

          {/* Bottom bar */}
          <div className="max-w-2xl w-full mx-auto px-6 py-4 shrink-0 flex items-center justify-between">
            {/* Result indicator */}
            <div className="flex items-center gap-1.5">
              {confirmed && isCorrect !== null && (
                <>
                  {isCorrect ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                  <span
                    className="text-[15px] font-bold"
                    style={{ color: isCorrect ? '#059669' : '#C2410C' }}
                  >
                    {isCorrect ? '정답' : '오답'}
                  </span>
                </>
              )}
            </div>

            {/* Action button */}
            <button
              onClick={confirmed ? handleContinue : handleConfirm}
              disabled={selectedAnswer === null}
              className="min-w-[160px] py-3 rounded-xl text-white font-semibold text-[15px] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#0EA5E9' }}
            >
              {confirmed
                ? (isCorrect
                    ? (currentIndex + 1 >= problems.length ? '학습 완료' : '계속하기')
                    : '해설 보기')
                : '확인'}
            </button>
          </div>
        </>
      )}

      {/* ════════════════ EXPLANATION (separate screen) ════════════════ */}
      {pageState === 'explanation' && !loading && currentProblem && selectedAnswer && (
        <>
          {/* Progress header */}
          <div className="max-w-2xl w-full mx-auto px-6 pt-8 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setPageState('selecting'); setSubunitId(null); }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / problems.length) * 100}%`,
                    backgroundColor: '#0EA5E9',
                  }}
                />
              </div>
              <span className="text-[13px] font-medium" style={{ color: '#94A3B8' }}>
                {currentIndex + 1}/{problems.length}
              </span>
            </div>
          </div>

          {/* Scrollable content: problem card + explanation */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <div className="max-w-lg mx-auto space-y-6">

              {/* Problem card with confirmed answer shown */}
              {renderProblemCard(true)}

              {/* Explanation content */}
              <div ref={explanationRef} />
              {currentProblem.explanations[selectedAnswer] ? (
                <div className="space-y-4">
                  {/* 키다리 chat bubble */}
                  <div>
                    <p className="text-sm font-medium mb-2 ml-1" style={{ color: '#94A3B8' }}>
                      키다리
                    </p>
                    <div
                      className="px-5 py-4"
                      style={{
                        backgroundColor: '#F1F5F9',
                        borderRadius: 16,
                        borderTopLeftRadius: 4,
                      }}
                    >
                      <p className="text-[16px] leading-[24px]" style={{ color: '#334155' }}>
                        {currentProblem.explanations[selectedAnswer].explanation}
                      </p>
                    </div>
                  </div>

                  {/* Related Concepts */}
                  {currentProblem.explanations[selectedAnswer].relatedConcepts?.length > 0 && (
                    <div className="space-y-3">
                      {currentProblem.explanations[selectedAnswer].relatedConcepts.map((concept: any, i: number) => (
                        <ConceptCard key={i} concept={concept} />
                      ))}
                    </div>
                  )}

                  {/* Related Comparisons */}
                  {currentProblem.explanations[selectedAnswer].relatedComparisons?.length > 0 && (
                    <div className="space-y-3">
                      {currentProblem.explanations[selectedAnswer].relatedComparisons.map((comp: any, i: number) => (
                        <ComparisonTable key={i} comparison={comp} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <p className="text-sm" style={{ color: '#94A3B8' }}>이 선지에 대한 해설이 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="max-w-2xl w-full mx-auto px-6 py-4 shrink-0 flex items-center justify-between">
            <div />
            <button
              onClick={handleRetry}
              className="min-w-[160px] py-3 rounded-xl text-white font-semibold text-[15px] cursor-pointer transition-colors"
              style={{ backgroundColor: '#F97316' }}
            >
              다시 풀기
            </button>
          </div>
        </>
      )}

    </div>
  );
}
