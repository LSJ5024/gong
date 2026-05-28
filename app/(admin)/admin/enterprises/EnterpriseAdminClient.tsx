'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type Enterprise = {
  id: string
  name: string
  type: string
  ministry: string | null
  location: string | null
  website_url: string | null
  last_updated: string
  rule_count: number
}

const TYPE_COLOR: Record<string, string> = {
  '공기업': 'bg-blue-100 text-blue-700',
  '준정부기관': 'bg-green-100 text-green-700',
  '기타공공기관': 'bg-gray-100 text-gray-600',
}

export default function EnterpriseAdminClient({ initialData }: { initialData: Enterprise[] }) {
  const [enterprises, setEnterprises] = useState(initialData)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    name: '', type: '공기업', ministry: '', location: '', website_url: '',
  })
  const [error, setError] = useState('')

  const filtered = useMemo(() =>
    enterprises.filter((e) =>
      e.name.includes(search) ||
      (e.ministry ?? '').includes(search) ||
      (e.location ?? '').includes(search)
    ), [enterprises, search])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setError('')
    try {
      const res = await fetch('/api/admin/enterprises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          ministry: form.ministry || null,
          location: form.location || null,
          website_url: form.website_url || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? '추가 실패')
        return
      }
      setEnterprises((prev) => [...prev, { ...json.enterprise, rule_count: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
      setForm({ name: '', type: '공기업', ministry: '', location: '', website_url: '' })
      setShowAddForm(false)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">기업 관리 <span className="text-gray-400 font-normal text-base">({enterprises.length}개)</span></h1>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 기업 추가
        </button>
      </div>

      {/* 기업 추가 폼 */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm p-6 mb-6 space-y-4">
          <h2 className="font-bold text-gray-900">새 기업 추가</h2>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">기업명 *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="한국전력공사"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">유형 *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>공기업</option>
                <option>준정부기관</option>
                <option>기타공공기관</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">주무부처</label>
              <input
                value={form.ministry}
                onChange={(e) => setForm((f) => ({ ...f, ministry: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="산업통상자원부"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">소재지</label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="전남"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">홈페이지 URL</label>
              <input
                value={form.website_url}
                onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.kepco.co.kr"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">취소</button>
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      )}

      {/* 검색 */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="기업명, 주무부처, 소재지 검색..."
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 기업 목록 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">기업명</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">유형</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">주무부처</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">소재지</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">규칙 수</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((ent) => (
              <tr key={ent.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">
                  {ent.website_url ? (
                    <a href={ent.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                      {ent.name}
                    </a>
                  ) : ent.name}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[ent.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ent.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{ent.ministry ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{ent.location ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-bold ${ent.rule_count === 0 ? 'text-gray-300' : 'text-gray-900'}`}>
                    {ent.rule_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/admin/enterprises/${ent.id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    규칙 관리
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">검색 결과가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
