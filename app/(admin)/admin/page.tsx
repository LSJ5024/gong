import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type RecentReport = {
  id: string
  report_type: string
  status: string
  created_at: string
  public_enterprises: { name: string } | null
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: enterpriseCount },
    { count: ruleCount },
    { count: pendingReports },
    { data: rawReports },
  ] = await Promise.all([
    supabase.from('public_enterprises').select('*', { count: 'exact', head: true }),
    supabase.from('bonus_point_rules').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('reports')
      .select('id, report_type, status, created_at, public_enterprises(name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const recentReports = (rawReports ?? []) as RecentReport[]

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

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">대시보드</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="등록 기업 수"
          value={enterpriseCount ?? 0}
          href="/admin/enterprises"
          color="blue"
        />
        <StatCard
          label="가산점 규칙 수"
          value={ruleCount ?? 0}
          href="/admin/enterprises"
          color="green"
        />
        <StatCard
          label="미처리 신고"
          value={pendingReports ?? 0}
          href="/admin/reports"
          color={(pendingReports ?? 0) > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* 최근 신고 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">최근 신고</h2>
          <Link href="/admin/reports" className="text-sm text-blue-600 hover:underline">전체 보기 →</Link>
        </div>
        {recentReports.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">기업</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">유형</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">상태</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentReports.map((r) => {
                const ent = r.public_enterprises
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{ent?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{REPORT_TYPE_LABEL[r.report_type] ?? r.report_type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status] ?? ''}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">신고가 없습니다.</p>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label, value, href, color,
}: {
  label: string
  value: number
  href: string
  color: 'blue' | 'green' | 'red' | 'gray'
}) {
  const colorMap = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    gray: 'text-gray-500',
  }
  return (
    <Link href={href} className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow block">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorMap[color]}`}>{value.toLocaleString()}</p>
    </Link>
  )
}
