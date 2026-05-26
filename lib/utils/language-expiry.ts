import type { ExamType } from '@/types'

const EXPIRY_YEARS: Partial<Record<ExamType, number | null>> = {
  TOEIC: 2,
  TOEIC_SPEAKING: 2,
  OPIC: 2,
  TOEFL: 2,
  IELTS: 2,
  JPT: 2,
  JLPT: null,   // 무기한
  HSK: null,    // 무기한
  OTHER: 2,
}

export function calcExpiryDate(examType: ExamType, acquiredDate: string): string | null {
  const years = EXPIRY_YEARS[examType]
  if (years === null || years === undefined) return null

  const date = new Date(acquiredDate)
  date.setFullYear(date.getFullYear() + years)
  return date.toISOString().split('T')[0]
}

export function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}
