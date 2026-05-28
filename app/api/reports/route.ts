import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const reportSchema = z.object({
  enterprise_id: z.string().min(1),
  rule_id: z.string().min(1).nullable().optional(),
  report_type: z.enum(['incorrect_info', 'outdated', 'missing_rule', 'other']),
  description: z.string().min(10, '10자 이상 입력해주세요.').max(500, '500자 이내로 입력해주세요.'),
})

// POST /api/reports — 가산점 정보 신고 제출
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = reportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { enterprise_id, rule_id, report_type, description } = parsed.data

  const { error } = await supabase.from('reports').insert({
    user_id: user.id,
    enterprise_id,
    rule_id: rule_id ?? null,
    report_type,
    description,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true }, { status: 201 })
}
