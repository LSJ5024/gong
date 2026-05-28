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

const ruleSchema = z.object({
  category: z.enum(['자격증', '어학', '전공', '보훈', '장애', '지역인재', '기타']),
  condition_detail: z.string().min(1).max(200),
  bonus_point_percentage: z.number().min(0.1).max(20),
  source_url: z.string().url().nullable().optional(),
})

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/enterprises/[id]/rules
export async function GET(_req: Request, { params }: Params) {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { supabase } = auth
  const { id } = await params

  const { data, error } = await supabase
    .from('bonus_point_rules')
    .select('*')
    .eq('enterprise_id', id)
    .order('category')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rules: data ?? [] })
}

// POST /api/admin/enterprises/[id]/rules — 규칙 추가
export async function POST(request: Request, { params }: Params) {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { supabase } = auth
  const { id } = await params

  const body = await request.json()
  const parsed = ruleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await supabase
    .from('bonus_point_rules')
    .insert({ ...parsed.data, enterprise_id: id, updated_at: new Date().toISOString() })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rule: data }, { status: 201 })
}

// DELETE /api/admin/enterprises/[id]/rules?ruleId=xxx — 규칙 삭제
export async function DELETE(request: Request, { params }: Params) {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { supabase } = auth
  const { id } = await params

  const { searchParams } = new URL(request.url)
  const ruleId = searchParams.get('ruleId')
  if (!ruleId) return NextResponse.json({ error: 'ruleId required' }, { status: 400 })

  const { error } = await supabase
    .from('bonus_point_rules')
    .delete()
    .eq('id', ruleId)
    .eq('enterprise_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH /api/admin/enterprises/[id]/rules?ruleId=xxx — 규칙 수정
export async function PATCH(request: Request, { params }: Params) {
  const auth = await checkAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { supabase } = auth
  const { id } = await params

  const { searchParams } = new URL(request.url)
  const ruleId = searchParams.get('ruleId')
  if (!ruleId) return NextResponse.json({ error: 'ruleId required' }, { status: 400 })

  const body = await request.json()
  const parsed = ruleSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await supabase
    .from('bonus_point_rules')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', ruleId)
    .eq('enterprise_id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rule: data })
}
