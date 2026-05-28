/**
 * DELETE /api/account — 회원 탈퇴
 * 순서: 1) 암호화된 민감정보 삭제 2) 프로필/북마크 삭제 (cascade) 3) Auth 유저 삭제
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Service Role 클라이언트 (auth.admin.deleteUser 권한 필요)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1) 프로필 삭제 (cascade로 user_certificates, user_language_scores, bookmarks, reports 자동 삭제)
  const { error: profileError } = await serviceClient
    .from('profiles')
    .delete()
    .eq('user_id', user.id)

  if (profileError) {
    return NextResponse.json({ error: '탈퇴 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }

  // 2) admins 테이블에서도 제거 (어드민이었을 경우)
  await serviceClient.from('admins').delete().eq('user_id', user.id)

  // 3) Auth 유저 삭제 (복구 불가)
  const { error: authError } = await serviceClient.auth.admin.deleteUser(user.id)
  if (authError) {
    return NextResponse.json({ error: '계정 삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
