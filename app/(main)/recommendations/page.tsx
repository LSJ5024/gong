'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
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

export default function RecommendationsPage() {
  const [results, setResults] = useState<RecommendationResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // 필터·정렬 상태
  const [typeFilter, setTypeFilter] = useState('전체')
  const [sortBy, setSortBy] = useState('bonus_desc')
  const [locationFilter, setLocationFilter] = useState('')

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
    if (sortBy === 'match_desc') list.sort((a, b) => b.matched_rules.length - a.matched_rules.length)
    // bonus_desc는 API 기본값 유지
    return list
  }, [results, typeFilter, locationFilter, sortBy])

  async function toggleBookmark(e: React.MouseEvent, enterpriseId: string) {
    e.preventDefault()
    if (togglingId) return
    setTogglingId(enterpriseId)
    if (bookmarks.has(enterpriseId)) {
      await fetch(`/api/bookmarks?enterpriseId=${enterpriseId}`, { method: 'DELETE' })
      setBookmarks((prev) => { const s = new Set(prev); s.delete(enterpriseId); return s })
    } else {
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enterprise_id: enterpriseId }),
      })
      setBookmarks((prev) => new Set([...prev, enterpriseId]))
    }
    setTogglingId(null)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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
        <Link href="/profile/setup" className="text-sm text-blue-600 hover:underline shrink-0">
          프로필 수정
        </Link>
      </div>

      {/* 필터·정렬 바 */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-5 flex flex-wrap gap-2 items-center">
        {/* 기업 유형 필터 */}
        <div className="flex gap-1">
          {ENTERPRISE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
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
          onChange={(e) => setLocationFilter(e.target.value === '전체' ? '' : e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {locations.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <div className="h-4 w-px bg-gray-200 hidden sm:block" />
        {/* 정렬 */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length}개</span>
      </div>

      {/* 추천 목록 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-500 text-sm">필터 조건에 맞는 공기업이 없습니다.</p>
          <button onClick={() => { setTypeFilter('전체'); setLocationFilter('') }} className="mt-3 text-sm text-blue-600 hover:underline">
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
                        {item.matched_rules.slice(0, 4).map((rule, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {CATEGORY_LABEL[rule.category]} {rule.condition_detail}
                          </span>
                        ))}
                        {item.matched_rules.length > 4 && (
                          <span className="text-xs text-gray-400">+{item.matched_rules.length - 4}개</span>
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
                      className={`text-lg transition-transform hover:scale-110 ${isBookmarked ? 'text-yellow-400' : 'text-gray-300'}`}
                      title={isBookmarked ? '북마크 삭제' : '북마크 추가'}
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
