'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { RecommendationResult } from '@/types'

const ENTERPRISE_TYPE_COLOR: Record<string, string> = {
  '공기업': 'bg-blue-100 text-blue-700',
  '준정부기관': 'bg-green-100 text-green-700',
  '기타공공기관': 'bg-gray-100 text-gray-600',
}
const ENTERPRISE_TYPES = ['전체', '공기업', '준정부기관', '기타공공기관']
const SORT_OPTIONS = [
  { value: 'bonus_desc', label: '가산점 높은 순' },
  { value: 'match_desc', label: '매칭 항목 많은 순' },
]
const CATEGORY_LABEL: Record<string, string> = {
  '자격증': '📋', '어학': '🌐', '전공': '🎓',
  '보훈': '🏅', '장애': '♿', '지역인재': '📍', '기타': '➕',
}

function RecommendationsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [results, setResults] = useState<RecommendationResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // URL 파라미터에서 초기값 읽기
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get('type') ?? '전체')
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') ?? 'bonus_desc')
  const [locationFilter, setLocationFilter] = useState(() => searchParams.get('loc') ?? '')
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '')

  // 필터 변경 시 URL 동기화
  const syncUrl = useCallback((type: string, sort: string, loc: string, q: string) => {
    const params = new URLSearchParams()
    if (type !== '전체') params.set('type', type)
    if (sort !== 'bonus_desc') params.set('sort', sort)
    if (loc) params.set('loc', loc)
    if (q) params.set('q', q)
    const query = params.toString()
    router.replace(`/recommendations${query ? `?${query}` : ''}`, { scroll: false })
  }, [router])

  function handleTypeFilter(value: string) {
    setTypeFilter(value)
    syncUrl(value, sortBy, locationFilter, searchQuery)
  }
  function handleSort(value: string) {
    setSortBy(value)
    syncUrl(typeFilter, value, locationFilter, searchQuery)
  }
  function handleLocation(value: string) {
    setLocationFilter(value)
    syncUrl(typeFilter, sortBy, value, searchQuery)
  }
  function handleSearch(value: string) {
    setSearchQuery(value)
    syncUrl(typeFilter, sortBy, locationFilter, value)
  }

  // 공유 링크 복사
  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: execCommand
      const el = document.createElement('input')
      el.value = window.location.href
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/recommendations').then((r) => r.json()),
      fetch('/api/bookmarks').then((r) => r.json()),
    ]).then(([rec, bk]) => {
      if (rec.error) setError(rec.error)
      else setResults(rec.results ?? [])
      if (!bk.error) {
        setBookmarks(new Set((bk.bookmarks ?? []).map((b: { enterprise_id: string }) => b.enterprise_id)))
      }
    }).catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  // 고유 지역 목록
  const locations = useMemo(() => {
    const locs = [...new Set(results.map((r) => r.enterprise.location?.split(' ')[0]).filter(Boolean))]
    return ['전체', ...locs] as string[]
  }, [results])

  // 필터·정렬 적용
  const filtered = useMemo(() => {
    let list = [...results]
    if (typeFilter !== '전체') list = list.filter((r) => r.enterprise.type === typeFilter)
    if (locationFilter && locationFilter !== '전체') {
      list = list.filter((r) => r.enterprise.location?.startsWith(locationFilter))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter((r) =>
        r.enterprise.name.toLowerCase().includes(q) ||
        (r.enterprise.ministry ?? '').toLowerCase().includes(q)
      )
    }
    if (sortBy === 'match_desc') list.sort((a, b) => b.matched_rules.length - a.matched_rules.length)
    return list
  }, [results, typeFilter, locationFilter, searchQuery, sortBy])

  async function toggleBookmark(e: React.MouseEvent, enterpriseId: string) {
    e.preventDefault()
    e.stopPropagation()
    if (togglingId) return
    setTogglingId(enterpriseId)

    const wasBookmarked = bookmarks.has(enterpriseId)
    // 낙관적 업데이트
    setBookmarks((prev) => {
      const s = new Set(prev)
      wasBookmarked ? s.delete(enterpriseId) : s.add(enterpriseId)
      return s
    })

    try {
      const res = wasBookmarked
        ? await fetch(`/api/bookmarks?enterpriseId=${enterpriseId}`, { method: 'DELETE' })
        : await fetch('/api/bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enterprise_id: enterpriseId }),
          })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('[Bookmark] API 오류:', res.status, body)
        // 실패 시 낙관적 업데이트 되돌리기
        setBookmarks((prev) => {
          const s = new Set(prev)
          wasBookmarked ? s.add(enterpriseId) : s.delete(enterpriseId)
          return s
        })
      }
    } catch {
      // 네트워크 에러 시 되돌리기
      setBookmarks((prev) => {
        const s = new Set(prev)
        wasBookmarked ? s.add(enterpriseId) : s.delete(enterpriseId)
        return s
      })
    } finally {
      setTogglingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite" aria-label="로딩 중">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-gray-500">가산점 분석 중...</p>
        </div>
      </div>
    )
  }

  if (error === 'No profile found') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-2xl mb-3">📋</p>
          <p className="text-gray-700 font-medium mb-2">프로필을 먼저 등록해주세요</p>
          <p className="text-sm text-gray-500 mb-5">자격증·어학성적·전공을 입력하면 맞춤 추천이 시작됩니다.</p>
          <Link href="/profile/setup" className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
            프로필 등록하기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 페이지 헤더 */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">맞춤 공기업 추천</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            내 스펙과 가산점이 가장 잘 맞는 공기업 순입니다.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* 공유 링크 복사 버튼 */}
          <button
            onClick={copyShareLink}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              copied
                ? 'border-green-400 bg-green-50 text-green-700'
                : 'border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
            title="현재 필터 상태로 공유 링크 복사"
          >
            {copied ? '✓ 복사됨' : '🔗 공유'}
          </button>
          <Link href="/profile/setup" className="text-sm text-blue-600 hover:underline">
            프로필 수정
          </Link>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="기업명 또는 주무부처 검색..."
          className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="기업 검색"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            aria-label="검색어 지우기"
          >
            ✕
          </button>
        )}
      </div>

      {/* 필터·정렬 바 */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-5 flex flex-wrap gap-2 items-center">
        {/* 기업 유형 필터 */}
        <div className="flex gap-1">
          {ENTERPRISE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => handleTypeFilter(t)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                typeFilter === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-gray-200 hidden sm:block" />
        {/* 지역 필터 */}
        <select
          value={locationFilter || '전체'}
          onChange={(e) => handleLocation(e.target.value === '전체' ? '' : e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {locations.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <div className="h-4 w-px bg-gray-200 hidden sm:block" />
        {/* 정렬 */}
        <select
          value={sortBy}
          onChange={(e) => handleSort(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto" aria-live="polite" aria-atomic="true">
          {filtered.length}개 {searchQuery && <span className="text-blue-500">"{searchQuery}" 검색 중</span>}
        </span>
      </div>

      {/* 추천 목록 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-500 text-sm">필터 조건에 맞는 공기업이 없습니다.</p>
          <button
            onClick={() => { handleTypeFilter('전체'); handleLocation('') }}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            필터 초기화
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, idx) => {
            const isBookmarked = bookmarks.has(item.enterprise.id)
            return (
              <Link
                key={item.enterprise.id}
                href={`/recommendations/${item.enterprise.id}`}
                className="block bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-base font-bold text-gray-300 w-6 shrink-0 pt-0.5">{idx + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-gray-900">{item.enterprise.name}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ENTERPRISE_TYPE_COLOR[item.enterprise.type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {item.enterprise.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{item.enterprise.location}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.matched_rules.slice(0, 3).map((rule, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full max-w-[140px] truncate">
                            {CATEGORY_LABEL[rule.category]} {rule.condition_detail}
                          </span>
                        ))}
                        {item.matched_rules.length > 3 && (
                          <span className="text-xs text-gray-400">+{item.matched_rules.length - 3}개</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">+{item.total_bonus_point}%</p>
                      <p className="text-xs text-gray-400">총 가산점</p>
                    </div>
                    <button
                      onClick={(e) => toggleBookmark(e, item.enterprise.id)}
                      disabled={togglingId === item.enterprise.id}
                      aria-label={isBookmarked ? '북마크 삭제' : '북마크 추가'}
                      className={`text-xl w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:scale-110 active:scale-95 ${isBookmarked ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* 면책 고지 */}
      <p className="text-xs text-gray-400 text-center mt-8 leading-relaxed">
        본 추천 결과는 참고용이며, 실제 가산점 기준은 각 기업 채용공고를 반드시 확인하세요.
        <br />
        정보 오류로 인한 불이익에 대해 서비스는 책임지지 않습니다.
      </p>
    </div>
  )
}

export default function RecommendationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RecommendationsInner />
    </Suspense>
  )
}
