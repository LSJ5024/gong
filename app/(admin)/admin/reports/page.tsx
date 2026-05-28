import { createClient } from '@/lib/supabase/server'
import ReportsAdminClient from './ReportsAdminClient'

export default async function AdminReportsPage() {
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('reports')
    .select(`id, report_type, description, status, created_at, enterprise_id, rule_id, public_enterprises(name)`)
    .order('created_at', { ascending: false })
    .limit(200)

  return <ReportsAdminClient initialReports={reports ?? []} />
}
