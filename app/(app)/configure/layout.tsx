import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "학습지 미리보기 - KIDARI",
  description: "제작한 통합사회 학습지를 미리보고 PDF로 다운로드하세요. 실시간 미리보기로 완성된 학습지를 확인할 수 있습니다.",
  keywords: ["학습지 미리보기", "PDF 다운로드", "통합사회 학습지", "문제집 미리보기", "학습자료"],
  openGraph: {
    title: "학습지 미리보기 - KIDARI",
    description: "제작한 통합사회 학습지를 미리보고 PDF로 다운로드하세요.",
  },
};

export default function ConfigureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}