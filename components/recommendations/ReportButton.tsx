'use client'

import { useState, useRef, useEffect } from 'react'

type Rule = {
  id: string
  category: string
  condition_detail: string
}

type ReportType = 'incorrect_info' | 'outdated' | 'missing_rule' | 'other'

const REPORT_TYPES: { value: ReportType; label: string; desc: string }[] = [
  { value: 'incorrect_info', label: '잘못된 정보',   desc: '가산점 비율이나 조건이 실제와 다릅니다.' },
  { value: 'outdated',       label: '오래된 정보',   desc: '해당 규정이 변경되었거나 폐지되었습니다.' },
  { value: 'missing_rule',   label: '누락된 가산점', desc: '이 기업의 가산점 항목이 빠져 있습니다.' },
  { value: 'other',          label: '기타',          desc: '위 항목에 해당하지 않는 내용입니다.' },
]

export default function ReportButton({
  enterpriseId,
  enterpriseName,
  rules,
}: {
  enterpriseId: string
  enterpriseName: string
  rules: Rule[]
}) {
  const [open, setOpen] = useState(false)
  const [reportType, setReportType] = useState<ReportType>('incorrect_info')
  const [ruleId, setRuleId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  // 모달 열리면 내용 입력란에 포커스
  useEffect(() => {
    if (open) {
      setTimeout(() => descriptionRef.current?.focus(), 50)
    }
  }, [open])

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  // 배경 클릭으로 닫기
  function handleBackdropClick(e: React.MouseEvent) {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      handleClose()
    }
  }

  function handleClose() {
    setOpen(false)
    setSubmitted(false)
    setError('')
    setDescription('')
    setRuleId('')
    setReportType('incorrect_info')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (description.trim().length < 10) {
      setError('10자 이상 입력해주세요.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enterprise_id: enterpriseId,
          rule_id: ruleId || null,
          report_type: reportType,
          description: description.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message ?? '제출 중 오류가 발생했습니다. 다시 시도해주세요.')
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const charCount = description.length

  return (
    <>
      {/* 신고 트리거 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors underline-offset-2 hover:underline min-h-[44px] px-2 flex items-center"
        aria-label="가산점 정보 오류 신고하기"
      >
        🚩 오류 신고
      </button>

      {/* 모달 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-dialog-title"
          onClick={handleBackdropClick}
        >
          <div
            ref={dialogRef}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative"
          >
            {/* 닫기 버튼 */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              aria-label="닫기"
            >
              ✕
            </button>

            {submitted ? (
              /* 제출 완료 상태 */
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <h2 id="report-dialog-title" className="text-base font-bold text-gray-900 mb-2">
                  신고가 접수되었습니다
                </h2>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  소중한 제보 감사합니다. 검토 후 데이터를 업데이트하겠습니다.
                </p>
                <button
                  onClick={handleClose}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  닫기
                </button>
              </div>
            ) : (
              /* 신고 폼 */
              <form onSubmit={handleSubmit} noValidate>
                <h2 id="report-dialog-title" className="text-base font-bold text-gray-900 mb-1">
                  가산점 정보 오류 신고
                </h2>
                <p className="text-xs text-gray-400 mb-5">
                  <span className="font-medium text-gray-600">{enterpriseName}</span>의 정보를 신고합니다.
                </p>

                {/* 신고 유형 선택 */}
                <fieldset className="mb-4">
                  <legend className="text-sm font-medium text-gray-700 mb-2">
                    신고 유형 <span className="text-red-500" aria-hidden="true">*</span>
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {REPORT_TYPES.map(({ value, label }) => (
                      <label
                        key={value}
                        className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer text-sm transition-colors ${
                          reportType === value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reportType"
                          value={value}
                          checked={reportType === value}
                          onChange={() => setReportType(value)}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {REPORT_TYPES.find((t) => t.value === reportType)?.desc}
                  </p>
                </fieldset>

                {/* 관련 항목 선택 (선택사항) */}
                {rules.length > 0 && (
                  <div className="mb-4">
                    <label htmlFor="report-rule" className="block text-sm font-medium text-gray-700 mb-1">
                      관련 항목 <span className="text-gray-400 text-xs">(선택)</span>
                    </label>
                    <select
                      id="report-rule"
                      value={ruleId}
                      onChange={(e) => setRuleId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">전체 또는 직접 입력</option>
                      {rules.map((rule) => (
                        <option key={rule.id} value={rule.id}>
                          [{rule.category}] {rule.condition_detail.slice(0, 40)}{rule.condition_detail.length > 40 ? '…' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 신고 내용 */}
                <div className="mb-4">
                  <label htmlFor="report-description" className="block text-sm font-medium text-gray-700 mb-1">
                    상세 내용 <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="report-description"
                    ref={descriptionRef}
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setError('') }}
                    placeholder="정확하지 않은 내용과 올바른 정보를 알려주세요. (예: 토익 700점 이상이 아니라 750점 이상입니다.)"
                    rows={4}
                    maxLength={500}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
                    aria-describedby={error ? 'report-error' : 'report-hint'}
                    required
                  />
                  <div className="flex justify-between items-center mt-1">
                    {error ? (
                      <p id="report-error" className="text-xs text-red-500" role="alert">{error}</p>
                    ) : (
                      <p id="report-hint" className="text-xs text-gray-400">최소 10자, 최대 500자</p>
                    )}
                    <span className={`text-xs ${charCount >= 450 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {charCount}/500
                    </span>
                  </div>
                </div>

                {/* 제출 버튼 */}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting || description.trim().length < 10}
                    className="flex-1 bg-red-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-600 disabled:opacity-40 transition-colors"
                  >
                    {submitting ? '제출 중...' : '신고 제출'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm hover:bg-gray-50"
                  >
                    취소
                  </button>
                </div>

                <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed">
                  허위 신고는 서비스 이용이 제한될 수 있습니다.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
