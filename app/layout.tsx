import type { Metadata } from "next";
import { TopNavbar } from "@/components/topNavbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dasy Web",
  description: "자세한 통합사회 학습지 제작 도구",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ko">
      <head>
        <script src="/fonts/vfs_fonts.js" async></script>
      </head>
      <body>
        <div className="h-screen flex flex-col">
          <TopNavbar />
          <div className="flex-1 min-h-0">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
