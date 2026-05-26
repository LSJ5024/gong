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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">로그인</h1>
        <p className="text-sm text-center text-gray-500 mb-8">
          공기업 가산점 맞춤 추천 서비스
        </p>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="비밀번호 입력"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '로그인 중...' : '이메일로 로그인'}
          </button>
        </form>

        <div className="relative my-6">
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
            className="w-full bg-yellow-400 text-gray-900 rounded-lg py-2.5 text-sm font-medium hover:bg-yellow-500 transition-colors"
          >
            카카오로 로그인
          </button>
          <button
            onClick={handleGoogleLogin}
            className="w-full border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
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
    </div>
  )
}
