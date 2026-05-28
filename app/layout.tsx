import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gong.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: '공기업 가산점 추천 — 내 스펙에 맞는 공기업 찾기',
    template: '%s — 공기업 가산점 추천',
  },
  description:
    '자격증·어학성적·전공을 입력하면 가산점이 가장 높은 공기업을 순위별로 추천해드립니다. 한국전력공사, 한국가스공사 등 100개 이상 공기업 가산점 DB.',
  keywords: ['공기업', '가산점', '공기업 추천', '공기업 취업', '가산점 계산', '토익 가산점', '자격증 가산점'],
  authors: [{ name: '공기업 가산점 추천' }],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: BASE_URL,
    siteName: '공기업 가산점 추천',
    title: '공기업 가산점 추천 — 내 스펙에 맞는 공기업 찾기',
    description: '자격증·어학성적·전공을 입력하면 가산점이 가장 높은 공기업을 순위별로 추천해드립니다.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: '공기업 가산점 추천' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '공기업 가산점 추천 — 내 스펙에 맞는 공기업 찾기',
    description: '자격증·어학성적·전공을 입력하면 가산점이 가장 높은 공기업을 순위별로 추천해드립니다.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: BASE_URL },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geist.variable}`}>
      <body className="min-h-screen bg-gray-50 antialiased">
        {/* 스크린리더용 본문 바로가기 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm font-medium"
        >
          본문 바로가기
        </a>
        {children}
      </body>
    </html>
  )
}
