/**
 * POST /api/admin/setup
 * 최초 어드민 계정 등록용 엔드포인트
 *
 * 동작 조건:
 *   1. ADMIN_SETUP_TOKEN 환경변수와 요청의 token이 일치해야 함
 *   2. admins 테이블에 아무도 없을 때(0명)만 실행 가능 — 이후 자동 비활성화
 *
 * 사용법:
 *   curl -X POST https://your-site/api/admin/setup \
 *     -H "Content-Type: application/json" \
 *     -d '{"token":"YOUR_SETUP_TOKEN","email":"admin@example.com"}'
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const setupToken = process.env.ADMIN_SETUP_TOKEN
  if (!setupToken) {
    return NextResponse.json(
      { error: 'ADMIN_SETUP_TOKEN 환경변수가 설정되지 않았습니다.' },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { token, email } = body as { token?: string; email?: string }

  // 토큰 검증
  if (!token || token !== setupToken) {
    return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
  }
  if (!email) {
    return NextResponse.json({ error: 'email 필드가 필요합니다.' }, { status: 400 })
  }

  // Service Role 클라이언트 (auth.users 조회용)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 이미 어드민이 존재하면 거부 (보안: 재실행 방지)
  const { count } = await serviceClient
    .from('admins')
    .select('*', { count: 'exact', head: true })

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: '이미 어드민이 존재합니다. 이 엔드포인트는 최초 1회만 사용 가능합니다.' },
      { status: 409 }
    )
  }

  // 이메일로 user_id 조회
  const { data: users, error: userError } = await serviceClient.auth.admin.listUsers()
  if (userError) {
    return NextResponse.json({ error: '사용자 목록 조회 실패' }, { status: 500 })
  }

  const targetUser = users.users.find((u) => u.email === email)
  if (!targetUser) {
    return NextResponse.json(
      { error: `이메일(${email})로 가입된 계정을 찾을 수 없습니다. 먼저 해당 이메일로 회원가입해주세요.` },
      { status: 404 }
    )
  }

  // admins 테이블에 등록
  const { error: insertError } = await serviceClient
    .from('admins')
    .insert({ user_id: targetUser.id, memo: '초기 어드민 (setup API로 등록)' })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `${email} 계정이 어드민으로 등록되었습니다.`,
    user_id: targetUser.id,
  })
}
