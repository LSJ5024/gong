/**
 * 어드민 권한 확인 유틸리티
 * DB의 admins 테이블을 기준으로 확인합니다.
 * ADMIN_EMAILS 환경변수는 초기 부트스트랩용으로만 사용됩니다.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Client = SupabaseClient<Database>

/**
 * 현재 로그인한 사용자가 어드민인지 확인합니다.
 * DB admins 테이블 우선 → 없으면 ADMIN_EMAILS 환경변수 fallback
 */
export async function isAdmin(supabase: Client): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // 1차: DB admins 테이블 확인
  const { data } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (data) return true

  // 2차: 환경변수 fallback (초기 부트스트랩 단계용)
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  return adminEmails.includes(user.email ?? '')
}

/**
 * 어드민 확인 후 user 객체 반환. 비어드민이면 null 반환.
 * API Route에서 사용합니다.
 */
export async function requireAdmin(supabase: Client) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const ok = await isAdmin(supabase)
  return ok ? user : null
}
