'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcExpiryDate } from '@/lib/utils/language-expiry'
import { encryptProfileSensitiveFields } from '@/lib/utils/sensitive-encrypt'
import type {
  ProfileStep1, ProfileStep2, ProfileStep3, ProfileStep4,
  EducationLevel, MajorCategory, ExamType,
} from '@/types'

const STEPS = ['학력·전공', '자격증', '어학성적', '기타 가산항목']
const STEP_SHORT = ['학력', '자격증', '어학', '기타']

const EDUCATION_LEVELS: EducationLevel[] = ['고졸', '전문학사', '학사', '석사', '박사']
const MAJOR_CATEGORIES: MajorCategory[] = ['이공계', '상경계', '인문사회계', '사범계', '예체능', '기타']
const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: 'TOEIC', label: 'TOEIC (토익)' },
  { value: 'TOEIC_SPEAKING', label: 'TOEIC Speaking (토스)' },
  { value: 'OPIC', label: 'OPIc (오픽)' },
  { value: 'TOEFL', label: 'TOEFL' },
  { value: 'IELTS', label: 'IELTS' },
  { value: 'JPT', label: 'JPT' },
  { value: 'JLPT', label: 'JLPT' },
  { value: 'HSK', label: 'HSK' },
  { value: 'OTHER', label: '기타' },
]

