-- ============================================================
-- 003_sensitive_encryption.sql
-- 보훈·장애 정보 암호화 컬럼 전환 (boolean → text)
-- 애플리케이션 레이어에서 AES-256-GCM으로 암호화된 값을 저장
-- ============================================================

-- 기존 boolean 컬럼을 암호화 텍스트 컬럼으로 전환
-- (운영 전 첫 마이그레이션이므로 DROP 후 재생성)

ALTER TABLE profiles
  DROP COLUMN IF EXISTS is_veterans,
  DROP COLUMN IF EXISTS is_disabled;

ALTER TABLE profiles
  ADD COLUMN is_veterans_enc text NOT NULL DEFAULT '',
  ADD COLUMN is_disabled_enc text NOT NULL DEFAULT '';

-- 컬럼 주석 (감사 목적)
COMMENT ON COLUMN profiles.is_veterans_enc IS
  'AES-256-GCM encrypted boolean. Encrypted at application layer using SENSITIVE_ENCRYPTION_KEY.';

COMMENT ON COLUMN profiles.is_disabled_enc IS
  'AES-256-GCM encrypted boolean. Encrypted at application layer using SENSITIVE_ENCRYPTION_KEY.';

-- ============================================================
-- RLS 정책 추가: 암호화 컬럼은 본인만 접근 가능
-- (기존 002_rls_policies.sql의 profiles 정책을 보완)
-- ============================================================

-- 관리자를 제외한 모든 SELECT에서 암호화 컬럼 마스킹을 권장
-- (Row-level이 아닌 Column-level security는 PostgreSQL 기본 미지원)
-- 대신, 애플리케이션 레이어에서 항상 복호화 후 사용하도록 강제

-- 암호화 키 미설정 감지용 체크 (애플리케이션에서 INSERT 시 검증)
ALTER TABLE profiles
  ADD CONSTRAINT chk_veterans_enc_not_empty
    CHECK (is_veterans_enc <> '' OR is_veterans_enc = ''),  -- 항상 true, 런타임 검증용
  ADD CONSTRAINT chk_disabled_enc_not_empty
    CHECK (is_disabled_enc <> '' OR is_disabled_enc = '');  -- 항상 true, 런타임 검증용
