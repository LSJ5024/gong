# CLAUDE.md — 공기업 가산점 맞춤 추천 서비스

## 프로젝트 개요

사용자의 자격증·어학성적·전공을 입력하면 전국 공기업 가산점 DB를 분석해 합격 가능성이 높은 공기업을 순위별로 추천하는 웹서비스.

- **PRD**: `prd.md`
- **태스크 목록**: `task.md`
- **현재 단계**: Phase 1 — MVP

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| 백엔드 | Next.js API Routes (서버리스) |
| 데이터베이스 | Supabase (PostgreSQL) |
| 인증 | Supabase Auth (이메일, 카카오, 네이버, 구글 OAuth) |
| 캐싱 | Next.js ISR + Supabase Edge Functions |
| 배포 | Vercel |
| 크롤링 | Python (Scrapy / BeautifulSoup) + Supabase REST API |
| 알림 | Supabase Edge Functions + Resend |
| 파일 스토리지 | Supabase Storage |

---

## 디렉토리 구조

```
/
├── app/                        # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/
│   │   ├── page.tsx            # 랜딩 페이지
│   │   ├── profile/
│   │   │   └── setup/          # 프로필 등록 마법사 (Step 1~4)
│   │   ├── recommendations/    # 추천 결과 페이지
│   │   │   └── [enterpriseId]/ # 기업별 가산점 상세
│   │   └── mypage/             # 마이페이지
│   └── api/
│       ├── profiles/
│       ├── recommendations/
│       ├── enterprises/
│       └── bookmarks/
├── components/
│   ├── ui/                     # 범용 UI 컴포넌트
│   ├── profile/                # 프로필 등록 관련 컴포넌트
│   ├── recommendations/        # 추천 결과 관련 컴포넌트
│   └── layout/                 # 헤더, 푸터, 네비게이션
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # 브라우저용 Supabase 클라이언트
│   │   ├── server.ts           # 서버용 Supabase 클라이언트
│   │   └── middleware.ts       # 인증 미들웨어
│   ├── matching/
│   │   └── engine.ts           # 가산점 매칭 로직
│   └── utils/
│       └── language-expiry.ts  # 어학성적 유효기간 계산
├── types/
│   └── index.ts                # 공통 TypeScript 타입
├── supabase/
│   ├── migrations/             # DB 마이그레이션 파일
│   └── seed/                   # 초기 데이터 (공기업 100개)
└── crawler/                    # Python 크롤러 (별도 모듈)
    ├── spiders/
    └── pipelines/
```

---

## 데이터베이스 스키마

### 핵심 테이블

```sql
-- 사용자
users (user_id, email, name, created_at, last_login)

-- 프로필 (사용자당 최대 3개)
profiles (
  profile_id, user_id, profile_name,
  education_level,        -- 고졸|전문학사|학사|석사|박사
  major_category,         -- 이공계|상경계|인문사회계|사범계|예체능
  major_detail,           -- 전기전자|기계|컴퓨터공학|경영 등
  school_region,          -- 지방대 여부 판별용
  is_veterans,            -- 보훈 (암호화)
  is_disabled,            -- 장애인 (암호화)
  is_local_talent         -- 지역인재
)

-- 사용자 보유 자격증
user_certificates (id, profile_id, certificate_id, acquired_date, grade)

-- 사용자 어학성적
user_language_scores (
  id, profile_id,
  exam_type,    -- TOEIC|TOEIC_SPEAKING|OPIC|TOEFL|IELTS|JPT|JLPT|HSK|OTHER
  score, grade, acquired_date, expiry_date
)

-- 공기업 마스터
public_enterprises (
  enterprise_id, name,
  type,         -- 공기업|준정부기관|기타공공기관
  ministry, location, last_updated
)

-- 가산점 기준
bonus_point_rules (
  rule_id, enterprise_id,
  category,     -- 자격증|어학|전공|보훈|장애|지역인재
  item_id, condition_detail,
  bonus_point_percentage,
  source_url, updated_at
)
```

