import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const profileUpdateSchema = z.object({
  profile_name: z.string().min(1).max(50).optional(),
  education_level: z.enum(['고졸', '전문학사', '학사', '석사', '박사']).nullable().optional(),
  major_category: z.enum(['이공계', '상경계', '인문사회계', '사범계', '예체능', '기타']).nullable().optional(),
  major_detail: z.string().max(100).nullable().optional(),
  school_name: z.string().max(100).nullable().optional(),
  school_region: z.string().max(50).nullable().optional(),
  gpa: z.number().min(0).max(4.5).nullable().optional(),
  double_major: z.string().max(100).nullable().optional(),
  is_veterans: z.boolean().optional(),
  is_disabled: z.boolean().optional(),
  is_local_talent: z.boolean().optional(),
  is_non_capital: z.boolean().optional(),
})

// GET /api/profiles — 현재 유저의 프로필 목록 조회
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, profile_name, education_level, major_category, major_detail, school_name, school_region, gpa, double_major, is_veterans, is_disabled, is_local_talent, is_non_capital, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profiles })
}

// PUT /api/profiles?profileId=xxx — 특정 프로필 수정
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  const body = await request.json()
  const parsed = profileUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', profileId)
    .eq('user_id', user.id)
    .select('id, profile_name, education_level, major_category, major_detail, school_name, school_region, gpa, double_major, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
