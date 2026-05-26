-- ============================================================
-- 002_rls_policies.sql — Row Level Security 정책
-- ============================================================

alter table profiles             enable row level security;
alter table user_certificates    enable row level security;
alter table user_language_scores enable row level security;
alter table bookmarks            enable row level security;
alter table public_enterprises   enable row level security;
alter table bonus_point_rules    enable row level security;
alter table certificates         enable row level security;

-- ----------------------------------------
-- profiles: 본인 데이터만 접근
-- ----------------------------------------
create policy "profiles: 본인 조회" on profiles
  for select using (auth.uid() = user_id);

create policy "profiles: 본인 생성" on profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles: 본인 수정" on profiles
  for update using (auth.uid() = user_id);

create policy "profiles: 본인 삭제" on profiles
  for delete using (auth.uid() = user_id);

-- ----------------------------------------
-- user_certificates: profile 소유자만 접근
-- ----------------------------------------
create policy "user_certificates: 본인 조회" on user_certificates
  for select using (
    exists (select 1 from profiles where id = profile_id and user_id = auth.uid())
  );

create policy "user_certificates: 본인 생성" on user_certificates
  for insert with check (
    exists (select 1 from profiles where id = profile_id and user_id = auth.uid())
  );

create policy "user_certificates: 본인 수정" on user_certificates
  for update using (
    exists (select 1 from profiles where id = profile_id and user_id = auth.uid())
  );

create policy "user_certificates: 본인 삭제" on user_certificates
  for delete using (
    exists (select 1 from profiles where id = profile_id and user_id = auth.uid())
  );

-- ----------------------------------------
-- user_language_scores: profile 소유자만 접근
-- ----------------------------------------
create policy "user_language_scores: 본인 조회" on user_language_scores
  for select using (
    exists (select 1 from profiles where id = profile_id and user_id = auth.uid())
  );

create policy "user_language_scores: 본인 생성" on user_language_scores
  for insert with check (
    exists (select 1 from profiles where id = profile_id and user_id = auth.uid())
  );

create policy "user_language_scores: 본인 수정" on user_language_scores
  for update using (
    exists (select 1 from profiles where id = profile_id and user_id = auth.uid())
  );

create policy "user_language_scores: 본인 삭제" on user_language_scores
  for delete using (
    exists (select 1 from profiles where id = profile_id and user_id = auth.uid())
  );

-- ----------------------------------------
-- bookmarks: 본인 데이터만 접근
-- ----------------------------------------
create policy "bookmarks: 본인 조회" on bookmarks
  for select using (auth.uid() = user_id);

create policy "bookmarks: 본인 생성" on bookmarks
  for insert with check (auth.uid() = user_id);

create policy "bookmarks: 본인 삭제" on bookmarks
  for delete using (auth.uid() = user_id);

-- ----------------------------------------
-- 공기업/가산점/자격증 마스터: 인증 사용자 읽기, 관리자만 쓰기
-- ----------------------------------------
create policy "public_enterprises: 인증 사용자 조회" on public_enterprises
  for select using (auth.role() = 'authenticated');

create policy "bonus_point_rules: 인증 사용자 조회" on bonus_point_rules
  for select using (auth.role() = 'authenticated');

create policy "certificates: 인증 사용자 조회" on certificates
  for select using (auth.role() = 'authenticated');
