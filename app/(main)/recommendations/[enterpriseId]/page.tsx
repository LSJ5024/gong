import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { calculateGapAnalysis } from '@/lib/matching/gap-analysis'
import BookmarkButton from './BookmarkButton'
import ReportButton from '@/components/recommendations/ReportButton'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gong.vercel.app'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ enterpriseId: string }>
}): Promise<Metadata> {
  const { enterpriseId } = await params
  const supabase = await createClient()
  const { data: enterprise } = await supabase
    .from('public_enterprises')
    .select('name, type, ministry, location')
    .eq('id', enterpriseId)
    .single()

  if (!enterprise) return { title: '기업 상세' }

  const title = `${enterprise.name} 가산점 상세`
  const description = `${enterprise.name}(${enterprise.type}) 가산점 기준 및 항목별 조건을 확인하세요. ${enterprise.ministry ?? ''} 소관 공공기관.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/recommendations/${enterpriseId}`,
      type: 'article',
    },
    alternates: { canonical: `${BASE_URL}/recommendations/${enterpriseId}` },
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  '자격증': '📋 자격증',
  '어학': '🌐 어학',
  '전공': '🎓 전공',
  '보훈': '🏅 보훈',
  '장애': '♿ 장애',
  '지역인재': '📍 지역인재',
  '기타': '➕ 기타',
}

export default async function EnterpriseDetailPage({
  params,
}: {
  params: Promise<{ enterpriseId: string }>
}) {
  const { enterpriseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // 기업 정보 + 가산점 규칙 + 북마크 상태 + 갭 분석 (병렬)
  const [
    { data: enterprise },
    { data: rules },
    { data: bookmarkData },
    profileResult,
  ] = await Promise.all([
    supabase.from('public_enterprises').select('*').eq('id', enterpriseId).single(),
    supabase.from('bonus_point_rules').select('*').eq('enterprise_id', enterpriseId).order('bonus_point_percentage', { ascending: false }),
    user
      ? supabase.from('bookmarks').select('id').eq('user_id', user.id).eq('enterprise_id', enterpriseId).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('profiles').select('id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1)
      : Promise.resolve({ data: [] }),
  ])

  if (!enterprise) notFound()

  const isBookmarked = !!bookmarkData
  const profiles = profileResult.data as { id: string }[] | null
  const profileId = profiles?.[0]?.id

  // 갭 분석 (프로필 있을 때만)
  const gapItems = profileId
    ? (await calculateGapAnalysis(supabase, profileId)).filter((g) => g.enterprise_id === enterpriseId)
    : []

  const grouped = (rules ?? []).reduce<Record<string, typeof rules>>((acc, rule) => {
    if (!rule) return acc
    if (!acc[rule.category]) acc[rule.category] = []
    acc[rule.category]!.push(rule)
    return acc
  }, {})

  const lastUpdated = rules?.[0]?.updated_at
    ? new Date(rules[0].updated_at).toLocaleDateString('ko-KR')
    : '-'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/recommendations" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        ← 추천 목록으로
      </Link>

      {/* 기업 헤더 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{enterprise.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {enterprise.type} · {enterprise.ministry} · {enterprise.location}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {user && <BookmarkButton enterpriseId={enterpriseId} initialBookmarked={isBookmarked} />}
            {enterprise.website_url && (
              <a
                href={enterprise.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                홈페이지
              </a>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">마지막 업데이트: {lastUpdated}</p>
      </div>

      {/* 가산점 기준 */}
      {Object.entries(grouped).map(([category, categoryRules]) => (
        <section key={category} className="bg-white rounded-2xl shadow-sm p-5 mb-3" aria-labelledby={`cat-${category}`}>
          <h2 id={`cat-${category}`} className="text-sm font-bold text-gray-700 mb-3">
            {CATEGORY_LABEL[category] ?? category}
          </h2>
          <ul className="space-y-2" role="list">
            {categoryRules?.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-800">{rule.condition_detail}</p>
                  {rule.source_url && (
                    <a
                      href={rule.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                      aria-label={`${rule.condition_detail} 출처 보기 (새 창)`}
                    >
                      출처 보기
                    </a>
                  )}
                </div>
                <span className="text-blue-600 font-bold text-sm whitespace-nowrap ml-4" aria-label={`가산점 ${rule.bonus_point_percentage}퍼센트`}>
                  +{rule.bonus_point_percentage}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {(!rules || rules.length === 0) && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-gray-400 mb-4">
          등록된 가산점 기준이 없습니다.
        </div>
      )}

      {/* 갭 분석 섹션 */}
      {gapItems.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 p-5 mb-4">
          <h2 className="text-sm font-bold text-blue-800 mb-3">📈 갭 분석 — 한 단계 올리면?</h2>
          <div className="space-y-2">
            {gapItems.map((g, i) => (
              <div key={i} className="flex items-start justify-between py-2 border-b border-blue-50 last:border-0">
                <div>
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded mr-1.5 bg-blue-100 text-blue-700">
                    {g.type === 'certificate' ? '자격증' : '어학'}
                  </span>
                  <span className="text-sm text-gray-800">{g.suggestion}</span>
                  {g.current_bonus > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      현재 +{g.current_bonus}% → 달성 후 +{g.next_bonus}%
                    </p>
                  )}
                </div>
                <span className="text-green-600 font-bold text-sm whitespace-nowrap ml-4 shrink-0">
                  +{g.gain}%↑
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 신고 및 면책 고지 */}
      <div className="flex flex-col items-center gap-2 mt-4">
        {user && (
          <ReportButton
            enterpriseId={enterpriseId}
            enterpriseName={enterprise.name}
            rules={(rules ?? []).map((r) => ({
              id: r.id,
              category: r.category,
              condition_detail: r.condition_detail,
            }))}
          />
        )}
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          본 정보는 참고용이며, 실제 적용 기준은 해당 기업의 채용공고를 반드시 확인하세요.
        </p>
      </div>
    </div>
  )
}