### RLS 정책 원칙
- `profiles`, `user_certificates`, `user_language_scores`: 본인 데이터만 CRUD 가능
- `public_enterprises`, `bonus_point_rules`: 모든 인증 사용자 READ 가능, 관리자만 WRITE
- `is_veterans`, `is_disabled` 컬럼: 별도 암호화 필드로 관리

---

## 핵심 비즈니스 로직

### 가산점 매칭 엔진 (`lib/matching/engine.ts`)

매칭 순서:
1. 사용자 프로필의 자격증·어학·전공 항목을 `bonus_point_rules`와 1:1 매핑
2. 항목별 가산점을 합산해 기업별 **총 예상 가산점** 산출
3. 보훈/장애/지역인재 가점을 별도 합산
4. 총점 내림차순 정렬 → 상위 20개 반환
5. 응답 시간 목표: **3초 이내** (캐싱 필수)

### 어학성적 유효기간 (`lib/utils/language-expiry.ts`)

| 시험 | 유효기간 |
|------|---------|
| TOEIC / TOEIC Speaking | 2년 |
| OPIc | 2년 |
| TOEFL | 2년 |
| IELTS | 2년 |
| JPT | 2년 |
| JLPT | 무기한 |
| HSK | 무기한 |

만료된 성적은 매칭 점수 계산에서 제외.

### 갭 분석 (Phase 2)

현재 프로필 기준으로 각 어학/자격증 등급을 한 단계 올렸을 때 상승하는 가산점을 기업별로 계산해 표시.

---

## 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OAuth
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# Resend (이메일 알림)
RESEND_API_KEY=

# 환경 구분
NEXT_PUBLIC_APP_ENV=development|staging|production
```

---

## 주요 명령어

```bash
# 개발 서버
npm run dev

# Supabase 로컬 실행
supabase start
supabase stop

# DB 마이그레이션 생성
supabase migration new <migration_name>

# DB 마이그레이션 적용
supabase db push

# 타입 생성 (Supabase → TypeScript)
supabase gen types typescript --local > types/supabase.ts

# 빌드
npm run build

# 린트
npm run lint
```

---

## 개발 규칙

### 코드 스타일
- TypeScript strict 모드 사용
- `any` 타입 사용 금지 — Supabase 자동 생성 타입(`types/supabase.ts`) 활용
- 서버 컴포넌트에서는 `lib/supabase/server.ts`, 클라이언트 컴포넌트에서는 `lib/supabase/client.ts` 사용
- API Route는 `app/api/` 하위에 위치, 응답은 `NextResponse.json()` 사용

### 보안 필수 사항
- 보훈·장애 정보는 DB에 암호화 저장, 로그에 절대 출력 금지
- 모든 API Route에서 Supabase 세션 검증 후 처리
- SQL은 Supabase 클라이언트 메서드(`.select()`, `.insert()` 등)만 사용 — raw SQL 문자열 조합 금지
- 사용자 입력값은 API Route 진입 시 zod로 검증

### 성능
- 추천 결과 API는 반드시 캐싱 적용 (Next.js `revalidate` 또는 Supabase Edge Function 캐시)
- 공기업 목록 등 정적성이 높은 데이터는 ISR로 처리
- DB 쿼리는 필요한 컬럼만 select — `select('*')` 지양

### UI/UX
- 모바일 퍼스트 — Tailwind의 `sm:` 기준으로 반응형 작성
- 가산점 정보 표시 시 항상 **마지막 업데이트 일자**와 **출처 링크** 함께 표시
- 추천 결과 하단에 면책 고지 문구 고정 표시

---

## Phase 1 MVP 완성 기준

- [ ] 프로필 등록 후 5분 이내에 추천 결과 확인 가능
- [ ] 전국 주요 공기업 100개 이상 가산점 데이터 반영
- [ ] 각 추천 결과에 항목별 가산점 상세 내역과 출처 표시
- [ ] 모바일에서 정상 동작

---

## 참고 데이터 소스

- **알리오** (공공기관 경영정보 공개시스템): 공기업 목록 및 기본 정보
- **나라일터**: 공공기관 채용 공고
- **각 기관 채용공고 페이지**: 가산점 세부 기준
- **한국산업인력공단 자격 목록**: 자격증 검색 자동완성용 마스터 데이터
