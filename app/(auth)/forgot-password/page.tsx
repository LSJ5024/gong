'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    })

    if (error) {
      setError('이메일 전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">비밀번호 재설정</h1>
        <p className="text-sm text-center text-gray-500 mb-8">
          가입한 이메일로 재설정 링크를 보내드립니다.
        </p>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="text-5xl mb-2">📬</div>
            <p className="text-gray-800 font-medium">이메일을 확인해주세요</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-700">{email}</span>으로<br />
              비밀번호 재설정 링크를 발송했습니다.<br />
              스팸함도 확인해보세요.
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 text-sm text-blue-600 hover:underline"
            >
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                가입한 이메일
              </label>
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

            <div aria-live="polite" aria-atomic="true" className="min-h-[1.25rem]">
              {error && (
                <p role="alert" className="text-red-600 text-sm">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[44px]"
            >
              {loading ? '전송 중...' : '재설정 링크 보내기'}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              <Link href="/login" className="text-blue-600 hover:underline">
                로그인으로 돌아가기
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
