'use client'

import { useState } from 'react'
import Link from 'next/link'

type Report = {
  id: string
  report_type: string
  description: string | null
  status: string
  created_at: string
  enterprise_id: string
  rule_id: string | null
  public_enterprises: { name: string } | null
}

const REPORT_TYPE_LABEL: Record<string, string> = {
  incorrect_info: '잘못된 정보',
  outdated: '오래된 정보',
  missing_rule: '누락된 규칙',
  other: '기타',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
}
const STATUS_LABEL: Record<string, string> = {
  pending: '미처리',
  resolved: '처리완료',
  dismissed: '무시',
}

export default function ReportsAdminClient({ initialReports }: { initialReports: Report[] }) {
  const [reports, setReports] = useState(initialReports)
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('pending')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filtered = reports.filter((r) => filter === 'all' || r.status === filter)

  async function updateStatus(reportId: string, status: string) {
    setUpdatingId(reportId)
    try {
      const res = await fetch(`/api/admin/reports?reportId=${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) return
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status } : r))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">신고 관리</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'pending', 'resolved', 'dismissed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === s ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'all' ? '전체' : STATUS_LABEL[s]}
              <span className="ml-1 text-xs text-gray-400">
                ({reports.filter((r) => s === 'all' || r.status === s).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-6 py-10 text-sm text-gray-400 text-center">신고가 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">기업</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">유형</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">내용</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">상태</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">일시</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/enterprises/${report.enterprise_id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {report.public_enterprises?.name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {REPORT_TYPE_LABEL[report.report_type] ?? report.report_type}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    <span className="line-clamp-2">{report.description || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[report.status] ?? ''}`}>
                      {STATUS_LABEL[report.status] ?? report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(report.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-center">
                      {report.status !== 'resolved' && (
                        <button
                          onClick={() => updateStatus(report.id, 'resolved')}
                          disabled={updatingId === report.id}
                          className="px-2 py-1 text-xs text-green-700 border border-green-200 rounded hover:bg-green-50 disabled:opacity-50"
                        >
                          처리완료
                        </button>
                      )}
                      {report.status !== 'dismissed' && (
                        <button
                          onClick={() => updateStatus(report.id, 'dismissed')}
                          disabled={updatingId === report.id}
                          className="px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                          무시
                        </button>
                      )}
                      {report.status !== 'pending' && (
                        <button
                          onClick={() => updateStatus(report.id, 'pending')}
                          disabled={updatingId === report.id}
                          className="px-2 py-1 text-xs text-yellow-700 border border-yellow-200 rounded hover:bg-yellow-50 disabled:opacity-50"
                        >
                          재개
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
