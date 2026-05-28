import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/check-admin'

async function checkAdmin() {
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return null
  return { supabase, user }
}

// GET /api/admin/reports?status=pending|resolved
export async function GET(request: Request) {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { supabase } = auth

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'pending'

  let query = supabase
    .from('reports')
    .select(`
      id, report_type, description, status, created_at,
      enterprise_id, rule_id,
      public_enterprises(name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reports: data ?? [] })
}

// PATCH /api/admin/reports?reportId=xxx — 신고 상태 변경
export async function PATCH(request: Request) {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { supabase } = auth

  const { searchParams } = new URL(request.url)
  const reportId = searchParams.get('reportId')
  if (!reportId) return NextResponse.json({ error: 'reportId required' }, { status: 400 })

  const { status } = await request.json()
  if (!['pending', 'resolved', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 422 })
  }

  const { error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', reportId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
