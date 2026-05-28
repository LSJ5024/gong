'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 프로덕션에서 에러 리포팅 서비스(Sentry 등) 연동 위치
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="ko">
      <body className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-5xl">⚠️</p>
          <h1 className="text-xl font-bold text-gray-900">오류가 발생했습니다</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            일시적인 오류입니다. 잠시 후 다시 시도해주세요.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400">오류 코드: {error.digest}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={reset}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
            <a
              href="/"
              className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              홈으로 이동
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
