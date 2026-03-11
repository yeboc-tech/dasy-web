'use client';

import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { CheckCircle2, ChevronRight, Play, TrendingUp, Target, RotateCcw, FileDown, BarChart2, Clock } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFF5FA' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-pink-100">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900">KIDARI</span>
          <Link
            href="/my/dashboard"
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#FF00A1' }}
          >
            무료로 시작하기
          </Link>
        </div>
      </nav>

      <main className="flex-1">

        {/* ───── Hero ───── */}
        <section className="pt-16 pb-12 px-5">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-12">
            {/* Left: copy */}
            <div className="flex-1 text-center lg:text-left">
              <p className="text-sm font-semibold mb-4" style={{ color: '#FF00A1' }}>
                사회탐구 기출문제 학습 플랫폼
              </p>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-[1.25] mb-5 break-keep">
                기출만 제대로 해도<br />
                <span style={{ color: '#FF00A1' }}>사탐 1등급</span>은 가능해요
              </h1>
              <p className="text-base md:text-lg text-gray-500 leading-relaxed mb-8 max-w-md mx-auto lg:mx-0 break-keep">
                10년간 수능·모의고사 기출을 과목별로 정리하고,<br className="hidden md:block" />
                오답만 골라서 반복하면 빈틈이 사라집니다.
              </p>
              <Link
                href="/my/dashboard"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-white text-base font-semibold rounded-xl transition-all hover:opacity-90"
                style={{ backgroundColor: '#FF00A1' }}
              >
                지금 무료로 시작하기
                <ChevronRight className="w-5 h-5" />
              </Link>
              <p className="mt-3 text-xs text-gray-400">가입만 하면 바로 이용 가능</p>
            </div>

            {/* Right: video */}
            <div className="flex-1 w-full max-w-lg">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border border-pink-100 bg-white">
                <video
                  className="w-full h-full object-cover"
                  poster="/images/landing-video-poster.png"
                  controls
                  playsInline
                >
                  <source src="/videos/landing-demo.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-white pointer-events-none [video[src]+&]:hidden">
                  <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center mb-3">
                    <Play className="w-7 h-7 ml-0.5" style={{ color: '#FF00A1' }} />
                  </div>
                  <p className="text-sm text-gray-400">30초 미리보기</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── Social Proof ───── */}
        <section className="py-10 px-5 bg-white border-y border-pink-100">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-extrabold" style={{ color: '#FF00A1' }}>15,000+</p>
              <p className="text-sm text-gray-500 mt-1">수록 기출문제</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-extrabold" style={{ color: '#FF00A1' }}>9과목</p>
              <p className="text-sm text-gray-500 mt-1">사회탐구 전 과목</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-extrabold" style={{ color: '#FF00A1' }}>10년</p>
              <p className="text-sm text-gray-500 mt-1">기출 데이터 (16~25)</p>
            </div>
          </div>
        </section>

        {/* ───── Pain Point → Solution ───── */}
        <section className="py-20 px-5">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 break-keep">
              혹시 이런 고민 하고 있나요?
            </h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { pain: '기출 어디서부터 풀어야 할지 모르겠어요', solution: '단원별·난이도별로 정리된 기출을 바로 풀 수 있어요' },
              { pain: '틀린 문제를 따로 모아두기 귀찮아요', solution: '자동으로 오답을 모아서 복습 학습지를 만들어줘요' },
              { pain: '매일 꾸준히 하고 싶은데 뭘 풀지 모르겠어요', solution: '매일 나에게 맞는 문제를 추천해주는 "오늘의 문제"가 있어요' },
              { pain: '내가 어디가 약한지 파악이 안 돼요', solution: '단원별·난이도별 정답률을 분석해서 취약점을 알려줘요' },
            ].map(({ pain, solution }) => (
              <div key={pain} className="bg-white rounded-xl p-5 border border-pink-100">
                <p className="text-sm text-gray-400 mb-1.5">😩 {pain}</p>
                <p className="text-base font-medium text-gray-900 flex items-start gap-2">
                  <span className="mt-0.5 shrink-0" style={{ color: '#FF00A1' }}>→</span>
                  {solution}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ───── 핵심 기능 ───── */}
        <section className="py-20 px-5 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 break-keep">
                키다리가 성적을 올려주는 방법
              </h2>
              <p className="text-base text-gray-500">
                기출 학습의 핵심만 담았습니다
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <FeatureCard
                icon={<Target className="w-5 h-5" />}
                title="오늘의 문제"
                desc="매일 내 수준에 맞는 문제를 추천받아 푸는 것만으로도 감을 유지할 수 있어요. 하루 10분이면 충분합니다."
              />
              <FeatureCard
                icon={<RotateCcw className="w-5 h-5" />}
                title="오답복습"
                desc="틀린 문제만 자동으로 모아서 반복 학습. 같은 유형을 또 틀리지 않도록 완벽하게 잡아줍니다."
              />
              <FeatureCard
                icon={<FileDown className="w-5 h-5" />}
                title="학습지 PDF 다운로드"
                desc="원하는 문제를 직접 골라 나만의 학습지를 만들고 PDF로 출력할 수 있어요. 시험 직전 정리에 딱!"
              />
              <FeatureCard
                icon={<BarChart2 className="w-5 h-5" />}
                title="학습 분석 리포트"
                desc="단원별·난이도별 정답률을 한눈에. 내가 어디가 약한지 정확히 파악하고 집중 공략할 수 있어요."
              />
              <FeatureCard
                icon={<Clock className="w-5 h-5" />}
                title="시험별 기출 풀이"
                desc="수능, 6월/9월 모평, 학력평가까지 시험 유형별로 기출을 풀어볼 수 있어요."
              />
              <FeatureCard
                icon={<TrendingUp className="w-5 h-5" />}
                title="학습 캘린더"
                desc="매일 얼마나 공부했는지 기록이 쌓여요. 꾸준함이 보이면 자신감도 올라갑니다."
              />
            </div>
          </div>
        </section>

        {/* ───── 성적 향상 기대감 ───── */}
        <section className="py-20 px-5">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 break-keep">
              기출을 반복하면<br />성적은 반드시 오릅니다
            </h2>
            <p className="text-base text-gray-500 mb-12 max-w-xl mx-auto break-keep">
              사회탐구는 기출 반복이 곧 실력입니다.<br />
              키다리로 매일 꾸준히 풀고, 오답만 확실히 잡으면<br />
              3개월 안에 변화를 체감할 수 있어요.
            </p>
            <div className="grid md:grid-cols-3 gap-5">
              <ResultCard
                number="1단계"
                period="1~2주"
                title="감 잡기"
                desc="기출 유형이 눈에 들어오기 시작해요. 어떤 문제가 자주 나오는지 보여요."
              />
              <ResultCard
                number="2단계"
                period="1~2개월"
                title="취약점 보완"
                desc="오답복습으로 반복해서 틀리던 유형이 줄어들어요. 정답률이 눈에 띄게 올라갑니다."
              />
              <ResultCard
                number="3단계"
                period="3개월~"
                title="안정적 고득점"
                desc="기출이 체화되면 새로운 문제도 흔들리지 않아요. 1~2등급이 자연스러워집니다."
              />
            </div>
          </div>
        </section>

        {/* ───── 과목 ───── */}
        <section className="py-16 px-5 bg-white border-y border-pink-100">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
              사회탐구 9과목 전체 지원
            </h2>
            <div className="flex flex-wrap justify-center gap-2.5">
              {['경제', '동아시아사', '사회·문화', '생활과 윤리', '세계사', '세계지리', '윤리와 사상', '정치와 법', '한국지리'].map((s) => (
                <span
                  key={s}
                  className="px-4 py-2 rounded-full text-sm font-medium border border-pink-200 text-gray-700"
                  style={{ backgroundColor: '#FFF0F7' }}
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-5">2027학년도 통합사회 1·2도 준비 중</p>
          </div>
        </section>

        {/* ───── 요금제 ───── */}
        <section className="py-20 px-5">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                무료로 시작, 필요할 때 업그레이드
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {/* Free */}
              <div className="bg-white rounded-2xl border border-pink-100 p-7">
                <p className="text-sm font-semibold text-gray-400 mb-1">Free</p>
                <p className="text-2xl font-bold text-gray-900 mb-5">무료</p>
                <ul className="space-y-2.5 text-sm text-gray-600">
                  <PricingItem>과목 1개 이용</PricingItem>
                  <PricingItem>기출문제 풀이</PricingItem>
                  <PricingItem>오늘의 문제 & 오답복습</PricingItem>
                  <PricingItem>학습지 PDF 다운로드</PricingItem>
                  <PricingItem>학습 결과 분석</PricingItem>
                </ul>
              </div>

              {/* Pro */}
              <div className="rounded-2xl p-7 text-white relative shadow-lg" style={{ backgroundColor: '#FF00A1' }}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gray-900 text-white text-xs font-semibold rounded-full">
                  추천
                </div>
                <p className="text-sm font-semibold text-pink-200 mb-1">Pro</p>
                <p className="text-2xl font-bold mb-5">월 10,000원</p>
                <ul className="space-y-2.5 text-sm text-pink-100">
                  <PricingItem light>과목 무제한</PricingItem>
                  <PricingItem light>Free의 모든 기능</PricingItem>
                  <PricingItem light>매월 10,000 포인트</PricingItem>
                  <PricingItem light>전체 학습 데이터 분석</PricingItem>
                  <PricingItem light>우선 고객 지원</PricingItem>
                </ul>
              </div>

              {/* Teacher */}
              <div className="bg-white rounded-2xl border border-pink-100 p-7">
                <p className="text-sm font-semibold text-gray-400 mb-1">Teacher</p>
                <p className="text-2xl font-bold text-gray-900 mb-5">월 49,000원</p>
                <ul className="space-y-2.5 text-sm text-gray-600">
                  <PricingItem>학습지 직접 제작</PricingItem>
                  <PricingItem>학생 현황 관리</PricingItem>
                  <PricingItem>PDF 학습지 배포</PricingItem>
                  <PricingItem>Pro의 모든 기능</PricingItem>
                  <PricingItem>전용 고객 지원</PricingItem>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ───── Final CTA ───── */}
        <section className="py-20 px-5 text-center" style={{ backgroundColor: '#FF00A1' }}>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 break-keep">
              오늘 시작하면, 3개월 뒤가 달라집니다
            </h2>
            <p className="text-base text-pink-200 mb-10">
              무료로 기출문제 풀어보고, 효과를 직접 확인하세요
            </p>
            <Link
              href="/my/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white font-semibold rounded-xl transition-all hover:opacity-90"
              style={{ color: '#FF00A1' }}
            >
              무료로 시작하기
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ─── Sub Components ─── */

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-4 p-5 rounded-xl border border-pink-100 bg-white hover:shadow-md hover:shadow-pink-50 transition-shadow">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white"
        style={{ backgroundColor: '#FF00A1' }}
      >
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function ResultCard({ number, period, title, desc }: { number: string; period: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-xl border border-pink-100 p-6 text-left">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#FF00A1' }}>
          {number}
        </span>
        <span className="text-xs text-gray-400">{period}</span>
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function PricingItem({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${light ? 'text-pink-200' : 'text-pink-300'}`} />
      <span>{children}</span>
    </li>
  );
}
