import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateRecommendations } from '@/lib/matching/engine'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // profileId 미지정 시 첫 번째 프로필 사용
  let resolvedProfileId = profileId
  if (!resolvedProfileId) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    const profile = profiles?.[0] as { id: string } | undefined
    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 404 })
    }
    resolvedProfileId = profile.id
  }

  const results = await calculateRecommendations(supabase, resolvedProfileId)
  return NextResponse.json({ results, profile_id: resolvedProfileId }, {
    headers: { 'Cache-Control': 'private, max-age=300' },
  })
}
