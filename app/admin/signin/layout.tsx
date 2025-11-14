import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인 - KIDARI 데이터",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DataSigninLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No top bar for signin page
  return <>{children}</>;
}
