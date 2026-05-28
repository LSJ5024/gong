import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bookmarkSchema = z.object({
  enterprise_id: z.string().min(1),
})

// GET /api/bookmarks — 북마크 목록 (기업 정보 포함)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('bookmarks')
    .select('id, enterprise_id, created_at, public_enterprises(id, name, type, ministry, location, website_url, last_updated)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bookmarks: data })
}

// POST /api/bookmarks — 북마크 추가
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = bookmarkSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await supabase
    .from('bookmarks')
    .insert({ user_id: user.id, enterprise_id: parsed.data.enterprise_id })
    .select('id, enterprise_id')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already bookmarked' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ bookmark: data }, { status: 201 })
}

// DELETE /api/bookmarks?enterpriseId=xxx — 북마크 삭제
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const enterpriseId = searchParams.get('enterpriseId')
  if (!enterpriseId) return NextResponse.json({ error: 'enterpriseId required' }, { status: 400 })

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', user.id)
    .eq('enterprise_id', enterpriseId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
