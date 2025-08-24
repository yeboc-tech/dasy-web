import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "학습지 제작 - KIDARI",
  description: "통합사회 단원별 문제를 선택하고 맞춤형 학습지를 제작하세요. 난이도, 정답률, 문제 유형을 선별하여 효율적인 학습을 지원합니다.",
  keywords: ["학습지 제작", "통합사회 문제", "단원별 학습", "문제 선별", "맞춤형 학습지"],
  openGraph: {
    title: "학습지 제작 - KIDARI",
    description: "통합사회 단원별 문제를 선택하고 맞춤형 학습지를 제작하세요.",
  },
};

export default function BuildLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}