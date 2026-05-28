import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import EnterpriseAdminClient from './EnterpriseAdminClient'

export default async function AdminEnterprisesPage() {
  const supabase = await createClient()

  const { data: enterprises } = await supabase
    .from('public_enterprises')
    .select('id, name, type, ministry, location, website_url, last_updated')
    .order('name')

  // 기업별 규칙 수
  const { data: rules } = await supabase
    .from('bonus_point_rules')
    .select('enterprise_id')

  const countMap: Record<string, number> = {}
  for (const r of rules ?? []) {
    countMap[r.enterprise_id] = (countMap[r.enterprise_id] ?? 0) + 1
  }

  const data = (enterprises ?? []).map((e) => ({
    ...e,
    rule_count: countMap[e.id] ?? 0,
  }))

  return <EnterpriseAdminClient initialData={data} />
}
