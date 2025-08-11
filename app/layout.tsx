import type { Metadata } from "next";
// import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dasy Web",
  description: "자세한 통합사회 학습지 제작 도구",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ko">
      <body>
        <div className="h-screen flex flex-col">
          {/* <Navbar />           */}
          <div className="flex-1 min-h-0">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
