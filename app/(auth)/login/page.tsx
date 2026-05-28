'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    } else {
      router.push('/recommendations')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleKakaoLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">로그인</h1>
        <p className="text-sm text-center text-gray-500 mb-8">
          공기업 가산점 맞춤 추천 서비스
        </p>

        <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example@email.com"
              autoComplete="email"
              required
              aria-required="true"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">비밀번호</label>
              <Link href="/forgot-password" className="text-xs text-blue-500 hover:underline">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              required
              aria-required="true"
            />
          </div>

          {/* aria-live: 오류 메시지를 스크린리더에 즉시 알림 */}
          <div aria-live="polite" aria-atomic="true" className="min-h-[1.25rem]">
            {error && (
              <p role="alert" className="text-red-600 text-sm">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            {loading ? '로그인 중...' : '이메일로 로그인'}
          </button>
        </form>

        <div className="relative my-6" aria-hidden="true">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-white px-2">또는</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleKakaoLogin}
            className="w-full bg-yellow-400 text-gray-900 rounded-lg py-3 text-sm font-medium hover:bg-yellow-500 transition-colors min-h-[44px]"
          >
            카카오로 로그인
          </button>
          <button
            onClick={handleGoogleLogin}
            className="w-full border border-gray-300 text-gray-700 rounded-lg py-3 text-sm font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            Google로 로그인
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline font-medium">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  )
}
