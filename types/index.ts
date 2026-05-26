// ============================================================
// 공통 도메인 타입
// ============================================================

export type EducationLevel = '고졸' | '전문학사' | '학사' | '석사' | '박사'
export type MajorCategory = '이공계' | '상경계' | '인문사회계' | '사범계' | '예체능' | '기타'
export type EnterpriseType = '공기업' | '준정부기관' | '기타공공기관'
export type BonusCategory = '자격증' | '어학' | '전공' | '보훈' | '장애' | '지역인재' | '기타'
export type ExamType =
  | 'TOEIC'
  | 'TOEIC_SPEAKING'
  | 'OPIC'
  | 'TOEFL'
  | 'IELTS'
  | 'JPT'
  | 'JLPT'
  | 'HSK'
  | 'OTHER'

// ============================================================
// 프로필
// ============================================================
export interface Profile {
  id: string
  user_id: string
  profile_name: string
  education_level: EducationLevel | null
  major_category: MajorCategory | null
  major_detail: string | null
  school_name: string | null
  school_region: string | null
  gpa: number | null
  double_major: string | null
  is_veterans: boolean
  is_disabled: boolean
  is_local_talent: boolean
  is_non_capital: boolean
  created_at: string
  updated_at: string
}

export interface UserCertificate {
  id: string
  profile_id: string
  certificate_id: string
  acquired_date: string
  grade: string | null
  certificate?: Certificate
}

export interface UserLanguageScore {
  id: string
  profile_id: string
  exam_type: ExamType
  score: number | null
  grade: string | null
  acquired_date: string
  expiry_date: string | null
}

// ============================================================
// 자격증 마스터
// ============================================================
export interface Certificate {
  id: string
  name: string
  issuer: string
  category: string
  grade: string | null
}

// ============================================================
// 공기업
// ============================================================
export interface PublicEnterprise {
  id: string
  name: string
  type: EnterpriseType
  ministry: string | null
  location: string | null
  website_url: string | null
  last_updated: string
}

export interface BonusPointRule {
  id: string
  enterprise_id: string
  category: BonusCategory
  item_id: string | null
  condition_detail: string
  bonus_point_percentage: number
  source_url: string | null
  updated_at: string
}

// ============================================================
// 추천 결과
// ============================================================
export interface RecommendationResult {
  enterprise: PublicEnterprise
  total_bonus_point: number
  matched_rules: MatchedRule[]
}

export interface MatchedRule {
  category: BonusCategory
  condition_detail: string
  bonus_point_percentage: number
  source_url: string | null
  updated_at: string
}

// ============================================================
// 프로필 등록 마법사 폼 스텝별 타입
// ============================================================
export interface ProfileStep1 {
  education_level: EducationLevel | ''
  major_category: MajorCategory | ''
  major_detail: string
  school_name: string
  school_region: string
  gpa: string
  double_major: string
}

export interface ProfileStep2 {
  certificates: {
    certificate_id: string
    certificate_name: string
    grade: string
    acquired_date: string
  }[]
}

export interface ProfileStep3 {
  language_scores: {
    exam_type: ExamType
    score: string
    grade: string
    acquired_date: string
  }[]
}

export interface ProfileStep4 {
  is_veterans: boolean
  is_disabled: boolean
  is_local_talent: boolean
  is_non_capital: boolean
}
