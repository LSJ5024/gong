'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HeaderClient() {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 경로 변경 시 메뉴 닫기
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/recommendations', label: '추천 결과' },
    { href: '/mypage', label: '마이페이지' },
  ]

  return (
    <>
      {/* 데스크탑 nav (sm 이상) */}
      <nav className="hidden sm:flex items-center gap-1">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              pathname === href
                ? 'text-blue-600 bg-blue-50 font-medium'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          로그아웃
        </button>
      </nav>

      {/* 모바일 햄버거 (sm 미만) */}
      <div className="sm:hidden relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="메뉴 열기"
          aria-expanded={menuOpen}
          className="flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span
            className={`block w-5 h-0.5 bg-gray-600 transition-transform origin-center ${
              menuOpen ? 'rotate-45 translate-y-2' : ''
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-gray-600 transition-opacity ${
              menuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-gray-600 transition-transform origin-center ${
              menuOpen ? '-rotate-45 -translate-y-2' : ''
            }`}
          />
        </button>

        {/* 드롭다운 메뉴 */}
        {menuOpen && (
          <div className="absolute top-full right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block px-4 py-2.5 text-sm transition-colors ${
                  pathname === href
                    ? 'text-blue-600 bg-blue-50 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            ))}
            <hr className="my-1 border-gray-100" />
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </>
  )
}
