import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다 (404)',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-7xl font-black text-blue-600 tracking-tight">404</p>
        <h1 className="text-xl font-bold text-gray-900">페이지를 찾을 수 없습니다</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          요청하신 페이지가 삭제됐거나 주소가 변경되었습니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/"
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            홈으로 이동
          </Link>
          <Link
            href="/recommendations"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            추천 결과 보기
          </Link>
        </div>
      </div>
    </main>
  )
}
