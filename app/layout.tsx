import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: '공기업 가산점 추천 — 내 스펙에 맞는 공기업 찾기',
  description: '자격증·어학성적·전공을 입력하면 가산점이 가장 높은 공기업을 순위별로 추천해드립니다.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geist.variable}`}>
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  )
}
