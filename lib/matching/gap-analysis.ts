import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type LanguageScore = Database['public']['Tables']['user_language_scores']['Row']
type BonusRule = Database['public']['Tables']['bonus_point_rules']['Row']

// 어학 등급 체계 정의
const OPIC_GRADES = ['NL', 'NM', 'NH', 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL']
const TOEIC_SPEAKING_GRADES = ['Lv.6', 'Lv.7', 'Lv.8']

// TOEIC 주요 가산점 구간
const TOEIC_THRESHOLDS = [600, 650, 700, 750, 800, 850, 900, 950]

export interface GapItem {
  enterprise_id: string
  enterprise_name: string
  suggestion: string          // "OPIc IH → AL 취득 시"
  current_bonus: number       // 현재 해당 항목 가산점
  next_bonus: number          // 한 단계 올렸을 때 가산점
  gain: number                // 상승폭
  source_url: string | null
}

export async function calculateGapAnalysis(
  supabase: SupabaseClient<Database>,
  profileId: string
): Promise<GapItem[]> {
  const [{ data: langScores }, { data: enterprises }, { data: allRules }] = await Promise.all([
    supabase.from('user_language_scores').select('*').eq('profile_id', profileId),
    supabase.from('public_enterprises').select('id, name'),
    supabase.from('bonus_point_rules').select('*').eq('category', '어학'),
  ])

  if (!langScores || !enterprises || !allRules) return []

  const gaps: GapItem[] = []

  for (const score of langScores) {
    // 만료된 성적 스킵
    if (score.expiry_date && new Date(score.expiry_date) < new Date()) continue

    if (score.exam_type === 'OPIC' && score.grade) {
      const currentIdx = OPIC_GRADES.indexOf(score.grade)
      if (currentIdx === -1 || currentIdx >= OPIC_GRADES.length - 1) continue
      const nextGrade = OPIC_GRADES[currentIdx + 1]

      for (const enterprise of enterprises) {
        const rules = allRules.filter((r: BonusRule) => r.enterprise_id === enterprise.id)
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
          return condIdx !== -1 && nextIdx >= condIdx && (currentIdx < condIdx)
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
          })
        }
      }
    }

    if (score.exam_type === 'TOEIC' && score.score) {
      const currentScore = score.score
      const nextThreshold = TOEIC_THRESHOLDS.find((t) => t > currentScore)
      if (!nextThreshold) continue

      for (const enterprise of enterprises) {
        const rules = allRules.filter((r: BonusRule) => r.enterprise_id === enterprise.id)
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
          })
        }
      }
    }

    if (score.exam_type === 'TOEIC_SPEAKING' && score.grade) {
      const currentIdx = TOEIC_SPEAKING_GRADES.indexOf(score.grade)
      if (currentIdx === -1 || currentIdx >= TOEIC_SPEAKING_GRADES.length - 1) continue
      const nextGrade = TOEIC_SPEAKING_GRADES[currentIdx + 1]

      for (const enterprise of enterprises) {
        const rules = allRules.filter((r: BonusRule) => r.enterprise_id === enterprise.id)
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
          })
        }
      }
    }
  }

  // 이득 큰 순으로 정렬, 상위 15개
  return gaps
    .filter((g) => g.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 15)
}
