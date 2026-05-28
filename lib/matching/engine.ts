import type { RecommendationResult, MatchedRule, BonusCategory, PublicEnterprise } from '@/types'
import type { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptProfileSensitiveFields } from '@/lib/utils/sensitive-encrypt'

type Profile = Database['public']['Tables']['profiles']['Row']
type LanguageScore = Database['public']['Tables']['user_language_scores']['Row']
type BonusRule = Database['public']['Tables']['bonus_point_rules']['Row']
type Enterprise = Database['public']['Tables']['public_enterprises']['Row']

// 어학성적 조건 텍스트와 매칭하는 함수
function matchesLanguageCondition(condition: string, scores: LanguageScore[]): boolean {
  const c = condition.toLowerCase()

  for (const s of scores) {
    if (s.expiry_date && new Date(s.expiry_date) < new Date()) continue

    if (s.exam_type === 'TOEIC' && s.score) {
      const match = c.match(/toeic\s*(\d+)점\s*이상/)
      if (match && s.score >= parseInt(match[1])) return true
    }
    if (s.exam_type === 'OPIC' && s.grade) {
      const gradeOrder = ['NL','NM','NH','IL','IM1','IM2','IM3','IH','AL']
      const condMatch = c.match(/opic\s*(\w+)\s*이상/)
      if (condMatch) {
        const condIdx = gradeOrder.findIndex((g) => g.toLowerCase() === condMatch[1].toLowerCase())
        const userIdx = gradeOrder.findIndex((g) => g.toLowerCase() === s.grade!.toLowerCase())
        if (condIdx !== -1 && userIdx >= condIdx) return true
      }
    }
    if (s.exam_type === 'TOEIC_SPEAKING' && s.grade) {
      const condMatch = c.match(/toeic speaking\s*lv\.?(\d+)\s*이상/)
      if (condMatch) {
        const condLv = parseInt(condMatch[1])
        const userLv = parseInt(s.grade.replace(/[^0-9]/g, ''))
        if (!isNaN(userLv) && userLv >= condLv) return true
      }
    }
  }
  return false
}

// 전공 조건 매칭
function matchesMajorCondition(condition: string, profile: Profile): boolean {
  if (!profile.major_category && !profile.major_detail) return false
  const c = condition.toLowerCase()
  const detail = (profile.major_detail ?? '').toLowerCase()
  const category = (profile.major_category ?? '').toLowerCase()

  return c.includes(detail) || c.includes(category) ||
    (c.includes('이공계') && category === '이공계') ||
    (c.includes('상경계') && category === '상경계') ||
    (c.includes('전기전자') && detail.includes('전기')) ||
    (c.includes('건축') && detail.includes('건축')) ||
    (c.includes('토목') && detail.includes('토목')) ||
    (c.includes('컴퓨터') && detail.includes('컴퓨터')) ||
    (c.includes('사회복지') && detail.includes('사회복지'))
}

// 어학 조건에서 시험 종류 추출 (중복 제거용)
function detectLangExamType(condition: string): string {
  const c = condition.toLowerCase()
  if (c.includes('toeic speaking') || c.includes('toeic_speaking')) return 'TOEIC_SPEAKING'
  if (c.includes('toeic')) return 'TOEIC'
  if (c.includes('opic')) return 'OPIC'
  if (c.includes('toefl')) return 'TOEFL'
  if (c.includes('ielts')) return 'IELTS'
  if (c.includes('jpt')) return 'JPT'
  if (c.includes('jlpt')) return 'JLPT'
  if (c.includes('hsk')) return 'HSK'
  return condition // 알 수 없으면 조건 전체를 키로 사용
}

// 자격증 조건 매칭 — 정확한 이름 일치만 허용 (부분 문자열 오매칭 방지)
function matchesCertCondition(condition: string, certNames: string[]): boolean {
  const c = condition.trim().toLowerCase()
  return certNames.some((n) => {
    const name = n.trim().toLowerCase()
    // 조건이 자격증 이름과 정확히 일치하거나, 조건이 자격증 이름으로 시작하는 경우만 허용
    // (예: "전기기사 보유" → "전기기사" 매칭 O, "전기산업기사" 매칭 X)
    return c === name || c.startsWith(name + ' ') || c.startsWith(name + '(')
  })
}

