'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-4" aria-hidden="true">✉️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">이메일을 확인해주세요</h2>
          <p className="text-sm text-gray-500">
            <strong>{email}</strong>으로 인증 링크를 보냈습니다.
            <br />
            링크를 클릭하면 가입이 완료됩니다.
          </p>
          <Link
            href="/login"
            className="inline-block mt-6 text-blue-600 text-sm hover:underline min-h-[44px] flex items-center justify-center"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">회원가입</h1>
        <p className="text-sm text-center text-gray-500 mb-8">
          공기업 가산점 맞춤 추천 서비스
        </p>

        <form onSubmit={handleSignup} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="홍길동"
              autoComplete="name"
              required
              aria-required="true"
            />
          </div>
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
            <label htmlFor="pw" className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="6자 이상 입력"
              minLength={6}
              autoComplete="new-password"
              required
              aria-required="true"
              aria-describedby="pw-hint"
            />
            <p id="pw-hint" className="text-xs text-gray-400 mt-1">6자 이상 입력해주세요.</p>
          </div>

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
            {loading ? '가입 중...' : '이메일로 가입'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            로그인
          </Link>
        </p>
      </div>
    </main>
  )
}
