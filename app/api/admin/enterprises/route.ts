import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/check-admin'
import { z } from 'zod'

async function checkAdmin() {
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return null
  return { supabase, user }
}

const enterpriseSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['공기업', '준정부기관', '기타공공기관']),
  ministry: z.string().max(100).nullable().optional(),
  location: z.string().max(50).nullable().optional(),
  website_url: z.string().url().nullable().optional(),
})

// GET /api/admin/enterprises — 기업 목록 + 규칙 수
export async function GET() {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { supabase } = auth

  const { data, error } = await supabase
    .from('public_enterprises')
    .select('id, name, type, ministry, location, website_url, last_updated')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 기업별 규칙 수 집계
  const { data: ruleCounts } = await supabase
    .from('bonus_point_rules')
    .select('enterprise_id')

  const countMap: Record<string, number> = {}
  for (const r of ruleCounts ?? []) {
    countMap[r.enterprise_id] = (countMap[r.enterprise_id] ?? 0) + 1
  }

  const enterprises = (data ?? []).map((e) => ({
    ...e,
    rule_count: countMap[e.id] ?? 0,
  }))

  return NextResponse.json({ enterprises })
}

// POST /api/admin/enterprises — 기업 추가
export async function POST(request: Request) {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { supabase } = auth

  const body = await request.json()
  const parsed = enterpriseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await supabase
    .from('public_enterprises')
    .insert({ ...parsed.data, last_updated: new Date().toISOString() })
    .select('id, name, type, ministry, location, website_url, last_updated')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ enterprise: data }, { status: 201 })
}