export async function calculateRecommendations(
  supabase: SupabaseClient<Database>,
  profileId: string
): Promise<RecommendationResult[]> {
  // 프로필 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (!profile) return []

  // 어학성적, 자격증 조회 (병렬)
  const [{ data: langScores }, { data: userCerts }] = await Promise.all([
    supabase.from('user_language_scores').select('*').eq('profile_id', profileId),
    supabase
      .from('user_certificates')
      .select('*, certificates(name)')
      .eq('profile_id', profileId),
  ])

  const certNames = (userCerts ?? []).map((c) => {
    const cert = c as unknown as { certificates: { name: string } | null }
    return cert.certificates?.name ?? ''
  }).filter(Boolean)

  // 모든 기업·가산점 규칙 조회
  const { data: enterprises } = await supabase
    .from('public_enterprises')
    .select('id, name, type, ministry, location, website_url, last_updated')

  const { data: rules } = await supabase
    .from('bonus_point_rules')
    .select('*')

  if (!enterprises || !rules) return []

  // 기업별 매칭 계산
  const results: RecommendationResult[] = []

  for (const enterprise of enterprises) {
    const enterpriseRules = rules.filter((r: BonusRule) => r.enterprise_id === enterprise.id)
    const matchedRules: MatchedRule[] = []

    for (const rule of enterpriseRules) {
      const cat = rule.category as BonusCategory
      let matched = false

      if (cat === '자격증') {
        matched = matchesCertCondition(rule.condition_detail, certNames)
      } else if (cat === '어학') {
        matched = matchesLanguageCondition(rule.condition_detail, langScores ?? [])
      } else if (cat === '전공') {
        matched = matchesMajorCondition(rule.condition_detail, profile)
      } else if (cat === '보훈') {
        const { is_veterans } = decryptProfileSensitiveFields({
          is_veterans_enc: profile.is_veterans_enc,
          is_disabled_enc: profile.is_disabled_enc,
        })
        matched = is_veterans
      } else if (cat === '장애') {
        const { is_disabled } = decryptProfileSensitiveFields({
          is_veterans_enc: profile.is_veterans_enc,
          is_disabled_enc: profile.is_disabled_enc,
        })
        matched = is_disabled
      } else if (cat === '지역인재') {
        matched = profile.is_local_talent
      } else if (cat === '기타') {
        matched = profile.is_non_capital
      }

      if (matched) {
        matchedRules.push({
          category: cat,
          condition_detail: rule.condition_detail,
          bonus_point_percentage: rule.bonus_point_percentage,
          source_url: rule.source_url,
          updated_at: rule.updated_at,
        })
      }
    }

    if (matchedRules.length > 0) {
      // ── 중복 제거 ──────────────────────────────────────────
      // 어학: 같은 시험 종류에서 가장 높은 등급 규칙 하나만 유지
      const langBest = new Map<string, MatchedRule>()
      const deduplicated: MatchedRule[] = []

      for (const rule of matchedRules) {
        if (rule.category === '어학') {
          const examType = detectLangExamType(rule.condition_detail)
          const existing = langBest.get(examType)
          if (!existing || rule.bonus_point_percentage > existing.bonus_point_percentage) {
            langBest.set(examType, rule)
          }
        } else {
          deduplicated.push(rule)
        }
      }
      deduplicated.push(...langBest.values())

      const total = deduplicated.reduce((sum, r) => sum + r.bonus_point_percentage, 0)
      results.push({
        enterprise: enterprise as unknown as PublicEnterprise,
        total_bonus_point: Math.round(total * 100) / 100,
        matched_rules: deduplicated,
      })
    }
  }

  // 총 가산점 내림차순 정렬, 상위 20개 반환
  return results
    .sort((a, b) => b.total_bonus_point - a.total_bonus_point)
    .slice(0, 20)
}
