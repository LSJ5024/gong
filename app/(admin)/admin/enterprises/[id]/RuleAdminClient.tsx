'use client'

import { useState } from 'react'

type Rule = {
  id: string
  enterprise_id: string
  category: string
  condition_detail: string
  bonus_point_percentage: number
  source_url: string | null
  updated_at: string
}

const CATEGORIES = ['자격증', '어학', '전공', '보훈', '장애', '지역인재', '기타'] as const
const CAT_COLOR: Record<string, string> = {
  '자격증': 'bg-orange-100 text-orange-700',
  '어학': 'bg-blue-100 text-blue-700',
  '전공': 'bg-purple-100 text-purple-700',
  '보훈': 'bg-yellow-100 text-yellow-700',
  '장애': 'bg-pink-100 text-pink-700',
  '지역인재': 'bg-green-100 text-green-700',
  '기타': 'bg-gray-100 text-gray-600',
}

const EMPTY_FORM = { category: '어학', condition_detail: '', bonus_point_percentage: '', source_url: '' }

export default function RuleAdminClient({
  enterpriseId, enterpriseName, initialRules,
}: {
  enterpriseId: string
  enterpriseName: string
  initialRules: Rule[]
}) {
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const baseUrl = `/api/admin/enterprises/${enterpriseId}/rules`

  // ── 규칙 추가 ──────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          condition_detail: form.condition_detail,
          bonus_point_percentage: parseFloat(form.bonus_point_percentage as string),
          source_url: form.source_url || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(JSON.stringify(json.error)); return }
      setRules((prev) => [...prev, json.rule].sort((a, b) => a.category.localeCompare(b.category)))
      setForm({ ...EMPTY_FORM })
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  // ── 규칙 수정 ──────────────────────────────────────────────────

  function startEdit(rule: Rule) {
    setEditingId(rule.id)
    setEditForm({
      category: rule.category,
      condition_detail: rule.condition_detail,
      bonus_point_percentage: String(rule.bonus_point_percentage),
      source_url: rule.source_url ?? '',
    })
  }

  async function handleEdit(ruleId: string) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${baseUrl}?ruleId=${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: editForm.category,
          condition_detail: editForm.condition_detail,
          bonus_point_percentage: parseFloat(editForm.bonus_point_percentage as string),
          source_url: editForm.source_url || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(JSON.stringify(json.error)); return }
      setRules((prev) => prev.map((r) => r.id === ruleId ? json.rule : r))
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  // ── 규칙 삭제 ──────────────────────────────────────────────────

  async function handleDelete(ruleId: string) {
    setDeletingId(ruleId)
    try {
      const res = await fetch(`${baseUrl}?ruleId=${ruleId}`, { method: 'DELETE' })
      if (!res.ok) { setError('삭제 실패'); return }
      setRules((prev) => prev.filter((r) => r.id !== ruleId))
    } finally {
      setDeletingId(null)
    }
  }

  // ── 렌더링 ────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900">
          가산점 규칙 <span className="text-gray-400 font-normal">({rules.length}개)</span>
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + 규칙 추가
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

      {/* 추가 폼 */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-4 space-y-3">
          <h3 className="text-sm font-bold text-blue-900">새 규칙 추가 — {enterpriseName}</h3>
          <RuleFormFields form={form} onChange={(f) => setForm(f)} />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600">취소</button>
            <button type="submit" disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50">
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      )}

      {/* 규칙 목록 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {rules.length === 0 ? (
          <p className="px-6 py-10 text-sm text-gray-400 text-center">등록된 규칙이 없습니다. 추가 버튼으로 규칙을 등록하세요.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">카테고리</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">조건</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">가산점</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">출처</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rules.map((rule) => (
                editingId === rule.id ? (
                  // 인라인 편집 행
                  <tr key={rule.id} className="bg-yellow-50">
                    <td className="px-4 py-2" colSpan={4}>
                      <RuleFormFields form={editForm} onChange={(f) => setEditForm(f)} compact />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => handleEdit(rule.id)} disabled={saving}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50">
                          저장
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="px-2 py-1 text-gray-600 text-xs border border-gray-200 rounded hover:bg-gray-50">
                          취소
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLOR[rule.category] ?? 'bg-gray-100'}`}>
                        {rule.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{rule.condition_detail}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">+{rule.bonus_point_percentage}%</td>
                    <td className="px-4 py-3">
                      {rule.source_url ? (
                        <a href={rule.source_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline truncate block max-w-[160px]">
                          링크
                        </a>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => startEdit(rule)}
                          className="px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50">
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          disabled={deletingId === rule.id}
                          className="px-2 py-1 text-xs text-red-600 border border-red-100 rounded hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === rule.id ? '...' : '삭제'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── 공통 폼 필드 컴포넌트 ──────────────────────────────────────────

type FormState = { category: string; condition_detail: string; bonus_point_percentage: string; source_url: string }

function RuleFormFields({
  form, onChange, compact = false,
}: {
  form: FormState
  onChange: (f: FormState) => void
  compact?: boolean
}) {
  const gridClass = compact
    ? 'grid grid-cols-4 gap-2 items-center'
    : 'grid grid-cols-2 gap-3'

  return (
    <div className={gridClass}>
      <div>
        {!compact && <label className="block text-xs font-medium text-gray-600 mb-1">카테고리 *</label>}
        <select
          required
          value={form.category}
          onChange={(e) => onChange({ ...form, category: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        {!compact && <label className="block text-xs font-medium text-gray-600 mb-1">조건 상세 *</label>}
        <input
          required
          value={form.condition_detail}
          onChange={(e) => onChange({ ...form, condition_detail: e.target.value })}
          placeholder="TOEIC 700점 이상 / 전기기사 등"
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        {!compact && <label className="block text-xs font-medium text-gray-600 mb-1">가산점 (%) *</label>}
        <input
          required
          type="number"
          step="0.1"
          min="0.1"
          max="20"
          value={form.bonus_point_percentage}
          onChange={(e) => onChange({ ...form, bonus_point_percentage: e.target.value })}
          placeholder="3.0"
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        {!compact && <label className="block text-xs font-medium text-gray-600 mb-1">출처 URL</label>}
        <input
          value={form.source_url}
          onChange={(e) => onChange({ ...form, source_url: e.target.value })}
          placeholder="https://공고URL"
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}
