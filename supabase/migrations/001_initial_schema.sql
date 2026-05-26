-- ============================================================
-- 001_initial_schema.sql
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUM 타입
-- ============================================================
create type education_level as enum ('고졸', '전문학사', '학사', '석사', '박사');
create type major_category as enum ('이공계', '상경계', '인문사회계', '사범계', '예체능', '기타');
create type enterprise_type as enum ('공기업', '준정부기관', '기타공공기관');
create type bonus_category as enum ('자격증', '어학', '전공', '보훈', '장애', '지역인재', '기타');
create type exam_type as enum (
  'TOEIC', 'TOEIC_SPEAKING', 'OPIC',
  'TOEFL', 'IELTS', 'JPT', 'JLPT', 'HSK', 'OTHER'
);

-- ============================================================
-- 자격증 마스터
-- ============================================================
create table certificates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  issuer      text not null,            -- 한국산업인력공단, 대한상공회의소 등
  category    text not null,            -- 국가기술자격, 국가전문자격 등
  grade       text,                     -- 기사, 산업기사, 기능사 등
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 공기업 마스터
-- ============================================================
create table public_enterprises (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         enterprise_type not null,
  ministry     text,                   -- 주무부처
  location     text,                   -- 본사 소재지
  website_url  text,
  last_updated timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 가산점 기준
-- ============================================================
create table bonus_point_rules (
  id                      uuid primary key default gen_random_uuid(),
  enterprise_id           uuid not null references public_enterprises(id) on delete cascade,
  category                bonus_category not null,
  item_id                 uuid,                 -- certificates.id 또는 null
  condition_detail        text not null,        -- "TOEIC 900점 이상", "전기기사" 등 상세 조건
  bonus_point_percentage  numeric(5,2) not null,
  source_url              text,
  updated_at              timestamptz not null default now(),
  created_at              timestamptz not null default now()
);

create index idx_bonus_rules_enterprise on bonus_point_rules(enterprise_id);
create index idx_bonus_rules_category on bonus_point_rules(category);

-- ============================================================
-- 사용자 프로필
-- ============================================================
create table profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  profile_name      text not null default '기본 프로필',
  education_level   education_level,
  major_category    major_category,
  major_detail      text,
  school_name       text,
  school_region     text,              -- 시/도 단위
  gpa               numeric(4,2),
  double_major      text,
  -- 민감 정보 (암호화)
  is_veterans       boolean not null default false,
  is_disabled       boolean not null default false,
  is_local_talent   boolean not null default false,
  is_non_capital    boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint max_profiles_per_user check (true)  -- 앱 레이어에서 3개 제한
);

create index idx_profiles_user on profiles(user_id);

-- ============================================================
-- 사용자 보유 자격증
-- ============================================================
create table user_certificates (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  certificate_id uuid not null references certificates(id),
  acquired_date  date not null,
  grade          text,
  created_at     timestamptz not null default now()
);

create index idx_user_certs_profile on user_certificates(profile_id);

-- ============================================================
-- 사용자 어학성적
-- ============================================================
create table user_language_scores (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  exam_type     exam_type not null,
  score         integer,
  grade         text,                  -- OPIc IM1, JLPT N1 등 등급형
  acquired_date date not null,
  expiry_date   date,                  -- null = 무기한
  created_at    timestamptz not null default now()
);

create index idx_lang_scores_profile on user_language_scores(profile_id);

-- ============================================================
-- 관심 기업 북마크
-- ============================================================
create table bookmarks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  enterprise_id uuid not null references public_enterprises(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (user_id, enterprise_id)
);

create index idx_bookmarks_user on bookmarks(user_id);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger trg_bonus_rules_updated_at
  before update on bonus_point_rules
  for each row execute function update_updated_at();
