import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { isAdmin } from '@/lib/utils/check-admin'

export const metadata: Metadata = { title: '어드민 — 공기업 가산점' }

const NAV = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/enterprises', label: '기업 관리' },
  { href: '/admin/reports', label: '신고 관리' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 비로그인 → 로그인 페이지로
  if (!user) redirect('/login')

  // DB 기반 어드민 확인
  const ok = await isAdmin(supabase)
  if (!ok) redirect('/?error=forbidden')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 어드민 헤더 */}
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-sm">🛠 어드민</span>
          <nav className="flex gap-4">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{user.email}</span>
          <Link href="/" className="text-xs text-gray-400 hover:text-white">← 서비스로</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
