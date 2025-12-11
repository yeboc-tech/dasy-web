import type { Metadata } from "next";
import Script from "next/script";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { ConditionalLayout } from "@/components/layout/conditional-layout";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "KIDARI - 통합사회 학습지 제작 도구",
  description: "통합사회 기출문제로 맞춤형 학습지를 제작하세요. AI 기반 문제 선별과 PDF 생성으로 효율적인 학습을 지원합니다.",
  keywords: ["통합사회", "기출문제", "학습지", "문제집", "고등학교", "사회", "교육", "KIDARI"],
  authors: [{ name: "Minlab" }],
  creator: "Minlab",
  publisher: "Minlab",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://tong.kidari.ai'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "KIDARI - 통합사회 학습지 제작 도구",
    description: "통합사회 기출문제로 맞춤형 학습지를 제작하세요. AI 기반 문제 선별과 PDF 생성으로 효율적인 학습을 지원합니다.",
    url: "https://tong.kidari.ai",
    siteName: "KIDARI",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KIDARI - 통합사회 학습지 제작 도구",
    description: "통합사회 기출문제로 맞춤형 학습지를 제작하세요.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'KIDARI',
  description: '통합사회 기출문제로 맞춤형 학습지를 제작하세요. AI 기반 문제 선별과 PDF 생성으로 효율적인 학습을 지원합니다.',
  url: 'https://tong.kidari.ai',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KRW',
  },
  creator: {
    '@type': 'Organization',
    name: 'Minlab',
  },
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  const isProduction = process.env.NODE_ENV === 'production';

  return (
    <html lang="ko">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script src="/fonts/vfs_fonts.js" async></script>
        {isProduction && (
          <Script id="google-tag-manager">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-KM5LPG9Q');`}
          </Script>
        )}
      </head>
      <body>
        {isProduction && (
          <>
            <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KM5LPG9Q"
              height="0" width="0" style={{display:'none',visibility:'hidden'}}></iframe></noscript>
            
            <Script src="https://www.googletagmanager.com/gtag/js?id=G-3WZLFV9KR7" />
            <Script id="google-analytics">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-3WZLFV9KR7');
              `}
            </Script>
          </>
        )}
        <AuthProvider>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
