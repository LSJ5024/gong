import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateGapAnalysis } from '@/lib/matching/gap-analysis'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  let profileId = searchParams.get('profileId')

  if (!profileId) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    const first = profiles?.[0] as { id: string } | undefined
    if (!first) return NextResponse.json({ error: 'No profile found' }, { status: 404 })
    profileId = first.id
  }

  const gaps = await calculateGapAnalysis(supabase, profileId)
  return NextResponse.json({ gaps }, {
    headers: { 'Cache-Control': 'private, max-age=300' },
  })
}
