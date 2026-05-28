import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RuleAdminClient from './RuleAdminClient'

type Params = { params: Promise<{ id: string }> }

export default async function EnterpriseRulesPage({ params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: enterprise }, { data: rules }] = await Promise.all([
    supabase
      .from('public_enterprises')
      .select('id, name, type, ministry, location, website_url')
      .eq('id', id)
      .single(),
    supabase
      .from('bonus_point_rules')
      .select('*')
      .eq('enterprise_id', id)
      .order('category'),
  ])

  if (!enterprise) notFound()

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/enterprises" className="text-sm text-blue-600 hover:underline">← 기업 목록</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{enterprise.name}</h1>
        <span className="text-sm text-gray-400">{enterprise.type}</span>
      </div>

      {enterprise.website_url && (
        <a
          href={enterprise.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline mb-4 inline-block"
        >
          🔗 {enterprise.website_url}
        </a>
      )}

      <RuleAdminClient enterpriseId={id} enterpriseName={enterprise.name} initialRules={rules ?? []} />
    </div>
  )
}