const OPIC_GRADES = ['NL', 'NM', 'NH', 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL']
const TOEIC_SPEAKING_GRADES = ['Lv.1', 'Lv.2', 'Lv.3', 'Lv.4', 'Lv.5', 'Lv.6', 'Lv.7', 'Lv.8']
const JLPT_GRADES = ['N5', 'N4', 'N3', 'N2', 'N1']
const HSK_GRADES = ['1급', '2급', '3급', '4급', '5급', '6급']

// 공통 input/select 스타일 (iOS 16px 이상으로 자동 확대 방지)
const INPUT_CLS = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function ProfileSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [step1, setStep1] = useState<ProfileStep1>({
    education_level: '', major_category: '', major_detail: '',
    school_name: '', school_region: '', gpa: '', double_major: '',
  })
  const [step2, setStep2] = useState<ProfileStep2>({ certificates: [] })
  const [step3, setStep3] = useState<ProfileStep3>({ language_scores: [] })
  const [step4, setStep4] = useState<ProfileStep4>({
    is_veterans: false, is_disabled: false, is_local_talent: false, is_non_capital: false,
  })

  function addCertificate() {
    setStep2((prev) => ({
      certificates: [
        ...prev.certificates,
        { certificate_id: '', certificate_name: '', grade: '', acquired_date: '' },
      ],
    }))
  }

  function removeCertificate(i: number) {
    setStep2((prev) => ({ certificates: prev.certificates.filter((_, idx) => idx !== i) }))
  }

  function addLanguageScore() {
    setStep3((prev) => ({
      language_scores: [
        ...prev.language_scores,
        { exam_type: 'TOEIC', score: '', grade: '', acquired_date: '' },
      ],
    }))
  }

  function removeLanguageScore(i: number) {
    setStep3((prev) => ({ language_scores: prev.language_scores.filter((_, idx) => idx !== i) }))
  }

  async function handleSubmit() {
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // 민감정보 AES-256-GCM 암호화
    const sensitiveEnc = encryptProfileSensitiveFields({
      is_veterans: step4.is_veterans,
      is_disabled: step4.is_disabled,
    })

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        profile_name: '기본 프로필',
        education_level: step1.education_level || null,
        major_category: step1.major_category || null,
        major_detail: step1.major_detail || null,
        school_name: step1.school_name || null,
        school_region: step1.school_region || null,
        gpa: step1.gpa ? parseFloat(step1.gpa) : null,
        double_major: step1.double_major || null,
        ...sensitiveEnc,  // is_veterans_enc, is_disabled_enc
        is_local_talent: step4.is_local_talent,
        is_non_capital: step4.is_non_capital,
      })
      .select('id')
      .single()

    if (profileError || !profile) {
      setError('프로필 저장 중 오류가 발생했습니다.')
      setSaving(false)
      return
    }

    const validScores = step3.language_scores.filter((s) => s.acquired_date)
    if (validScores.length > 0) {
      const { error: langError } = await supabase.from('user_language_scores').insert(
        validScores.map((s) => ({
          profile_id: profile.id,
          exam_type: s.exam_type,
          score: s.score ? parseInt(s.score) : null,
          grade: s.grade || null,
          acquired_date: s.acquired_date,
          expiry_date: calcExpiryDate(s.exam_type, s.acquired_date),
        }))
      )
      if (langError) {
        setError('어학성적 저장 중 오류가 발생했습니다.')
        setSaving(false)
        return
      }
    }

    router.push('/recommendations')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* 스텝 인디케이터 */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                    ${i < step ? 'bg-blue-600 text-white' :
                      i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                      'bg-gray-200 text-gray-400'}`}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                {/* 모바일: 짧은 레이블 / 데스크탑: 전체 레이블 */}
                <span className={`text-xs mt-1 truncate max-w-[48px] sm:max-w-none text-center leading-tight ${
                  i === step ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}>
                  <span className="sm:hidden">{STEP_SHORT[i]}</span>
                  <span className="hidden sm:inline">{label}</span>
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6">

          {/* Step 1: 학력·전공 */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">학력 및 전공 입력</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">최종 학력</label>
                  <select
                    value={step1.education_level}
                    onChange={(e) => setStep1((p) => ({ ...p, education_level: e.target.value as EducationLevel }))}
                    className={INPUT_CLS}
                  >
                    <option value="">선택</option>
                    {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전공 계열</label>
                  <select
                    value={step1.major_category}
                    onChange={(e) => setStep1((p) => ({ ...p, major_category: e.target.value as MajorCategory }))}
                    className={INPUT_CLS}
                  >
                    <option value="">선택</option>
                    {MAJOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">전공 세부 (예: 전기전자, 경영학)</label>
                <input
                  type="text"
                  value={step1.major_detail}
                  onChange={(e) => setStep1((p) => ({ ...p, major_detail: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="전공명 입력"
                  autoComplete="off"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">학교명</label>
                  <input
                    type="text"
                    value={step1.school_name}
                    onChange={(e) => setStep1((p) => ({ ...p, school_name: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="학교명"
                    autoComplete="organization"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">학교 소재지</label>
                  <input
                    type="text"
                    value={step1.school_region}
                    onChange={(e) => setStep1((p) => ({ ...p, school_region: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="예: 서울, 부산"
                    autoComplete="address-level1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">학점 (선택)</label>
                  <input
                    type="number"
                    value={step1.gpa}
                    onChange={(e) => setStep1((p) => ({ ...p, gpa: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="4.5 기준"
                    step="0.01" min="0" max="4.5"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">복수전공 / 부전공 (선택)</label>
                  <input
                    type="text"
                    value={step1.double_major}
                    onChange={(e) => setStep1((p) => ({ ...p, double_major: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="예: 통계학"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 자격증 */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">보유 자격증 입력</h2>
              {step2.certificates.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">
                  아래 버튼을 눌러 자격증을 추가하세요.
                </p>
              )}
              {step2.certificates.map((cert, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">자격증 {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeCertificate(i)}
                      className="text-red-400 text-sm hover:text-red-600 min-h-[44px] px-2"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">자격증명</label>
                      <input
                        type="text"
                        value={cert.certificate_name}
                        onChange={(e) => {
                          const next = [...step2.certificates]
                          next[i] = { ...next[i], certificate_name: e.target.value }
                          setStep2({ certificates: next })
                        }}
                        className={INPUT_CLS}
                        placeholder="예: 정보처리기사"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">등급 (선택)</label>
                      <input
                        type="text"
                        value={cert.grade}
                        onChange={(e) => {
                          const next = [...step2.certificates]
                          next[i] = { ...next[i], grade: e.target.value }
                          setStep2({ certificates: next })
                        }}
                        className={INPUT_CLS}
                        placeholder="예: 기사"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">취득일</label>
                    <input
                      type="date"
                      value={cert.acquired_date}
                      onChange={(e) => {
                        const next = [...step2.certificates]
                        next[i] = { ...next[i], acquired_date: e.target.value }
                        setStep2({ certificates: next })
                      }}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addCertificate}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3.5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors min-h-[44px]"
              >
                + 자격증 추가
              </button>
            </div>
          )}

          {/* Step 3: 어학성적 */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">어학성적 입력</h2>
              {step3.language_scores.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">
                  아래 버튼을 눌러 어학성적을 추가하세요.
                </p>
              )}
              {step3.language_scores.map((score, i) => {
                const isGradeBased = ['OPIC', 'TOEIC_SPEAKING', 'JLPT', 'HSK'].includes(score.exam_type)
                const gradeOptions =
                  score.exam_type === 'OPIC' ? OPIC_GRADES :
                  score.exam_type === 'TOEIC_SPEAKING' ? TOEIC_SPEAKING_GRADES :
                  score.exam_type === 'JLPT' ? JLPT_GRADES :
                  score.exam_type === 'HSK' ? HSK_GRADES : []

                return (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">어학성적 {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeLanguageScore(i)}
                        className="text-red-400 text-sm hover:text-red-600 min-h-[44px] px-2"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">시험 종류</label>
                        <select
                          value={score.exam_type}
                          onChange={(e) => {
                            const next = [...step3.language_scores]
                            next[i] = { ...next[i], exam_type: e.target.value as ExamType, score: '', grade: '' }
                            setStep3({ language_scores: next })
                          }}
                          className={INPUT_CLS}
                        >
                          {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          {isGradeBased ? '등급' : '점수'}
                        </label>
                        {isGradeBased && gradeOptions.length > 0 ? (
                          <select
                            value={score.grade}
                            onChange={(e) => {
                              const next = [...step3.language_scores]
                              next[i] = { ...next[i], grade: e.target.value }
                              setStep3({ language_scores: next })
                            }}
                            className={INPUT_CLS}
                          >
                            <option value="">선택</option>
                            {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                          </select>
                        ) : (
                          <input
                            type="number"
                            value={score.score}
                            onChange={(e) => {
                              const next = [...step3.language_scores]
                              next[i] = { ...next[i], score: e.target.value }
                              setStep3({ language_scores: next })
                            }}
                            className={INPUT_CLS}
                            placeholder="점수 입력"
                            inputMode="numeric"
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">취득일</label>
                      <input
                        type="date"
                        value={score.acquired_date}
                        onChange={(e) => {
                          const next = [...step3.language_scores]
                          next[i] = { ...next[i], acquired_date: e.target.value }
                          setStep3({ language_scores: next })
                        }}
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>
                )
              })}
              <button
                type="button"
                onClick={addLanguageScore}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3.5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors min-h-[44px]"
              >
                + 어학성적 추가
              </button>
            </div>
          )}

          {/* Step 4: 기타 가산항목 */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">기타 가산 항목</h2>
              <p className="text-sm text-gray-500">해당하는 항목을 선택하세요. 민감 정보는 암호화되어 저장됩니다.</p>
              {[
                { key: 'is_veterans',     label: '취업 지원 대상자 (보훈)', desc: '국가유공자 등 취업지원대상자' },
                { key: 'is_disabled',     label: '장애인 등록',             desc: '장애인 복지법상 등록 장애인' },
                { key: 'is_local_talent', label: '지역인재',                desc: '지방대학 및 지역균형인재 육성에 관한 법률 해당자' },
                { key: 'is_non_capital',  label: '비수도권 거주',            desc: '서울·경기·인천 외 지역 거주' },
              ].map(({ key, label, desc }) => (
                <label
                  key={key}
                  className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors min-h-[60px]"
                >
                  <input
                    type="checkbox"
                    checked={step4[key as keyof ProfileStep4]}
                    onChange={(e) => setStep4((p) => ({ ...p, [key]: e.target.checked }))}
                    className="mt-0.5 w-5 h-5 text-blue-600 rounded"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          {/* 네비게이션 버튼 */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-3 text-sm font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                이전
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 transition-colors min-h-[44px]"
              >
                다음
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {saving ? '저장 중...' : '완료 — 추천 결과 보기'}
              </button>
            )}
          </div>
        </div>

        {/* 건너뛰기 */}
        {step < STEPS.length - 1 && (
          <p className="text-center text-sm text-gray-400 mt-4">
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="hover:text-gray-600 underline min-h-[44px] px-3"
            >
              이 단계 건너뛰기
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
