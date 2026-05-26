import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type LanguageScore = Database['public']['Tables']['user_language_scores']['Row']
type BonusRule = Database['public']['Tables']['bonus_point_rules']['Row']

// ============================================================
// 어학 등급 체계
// ============================================================
const OPIC_GRADES = ['NL', 'NM', 'NH', 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL']
const TOEIC_SPEAKING_GRADES = ['Lv.6', 'Lv.7', 'Lv.8']
const TOEIC_THRESHOLDS = [600, 650, 700, 750, 800, 850, 900, 950]

// ============================================================
// 자격증 등급 체계 (기능사 < 산업기사 < 기사 < 기술사)
// 순서 중요: 산업기사를 기사보다 먼저 검사해야 부분 매칭 오류 방지
// ============================================================
const CERT_GRADE_SUFFIXES = ['기술사', '산업기사', '기능사', '기사'] as const
type CertGrade = (typeof CERT_GRADE_SUFFIXES)[number]

const CERT_GRADE_ORDER: CertGrade[] = ['기능사', '산업기사', '기사', '기술사']

interface ParsedCert {
  base: string    // "전기", "토목", "정보처리" 등
  grade: CertGrade
}

/** "전기산업기사" → { base: "전기", grade: "산업기사" } */
function parseCertName(name: string): ParsedCert | null {
  for (const suffix of CERT_GRADE_SUFFIXES) {
    if (name.endsWith(suffix)) {
      return { base: name.slice(0, -suffix.length), grade: suffix }
    }
  }
  return null
}

// ============================================================

export interface GapItem {
  enterprise_id: string
  enterprise_name: string
  suggestion: string          // "OPIc IH → AL 취득 시"
  current_bonus: number       // 현재 해당 항목 가산점
  next_bonus: number          // 한 단계 올렸을 때 가산점
  gain: number                // 상승폭
  source_url: string | null
  type: 'language' | 'certificate'
}

export async function calculateGapAnalysis(
  supabase: SupabaseClient<Database>,
  profileId: string
): Promise<GapItem[]> {
  // 어학성적, 자격증, 공기업, 가산점 규칙 병렬 조회
  const [
    { data: langScores },
    { data: userCertsRaw },
    { data: enterprises },
    { data: langRules },
    { data: certRules },
  ] = await Promise.all([
    supabase.from('user_language_scores').select('*').eq('profile_id', profileId),
    supabase
      .from('user_certificates')
      .select('*, certificates(name)')
      .eq('profile_id', profileId),
    supabase.from('public_enterprises').select('id, name'),
    supabase.from('bonus_point_rules').select('*').eq('category', '어학'),
    supabase.from('bonus_point_rules').select('*').eq('category', '자격증'),
  ])

  if (!enterprises) return []

  const gaps: GapItem[] = []

  // ============================================================
  // 1. 어학 갭 분석
  // ============================================================
  if (langScores && langRules) {
    for (const score of langScores) {
      if (score.expiry_date && new Date(score.expiry_date) < new Date()) continue

      // --- OPIc ---
      if (score.exam_type === 'OPIC' && score.grade) {
        const currentIdx = OPIC_GRADES.indexOf(score.grade)
        if (currentIdx === -1 || currentIdx >= OPIC_GRADES.length - 1) continue
        const nextGrade = OPIC_GRADES[currentIdx + 1]

        for (const enterprise of enterprises) {
          const rules = langRules.filter((r: BonusRule) => r.enterprise_id === enterprise.id)
          const currentRule = rules.find((r: BonusRule) => {
            const m = r.condition_detail.toLowerCase().match(/opic\s*(\w+)\s*이상/)
            if (!m) return false
            const condIdx = OPIC_GRADES.findIndex((g) => g.toLowerCase() === m[1].toLowerCase())
            return condIdx !== -1 && currentIdx >= condIdx
          })
          const nextRule = rules.find((r: BonusRule) => {
            const m = r.condition_detail.toLowerCase().match(/opic\s*(\w+)\s*이상/)
            if (!m) return false
            const condIdx = OPIC_GRADES.findIndex((g) => g.toLowerCase() === m[1].toLowerCase())
            const nextIdx = OPIC_GRADES.indexOf(nextGrade)
            return condIdx !== -1 && nextIdx >= condIdx && currentIdx < condIdx
          })
          if (nextRule) {
            gaps.push({
              enterprise_id: enterprise.id,
              enterprise_name: enterprise.name,
              suggestion: `OPIc ${score.grade} → ${nextGrade} 취득 시`,
              current_bonus: currentRule?.bonus_point_percentage ?? 0,
              next_bonus: nextRule.bonus_point_percentage,
              gain: nextRule.bonus_point_percentage - (currentRule?.bonus_point_percentage ?? 0),
              source_url: nextRule.source_url,
              type: 'language',
            })
          }
        }
      }

      // --- TOEIC ---
      if (score.exam_type === 'TOEIC' && score.score) {
        const currentScore = score.score
        const nextThreshold = TOEIC_THRESHOLDS.find((t) => t > currentScore)
        if (!nextThreshold) continue

        for (const enterprise of enterprises) {
          const rules = langRules.filter((r: BonusRule) => r.enterprise_id === enterprise.id)
          const currentRule = rules
            .filter((r: BonusRule) => {
              const m = r.condition_detail.match(/TOEIC\s*(\d+)점\s*이상/)
              return m ? currentScore >= parseInt(m[1]) : false
            })
            .sort((a: BonusRule, b: BonusRule) => b.bonus_point_percentage - a.bonus_point_percentage)[0]

          const nextRule = rules.find((r: BonusRule) => {
            const m = r.condition_detail.match(/TOEIC\s*(\d+)점\s*이상/)
            if (!m) return false
            const threshold = parseInt(m[1])
            return threshold <= nextThreshold && threshold > currentScore
          })
          if (nextRule) {
            gaps.push({
              enterprise_id: enterprise.id,
              enterprise_name: enterprise.name,
              suggestion: `TOEIC ${currentScore}점 → ${nextThreshold}점 달성 시`,
              current_bonus: currentRule?.bonus_point_percentage ?? 0,
              next_bonus: nextRule.bonus_point_percentage,
              gain: nextRule.bonus_point_percentage - (currentRule?.bonus_point_percentage ?? 0),
              source_url: nextRule.source_url,
              type: 'language',
            })
          }
        }
      }

      // --- TOEIC Speaking ---
      if (score.exam_type === 'TOEIC_SPEAKING' && score.grade) {
        const currentIdx = TOEIC_SPEAKING_GRADES.indexOf(score.grade)
        if (currentIdx === -1 || currentIdx >= TOEIC_SPEAKING_GRADES.length - 1) continue
        const nextGrade = TOEIC_SPEAKING_GRADES[currentIdx + 1]

        for (const enterprise of enterprises) {
          const rules = langRules.filter((r: BonusRule) => r.enterprise_id === enterprise.id)
          const nextRule = rules.find((r: BonusRule) => {
            const m = r.condition_detail.match(/TOEIC Speaking\s*Lv\.?(\d+)\s*이상/)
            if (!m) return false
            const condLv = parseInt(m[1])
            const nextLv = parseInt(nextGrade.replace(/[^0-9]/g, ''))
            const curLv = parseInt(score.grade!.replace(/[^0-9]/g, ''))
            return nextLv >= condLv && curLv < condLv
          })
          if (nextRule) {
            gaps.push({
              enterprise_id: enterprise.id,
              enterprise_name: enterprise.name,
              suggestion: `TOEIC Speaking ${score.grade} → ${nextGrade} 취득 시`,
              current_bonus: 0,
              next_bonus: nextRule.bonus_point_percentage,
              gain: nextRule.bonus_point_percentage,
              source_url: nextRule.source_url,
              type: 'language',
            })
          }
        }
      }
    }
  }

  // ============================================================
  // 2. 자격증 갭 분석
  // ============================================================
  if (certRules) {
    // 사용자 보유 자격증을 파싱된 형태로 준비
    const userCerts: ParsedCert[] = []
    for (const uc of userCertsRaw ?? []) {
      const raw = uc as unknown as { certificates: { name: string } | null }
      const name = raw.certificates?.name
      if (!name) continue
      const parsed = parseCertName(name)
      if (parsed) userCerts.push(parsed)
    }

    for (const enterprise of enterprises) {
      const rules = certRules.filter((r: BonusRule) => r.enterprise_id === enterprise.id)

      // 기업의 자격증 규칙을 파싱
      for (const rule of rules) {
        const required = parseCertName(rule.condition_detail.trim())
        if (!required) continue  // 파싱 불가(공인중개사 등)한 자격증 스킵

        const requiredGradeIdx = CERT_GRADE_ORDER.indexOf(required.grade)

        // 사용자가 해당 자격증의 하위 등급을 보유 중인지 확인
        const lowerCert = userCerts.find(
          (uc) =>
            uc.base === required.base &&
            CERT_GRADE_ORDER.indexOf(uc.grade) < requiredGradeIdx
        )
        if (!lowerCert) continue

        // 이미 해당 등급 이상을 보유 중이면 스킵
        const alreadyHas = userCerts.some(
          (uc) =>
            uc.base === required.base &&
            CERT_GRADE_ORDER.indexOf(uc.grade) >= requiredGradeIdx
        )
        if (alreadyHas) continue

        // 현재 보유 자격증 중 가장 높은 등급
        const currentCert = userCerts
          .filter((uc) => uc.base === required.base)
          .sort(
            (a, b) => CERT_GRADE_ORDER.indexOf(b.grade) - CERT_GRADE_ORDER.indexOf(a.grade)
          )[0]

        // 한 단계 위의 등급이 required.grade와 같을 때만 표시
        const currentGradeIdx = CERT_GRADE_ORDER.indexOf(currentCert.grade)
        if (currentGradeIdx + 1 !== requiredGradeIdx) continue

        // 현재 자격증에 해당하는 가산점 규칙 (현재 등급)
        const currentRuleForBase = rules.find((r: BonusRule) => {
          const p = parseCertName(r.condition_detail.trim())
          return (
            p &&
            p.base === required.base &&
            p.grade === currentCert.grade
          )
        })

        gaps.push({
          enterprise_id: enterprise.id,
          enterprise_name: enterprise.name,
          suggestion: `${currentCert.base}${currentCert.grade} → ${required.base}${required.grade} 취득 시`,
          current_bonus: currentRuleForBase?.bonus_point_percentage ?? 0,
          next_bonus: rule.bonus_point_percentage,
          gain: rule.bonus_point_percentage - (currentRuleForBase?.bonus_point_percentage ?? 0),
          source_url: rule.source_url,
          type: 'certificate',
        })
      }
    }
  }

  // 이득 큰 순으로 정렬, 상위 20개 (어학 + 자격증 합산)
  return gaps
    .filter((g) => g.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 20)
}
