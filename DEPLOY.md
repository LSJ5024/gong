# 배포 가이드 — Vercel + Supabase

## 1. Supabase 프로젝트 설정

### 1-1. 프로젝트 생성
1. [https://supabase.com](https://supabase.com) 접속 → 새 프로젝트 생성
2. 프로젝트 이름, DB 비밀번호, 지역(Northeast Asia / Seoul) 선택

### 1-2. 환경 변수 수집
Supabase 대시보드 → **Settings → API** 에서 확인:
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon / public key
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key (⚠️ 절대 공개 금지)

### 1-3. DB 마이그레이션 적용
```bash
# Supabase CLI 설치 (최초 1회)
npm install -g supabase

# 로컬 Supabase 초기화 (선택, 로컬 개발용)
supabase init
supabase start

# 원격 프로젝트에 마이그레이션 적용
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push

# 시드 데이터 적재
supabase db reset  # 또는 Supabase SQL Editor에서 seed 파일 직접 실행
```

또는 Supabase 대시보드 **SQL Editor**에서 직접 실행:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/seed/enterprises.sql`

### 1-4. OAuth 공급자 설정
Supabase 대시보드 → **Authentication → Providers**:

| 공급자 | 필요 설정 |
|--------|-----------|
| **Google** | Google Cloud Console에서 OAuth 2.0 클라이언트 생성 → Client ID, Client Secret 입력 |
| **Kakao** | Kakao Developers에서 앱 생성 → REST API 키, Client Secret 입력 |

Redirect URL: `https://<YOUR_SUPABASE_PROJECT>.supabase.co/auth/v1/callback`

### 1-5. TypeScript 타입 재생성
```bash
supabase gen types typescript --project-id <YOUR_PROJECT_REF> > types/supabase.ts
```

---

## 2. Vercel 배포 설정

### 2-1. Vercel 프로젝트 생성
1. [https://vercel.com](https://vercel.com) → **New Project**
2. GitHub 레포 `LSJ5024/gong` Import
3. Framework Preset: **Next.js** (자동 감지)
4. Build Command: `npm run build` (기본값)
5. Output Directory: `.next` (기본값)

### 2-2. 환경 변수 설정
Vercel 대시보드 → **Settings → Environment Variables**에서 아래 항목 추가:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OAuth (카카오)
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

# OAuth (네이버, Phase 2)
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# 이메일 알림 (Phase 2)
RESEND_API_KEY=

# 환경 구분
NEXT_PUBLIC_APP_ENV=production
```

> **Tip**: `NEXT_PUBLIC_` 접두사가 붙은 변수는 브라우저에서 노출됩니다. 민감한 키는 반드시 접두사 없이 설정하세요.

### 2-3. Supabase Auth Redirect URL 등록
Supabase 대시보드 → **Authentication → URL Configuration**:
- **Site URL**: `https://<your-vercel-domain>.vercel.app`
- **Redirect URLs** 추가: `https://<your-vercel-domain>.vercel.app/**`

### 2-4. 배포 트리거
```bash
# main 브랜치 push 시 자동 배포
git push origin master
```

---

## 3. 로컬 개발 환경 설정

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.local.example .env.local
# .env.local에 실제 값 입력

# 3. 개발 서버 실행
npm run dev

# 4. (선택) 로컬 Supabase 실행
supabase start
# → http://localhost:54323 에서 Supabase Studio 접근 가능
```

---

## 4. 배포 전 최종 체크리스트

- [ ] `.env.local` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] Supabase 마이그레이션 + 시드 데이터 적재 완료
- [ ] Google / Kakao OAuth Redirect URL 등록 완료
- [ ] Vercel 환경 변수 전체 입력 완료
- [ ] `npm run build` 로컬 빌드 성공 확인
- [ ] 프로덕션 배포 후 회원가입 → 프로필 등록 → 추천 확인 E2E 테스트

---

## 5. 도메인 연결 (선택)

Vercel 대시보드 → **Settings → Domains**:
1. 커스텀 도메인 추가 (예: `gong.example.com`)
2. DNS 레코드 설정 (CNAME 또는 A 레코드)
3. Supabase Auth **Site URL** 및 **Redirect URLs** 업데이트
