'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase는 이메일 링크 클릭 시 #access_token=...&type=recovery 형태로 리디렉션함
  // onAuthStateChange로 SIGNED_IN / PASSWORD_RECOVERY 이벤트를 감지해 세션 확인
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })
    // 이미 세션이 있는 경우 (페이지 새로고침 등)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('비밀번호 변경 중 오류가 발생했습니다. 링크가 만료됐을 수 있습니다.')
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2500)
    }
    setLoading(false)
  }

  if (!sessionReady) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">인증 정보를 확인 중입니다…</p>
          <p className="text-xs text-gray-400">
            이메일의 링크를 클릭한 후 이 페이지를 확인하세요.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">새 비밀번호 설정</h1>
        <p className="text-sm text-center text-gray-500 mb-8">
          새로운 비밀번호를 입력해주세요.
        </p>

        {success ? (
          <div className="text-center space-y-3">
            <div className="text-5xl">✅</div>
            <p className="font-medium text-gray-800">비밀번호가 변경되었습니다!</p>
            <p className="text-sm text-gray-500">잠시 후 로그인 페이지로 이동합니다…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                새 비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="8자 이상"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 확인
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="비밀번호 재입력"
                autoComplete="new-password"
                required
              />
            </div>

            {/* 비밀번호 일치 여부 실시간 표시 */}
            {confirm.length > 0 && (
              <p className={`text-xs ${password === confirm ? 'text-green-600' : 'text-red-500'}`}>
                {password === confirm ? '✓ 비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.'}
              </p>
            )}

            <div aria-live="polite" aria-atomic="true" className="min-h-[1.25rem]">
              {error && (
                <p role="alert" className="text-red-600 text-sm">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[44px]"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
