-- 사용자 신고 테이블 (T-104: 잘못된 가산점 정보 제보)

CREATE TABLE IF NOT EXISTS reports (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  enterprise_id uuid        NOT NULL REFERENCES public_enterprises(id) ON DELETE CASCADE,
  rule_id       uuid        REFERENCES bonus_point_rules(id) ON DELETE SET NULL,
  report_type   text        NOT NULL,
  description   text        NOT NULL,
  status        text        NOT NULL DEFAULT 'pending',
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT reports_type_check    CHECK (report_type IN ('incorrect_info', 'outdated', 'missing_rule', 'other')),
  CONSTRAINT reports_desc_length   CHECK (char_length(description) BETWEEN 10 AND 500),
  CONSTRAINT reports_status_check  CHECK (status IN ('pending', 'reviewed', 'resolved'))
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 본인 신고 제출 가능
CREATE POLICY "auth_insert_reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 본인 신고 내역만 조회 가능
CREATE POLICY "auth_select_own_reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS reports_enterprise_id_idx ON reports (enterprise_id);
CREATE INDEX IF NOT EXISTS reports_status_idx        ON reports (status);
CREATE INDEX IF NOT EXISTS reports_user_id_idx       ON reports (user_id);

COMMENT ON TABLE  reports              IS '사용자 가산점 정보 신고';
COMMENT ON COLUMN reports.report_type  IS 'incorrect_info|outdated|missing_rule|other';
COMMENT ON COLUMN reports.status       IS 'pending|reviewed|resolved';
