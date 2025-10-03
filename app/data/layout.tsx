import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "데이터 관리 - KIDARI",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
