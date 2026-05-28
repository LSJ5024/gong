import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { calculateRecommendations } from '@/lib/matching/engine'
import { decryptProfileSensitiveFields } from '@/lib/utils/sensitive-encrypt'

const CATEGORY_EMOJI: Record<string, string> = {
  '자격증': '📋', '어학': '🌐', '전공': '🎓',
  '보훈': '🏅', '장애': '♿', '지역인재': '📍', '기타': '➕',
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string | string[] }>
}) {
  const { p } = await searchParams
  const ids = Array.isArray(p) ? p : p ? [p] : []

  if (ids.length < 2) redirect('/mypage')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 프로필 조회 (본인 것만)
  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, profile_name, education_level, major_category, major_detail, school_name, school_region, gpa, is_veterans_enc, is_disabled_enc, is_local_talent, is_non_capital')
    .eq('user_id', user.id)
    .in('id', ids.slice(0, 3))

  if (!profilesRaw || profilesRaw.length < 2) notFound()

  // ids 순서 유지 + 복호화
  const profiles = ids
    .map((id) => profilesRaw.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => {
      const { is_veterans, is_disabled } = decryptProfileSensitiveFields({
        is_veterans_enc: p!.is_veterans_enc,
        is_disabled_enc: p!.is_disabled_enc,
      })
      return { ...p!, is_veterans, is_disabled }
    })

  // 각 프로필 추천 결과 병렬 계산
  const recommendationsList = await Promise.all(
    profiles.map((p) => calculateRecommendations(supabase, p.id))
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/mypage" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        ← 마이페이지로
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-6">프로필 비교</h1>

      {/* 프로필 기본 정보 비교 */}
      <div className={`grid gap-4 mb-6 grid-cols-${profiles.length === 3 ? '3' : '2'}`}
           style={{ gridTemplateColumns: `repeat(${profiles.length}, 1fr)` }}>
        {profiles.map((profile, i) => (
          <div key={profile.id} className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-green-500' : 'bg-purple-500'
              }`}>
                {i + 1}
              </span>
              <h2 className="font-bold text-gray-900 truncate">{profile.profile_name}</h2>
            </div>
            <dl className="space-y-1.5 text-sm">
              {profile.education_level && (
                <div className="flex justify-between">
                  <dt className="text-gray-400">학력</dt>
                  <dd className="text-gray-800 font-medium">{profile.education_level}</dd>
                </div>
              )}
              {profile.major_category && (
                <div className="flex justify-between">
                  <dt className="text-gray-400">전공</dt>
                  <dd className="text-gray-800 font-medium text-right">
                    {profile.major_category}
                    {profile.major_detail ? ` · ${profile.major_detail}` : ''}
                  </dd>
                </div>
              )}
              {profile.school_region && (
                <div className="flex justify-between">
                  <dt className="text-gray-400">학교 소재지</dt>
                  <dd className="text-gray-800 font-medium">{profile.school_region}</dd>
                </div>
              )}
              {profile.gpa && (
                <div className="flex justify-between">
                  <dt className="text-gray-400">학점</dt>
                  <dd className="text-gray-800 font-medium">{profile.gpa}</dd>
                </div>
              )}
              <div className="flex flex-wrap gap-1 pt-1">
                {profile.is_veterans && <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">보훈</span>}
                {profile.is_disabled && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">장애인</span>}
                {profile.is_local_talent && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">지역인재</span>}
                {profile.is_non_capital && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">비수도권</span>}
              </div>
            </dl>
          </div>
        ))}
      </div>

      {/* 추천 결과 비교 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">상위 추천 기업 비교</h2>
          <p className="text-xs text-gray-400 mt-0.5">각 프로필 기준 상위 10개 기업의 예상 가산점입니다.</p>
        </div>

        {/* 데스크탑 테이블 */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium w-1/3">기업</th>
                {profiles.map((p, i) => (
                  <th key={p.id} className="text-center px-4 py-3 font-medium">
                    <span className={`inline-flex items-center gap-1 ${
                      i === 0 ? 'text-blue-600' : i === 1 ? 'text-green-600' : 'text-purple-600'
                    }`}>
                      <span className={`w-4 h-4 rounded-full text-white text-xs flex items-center justify-center ${
                        i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-green-500' : 'bg-purple-500'
                      }`}>{i + 1}</span>
                      {p.profile_name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {buildCompareRows(recommendationsList, profiles.length).map((row, idx) => (
                <tr key={row.enterpriseId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                  <td className="px-5 py-3">
                    <Link
                      href={`/recommendations/${row.enterpriseId}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {row.name}
                    </Link>
                    <p className="text-xs text-gray-400">{row.location}</p>
                  </td>
                  {row.bonuses.map((bonus, i) => (
                    <td key={i} className="px-4 py-3 text-center">
                      {bonus !== null ? (
                        <div>
                          <span className={`font-bold ${
                            i === 0 ? 'text-blue-600' : i === 1 ? 'text-green-600' : 'text-purple-600'
                          }`}>
                            +{bonus}%
                          </span>
                          <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                            {row.matchedCategories[i]?.slice(0, 2).map((cat) => (
                              <span key={cat} className="text-xs">{CATEGORY_EMOJI[cat]}</span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 모바일: 카드형 */}
        <div className="sm:hidden divide-y divide-gray-100">
          {buildCompareRows(recommendationsList, profiles.length).map((row) => (
            <div key={row.enterpriseId} className="px-4 py-4">
              <Link href={`/recommendations/${row.enterpriseId}`} className="font-medium text-gray-900 hover:text-blue-600 block mb-2">
                {row.name}
                <span className="text-xs text-gray-400 ml-1">{row.location}</span>
              </Link>
              <div className="flex gap-3">
                {row.bonuses.map((bonus, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className={`w-4 h-4 rounded-full text-white text-xs flex items-center justify-center ${
                      i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-green-500' : 'bg-purple-500'
                    }`}>{i + 1}</span>
                    <span className={`text-sm font-bold ${bonus !== null
                      ? i === 0 ? 'text-blue-600' : i === 1 ? 'text-green-600' : 'text-purple-600'
                      : 'text-gray-300'}`}>
                      {bonus !== null ? `+${bonus}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 공통 추천 기업 하이라이트 */}
      {(() => {
        const commonIds = getCommonEnterpriseIds(recommendationsList)
        if (commonIds.length === 0) return null
        const commonNames = recommendationsList[0]
          .filter((r) => commonIds.includes(r.enterprise.id))
          .map((r) => r.enterprise.name)
        return (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-green-800 mb-2">✅ 모든 프로필에서 공통 추천된 기업</h3>
            <div className="flex flex-wrap gap-2">
              {commonNames.map((name) => (
                <span key={name} className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )
      })()}

      <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
        본 비교 결과는 참고용이며, 실제 가산점 기준은 각 기업 채용공고를 반드시 확인하세요.
      </p>
    </div>
  )
}

// ─── 헬퍼 함수 ───────────────────────────────────────────────

type RecommendationResult = Awaited<ReturnType<typeof calculateRecommendations>>[number]

function buildCompareRows(
  recommendationsList: RecommendationResult[][],
  profileCount: number
) {
  // 각 프로필의 추천 결과를 Map으로 변환
  const maps = recommendationsList.map((list) =>
    new Map(list.map((r) => [r.enterprise.id, r]))
  )

  // 모든 기업 ID 합집합 (각 프로필 상위 10개)
  const allIds = [...new Set(
    recommendationsList.flatMap((list) => list.slice(0, 10).map((r) => r.enterprise.id))
  )]

  // 첫 번째 프로필 기준 최대 가산점으로 정렬
  allIds.sort((a, b) => {
    const maxA = Math.max(...recommendationsList.map((list) => maps[recommendationsList.indexOf(list)]?.get(a)?.total_bonus_point ?? 0))
    const maxB = Math.max(...recommendationsList.map((list) => maps[recommendationsList.indexOf(list)]?.get(b)?.total_bonus_point ?? 0))
    return maxB - maxA
  })

  return allIds.slice(0, 15).map((id) => {
    const first = recommendationsList.flatMap((l) => l).find((r) => r.enterprise.id === id)
    return {
      enterpriseId: id,
      name: first?.enterprise.name ?? '',
      location: first?.enterprise.location ?? '',
      bonuses: maps.map((m) => m.get(id)?.total_bonus_point ?? null),
      matchedCategories: maps.map((m) =>
        (m.get(id)?.matched_rules ?? []).map((r) => r.category)
      ),
    }
  })
}

function getCommonEnterpriseIds(recommendationsList: RecommendationResult[][]): string[] {
  if (recommendationsList.length < 2) return []
  const sets = recommendationsList.map(
    (list) => new Set(list.slice(0, 10).map((r) => r.enterprise.id))
  )
  return [...sets[0]].filter((id) => sets.every((s) => s.has(id)))
}
