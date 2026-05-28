-- ============================================================
-- 005_admins_table.sql
-- 어드민 계정 관리 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS admins (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  memo      TEXT,                          -- 어드민 메모 (용도 구분용)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS 활성화
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- 본인이 어드민인지 확인 (SELECT만 허용, 자기 row만)
CREATE POLICY "admins_self_select"
  ON admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT / DELETE / UPDATE 는 service_role 전용 (자기 자신을 어드민으로 등록 불가)
-- → Supabase 대시보드 또는 /api/admin/setup 초기 설정 API로만 등록

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);
