import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HeaderClient from './HeaderClient'

export default async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={user ? '/recommendations' : '/'} className="font-bold text-blue-600 text-lg">
          공기업 가산점
        </Link>

        {user ? (
          <nav className="flex items-center gap-1">
            <Link
              href="/recommendations"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              추천 결과
            </Link>
            <Link
              href="/mypage"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              마이페이지
            </Link>
            <HeaderClient />
          </nav>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5">
              로그인
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
            >
              무료 시작
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
