# Task: 공기업 가산점 맞춤 추천 서비스

**기준 PRD:** prd.md v1.0
**작성일:** 2026-05-26
**최종 업데이트:** 2026-05-29

---

## Phase 1 — MVP ✅ 완료

### 1. 프로젝트 초기 설정

- [x] **T-001** Next.js 16 + TypeScript + Tailwind CSS 프로젝트 생성
- [ ] **T-002** Supabase 프로젝트 생성 및 로컬 CLI 환경 설정 (`supabase start`) ← **사용자 직접**
- [ ] **T-003** Vercel 프로젝트 연결 및 환경 변수 설정 ← **배포 시**
- [x] **T-004** ESLint 설정 (create-next-app 기본 제공)
- [ ] **T-005** GitHub 레포 생성 및 Vercel CI/CD 파이프라인 연결 ← **배포 시**

---

### 2. 데이터베이스 스키마 설계 및 마이그레이션

- [x] **T-010~018** 전체 테이블 스키마 + RLS 정책 SQL 작성 완료
  - `supabase/migrations/001_initial_schema.sql`
  - `supabase/migrations/002_rls_policies.sql`
  - `supabase/migrations/004_reports_table.sql` — 신고 테이블 추가

---

### 3. 인증 (Auth)

- [x] **T-020** Supabase Auth 이메일 회원가입 / 로그인
- [x] **T-021** 카카오 OAuth (Supabase 대시보드에서 공급자 활성화 필요)
- [ ] **T-022** 네이버 OAuth (Supabase 미지원, 커스텀 구현 필요)
- [x] **T-023** 구글 OAuth
- [x] **T-024** 인증 미들웨어 + 보호 라우트 (`proxy.ts`)
- [x] **T-025** 로그아웃 처리

---

### 4. 프로필 등록 마법사 (UI + API)

- [x] **T-030~038** 프로필 등록 마법사 Step 1~4 전체 구현
  - `app/(main)/profile/setup/page.tsx`
  - 어학 유효기간 자동 계산 (`lib/utils/language-expiry.ts`)

---

### 5. 공기업 가산점 DB 구축

- [x] **T-040** 주요 공기업 20개 시드 데이터 작성 (`supabase/seed/enterprises.sql`)
- [x] **T-040-b** 공기업 21~50번 시드 데이터 추가 (`supabase/seed/enterprises_extended.sql`)
- [ ] **T-040-c** 나머지 50개 이상 추가 입력 ← **데이터 작업 / 크롤러 완성 후**

---

### 6. 가산점 매칭 및 추천 엔진

- [x] **T-050~055** 매칭 엔진 전체 구현 (`lib/matching/engine.ts`)
  - 자격증·어학·전공·보훈·장애·지역인재 매칭
  - 추천 결과 API (`GET /api/recommendations`, 캐싱 적용)
- [x] **T-055-b** 어학 중복 매칭 제거 — 동일 시험 내 최고 등급 규칙 1개만 집계
  - `detectLangExamType()` 함수로 시험 종류 구분
  - `langBest` Map으로 중복 제거 후 가산점 합산
- [x] **T-055-c** 자격증 오매칭 방지 — 정확한 이름 일치(exact/prefix)만 허용
  - "전기기사" 조건이 "전기산업기사" 자격증에 매칭되는 버그 수정

---

### 7. 추천 결과 페이지 + 기업 상세

- [x] **T-060~063** 추천 목록, 기업 상세, 면책 고지, 업데이트 일자

---

### 8. 랜딩 페이지

- [x] **T-070~071** 서비스 소개 랜딩 페이지 + 모바일 반응형

---

## Phase 2 — 고도화 (진행 중)

### 9. 갭 분석 기능

- [x] **T-080** 갭 분석 엔진 구현 (`lib/matching/gap-analysis.ts`)
  - TOEIC / OPIc / TOEIC Speaking 한 단계 상승 시 가산점 변화 계산
- [x] **T-081** 기업 상세 페이지 하단 갭 분석 UI 표시
- [x] **T-082** 갭 분석 API (`GET /api/gap-analysis`)
- [x] **T-082-b** 자격증 갭 분석 추가 (기능사→산업기사→기사→기술사 등급 체계)

---

### 10. 필터 / 정렬 / 북마크

- [x] **T-090** 기업 유형·지역 필터 구현
- [x] **T-091** 정렬 옵션 (가산점 높은 순 / 매칭 항목 많은 순)
- [x] **T-092** 북마크 API (`GET/POST/DELETE /api/bookmarks`) + 추천 목록 ★ 토글
  - Optimistic update + API 실패 시 롤백 처리
  - `e.stopPropagation()` 추가 (카드 링크 이동 방지)
  - Zod UUID 검증 문제(`z.string().uuid()` → `z.string().min(1)`) 수정
- [x] **T-092-b** 기업 상세 페이지 북마크 버튼 (`BookmarkButton.tsx`)
- [x] **T-093** 추천 결과 공유 링크 생성 (필터 URL 파라미터 동기화 + 클립보드 복사)

---

### 11. 글로벌 레이아웃 / 헤더

- [x] 헤더 컴포넌트 (인증 상태별, 로그아웃 버튼)
- [x] `(main)` 라우트 그룹 레이아웃
- [x] 네비게이션 중복 링크 버그 수정 (`Header.tsx` — 추천결과·마이페이지 각 2개씩 노출되던 문제)

---

### 12. 프로필 API

- [x] **T-036** `GET /api/profiles` — 프로필 목록 조회 (복호화 후 평문 boolean 반환)
- [x] **T-037** `PUT /api/profiles?profileId=` — 프로필 수정 (평문 boolean → AES 암호화 저장)
- [x] **T-037-b** `DELETE /api/profiles?profileId=` — 프로필 삭제

---

### 13. 마이페이지

- [x] **T-130** 마이페이지 레이아웃 (`/mypage`)
- [x] **T-131** 프로필 수정 인라인 에디터
- [x] **T-132** 관심 기업 목록 + 북마크 해제
- [x] **T-133** 알림 설정 관리 UI (마이페이지 알림 탭 + 토글 + localStorage 저장)
- [x] **T-134** 프로필 삭제 기능 (인라인 확인 UI + `DELETE /api/profiles`)
- [x] **T-135** 복수 프로필 비교 선택 UI (체크박스 + "비교하기" 버튼)

---

### 14. 복수 프로필 비교

- [x] **T-150** 복수 프로필 비교 페이지 (`/compare?p=id1&p=id2[&p=id3]`)
  - 최대 3개 프로필 나란히 비교
  - 기본 정보 카드 (학력·전공·학점·특이사항)
  - 상위 추천 기업 비교 테이블 — 프로필별 예상 가산점 + 카테고리 이모지
  - 모든 프로필 공통 추천 기업 하이라이트 (초록색 뱃지)
  - 데스크탑 테이블 / 모바일 카드 반응형
  - 기업 클릭 시 `[enterpriseId]` 상세 페이지 이동

---

### 15. 사용자 신고 기능

- [x] **T-104** 사용자 신고 기능
  - `supabase/migrations/004_reports_table.sql` — reports 테이블 + RLS
  - `POST /api/reports` — 신고 접수 API (Zod 검증, 로그인 필수)
  - `components/recommendations/ReportButton.tsx` — 신고 모달 클라이언트 컴포넌트
  - 신고 유형: 잘못된 정보 / 오래된 정보 / 누락된 규칙 / 기타

---

### 16. 보안 / 암호화

- [x] **T-201** 보훈·장애 정보 AES-256-GCM 암호화 저장
  - `lib/utils/sensitive-encrypt.ts` — `encryptProfileSensitiveFields` / `decryptProfileSensitiveFields`
  - DB 컬럼: `is_veterans_enc`, `is_disabled_enc` (암호화 문자열)
  - 서버 컴포넌트·API Route에서만 복호화, 클라이언트에는 평문 boolean만 전달
  - `SENSITIVE_ENCRYPTION_KEY` 환경 변수 (32바이트 hex)

---

### 17. DB 자동 크롤링 파이프라인

- [x] **T-100** Python 크롤러 설계 — 알리오 / 나라일터 / 기관 홈페이지 3단계 구조
- [x] **T-101** requests + BeautifulSoup 기반 크롤러 구현
  - `crawler/spiders/alio_spider.py` — 공공데이터포털 API로 기관 목록 수집 (API 키 없으면 fallback 40개)
  - `crawler/spiders/narajob_spider.py` — 나라일터 채용공고 + 개별 기관 홈페이지 수집
  - `crawler/parsers/bonus_parser.py` — 가산점 텍스트/테이블 파싱 (신뢰도 점수 포함)
- [x] **T-102** 파싱 결과 → Supabase 적재
  - `crawler/pipelines/supabase_pipeline.py` — upsert (safe/overwrite 모드)
  - `crawler/main.py` — CLI (`run` / `sync-enterprises` / `parse-text`)
- [x] **T-103** 분기별 자동 업데이트 스케줄러
  - `crawler/scheduler.py` — schedule 라이브러리 기반 (daily/weekly/monthly/quarterly)
  - `.github/workflows/crawl.yml` — GitHub Actions cron (1/4/7/10월 1일 KST 02:00)
- [ ] **T-103-b** 실제 크롤링 테스트 및 파서 정확도 개선 ← **실환경 검증 필요**
  - 공공데이터포털 API 키 발급 후 기관 목록 수집 확인
  - 나라일터 HTML 구조 변경 시 셀렉터 업데이트

---

### 18. 공기업 커버리지 확장

- [ ] **T-110** 공기업 100개 이상으로 확장 (크롤러 완성 후)
- [ ] **T-111** 신규 공기업 추가 시 데이터 검증 프로세스

---

### 19. 알림 기능

- [ ] **T-120** Supabase Edge Functions + Resend 연동
- [ ] **T-121** 관심 공기업 신규 채용 공고 알림
- [ ] **T-122** 어학성적 유효기간 만료 D-30/D-7 알림
- [ ] **T-123** 관심 기업 가산점 기준 DB 업데이트 알림
- [ ] **T-124** 마이페이지 알림 설정 ON/OFF UI ← 토글 UI만 완료, 실제 발송 미구현

---

### 20. 어드민 페이지

- [x] **T-160** 어드민 레이아웃 + 3단 접근 제어 (middleware → layout → API route)
  - `supabase/migrations/005_admins_table.sql` — admins 테이블 + RLS
  - `lib/utils/check-admin.ts` — DB 우선 + `ADMIN_EMAILS` env fallback
  - `POST /api/admin/setup` — 최초 어드민 등록 bootstrap 엔드포인트
- [x] **T-161** 대시보드 — 기업 수 / 규칙 수 / 미처리 신고 수 통계 카드
- [x] **T-162** 기업 관리 — 목록 조회 + 기업 추가 + 검색 (`/admin/enterprises`)
- [x] **T-163** 규칙 관리 — 카테고리·조건·가산점 인라인 CRUD (`/admin/enterprises/[id]`)
- [x] **T-164** 신고 관리 — 미처리/완료/무시 상태 관리 (`/admin/reports`)
- [x] **T-165** 어드민 API (`/api/admin/enterprises`, `/api/admin/enterprises/[id]/rules`, `/api/admin/reports`)

---

### 21. 검색 기능

- [x] **T-170** 추천 결과 페이지 기업명 / 주무부처 텍스트 검색
  - 검색어 URL 파라미터(`?q=`) 동기화
  - 검색어 실시간 필터링 + 결과 수 표시
  - 검색어 초기화 버튼 (✕)

---

### 22. 회원 탈퇴 / 계정 관리

- [x] **T-190** 회원 탈퇴 기능
  - `DELETE /api/account` — 프로필 cascade 삭제 → admins 제거 → auth 유저 삭제 (서비스롤)
  - 마이페이지 하단 탈퇴 섹션 — "탈퇴합니다" 입력 확인 후 삭제 실행
- [x] **T-191** 비밀번호 재설정
  - `/forgot-password` — 이메일 입력 → `resetPasswordForEmail` → 발송 완료 안내
  - `/reset-password` — `PASSWORD_RECOVERY` 이벤트 감지 → 새 비밀번호 입력 → `updateUser`
  - 로그인 페이지에 "비밀번호를 잊으셨나요?" 링크 추가

---

### 23. SEO 최적화

- [x] **T-180** 전역 메타태그 강화 (OG 태그, Twitter Card, keywords, robots)
- [x] **T-181** 기업 상세 페이지 `generateMetadata` — 동적 OG 태그
- [x] **T-182** `sitemap.ts` — 정적 페이지 + 기업 상세 페이지 자동 생성
- [x] **T-183** `robots.ts` — 어드민/API/마이페이지 크롤 차단
- [ ] **T-184** OG 이미지 (`/public/og-image.png`) 제작 ← **디자인 작업**

---

### 24. 에러 페이지

- [x] **T-185** 전역 404 페이지 (`app/not-found.tsx`)
- [x] **T-186** 전역 500 에러 바운더리 (`app/error.tsx`)
- [x] **T-187** (main) 그룹 404 페이지 (`app/(main)/not-found.tsx`) — 헤더/푸터 포함
- [x] **T-188** (main) 그룹 에러 바운더리 (`app/(main)/error.tsx`) — 다시 시도 버튼

---

### 25. 모바일 최적화

- [ ] **T-140** 전체 페이지 모바일 퍼스트 반응형 검수 ← **QA**
- [ ] **T-141** 웹 접근성 WCAG 2.1 AA 수준 점검 ← **QA**

---

## Phase 3 — 확장 (6~12개월)

- [ ] **T-151** 커뮤니티 / 합격 후기 게시판 구현
- [ ] **T-152** 목표 기업 역산 취업 준비 로드맵 추천 기능 구현
- [ ] **T-153** 프리미엄 구독 모델 설계 및 결제 연동 (심층 분석 리포트)
- [ ] **T-154** 기업 직접 제휴 채용 공고 연동 기능 구현

---

## 공통 / 비기능 태스크

- [ ] **T-200** HTTPS 전용 운영 설정 확인 (Vercel 기본 제공)
- [x] **T-201** 보훈·장애 정보 암호화 저장 — AES-256-GCM 구현 완료 (위 §16 참조)
- [ ] **T-202** 개인정보 처리방침 및 이용약관 작성 (면책 조항 포함)
- [ ] **T-203** 동시 접속 1,000명 처리 성능 테스트
- [ ] **T-204** Staging → Production 배포 체크리스트 작성

---

## 배포 전 필수 체크리스트

- [ ] Supabase 프로젝트 생성 후 `.env.local` 작성 (`.env.local.example` 참고)
- [ ] `supabase/migrations/` SQL 파일 전체 실행 (001 → 002 → 004 → **005** 순서)
  - 005: admins 테이블 추가
- [ ] `supabase/seed/enterprises.sql` 시드 데이터 적재
- [ ] `supabase/seed/enterprises_extended.sql` 시드 데이터 적재 (21~50번 기업)
- [ ] Supabase Auth 대시보드에서 카카오·구글 OAuth 공급자 활성화
- [ ] Supabase Auth 대시보드 > Email Templates > "Reset Password" 템플릿 확인
  - Redirect URL: `{SITE_URL}/reset-password`
- [ ] `SENSITIVE_ENCRYPTION_KEY` 환경 변수 설정 (32바이트 hex 랜덤값)
- [ ] `ADMIN_SETUP_TOKEN` 환경 변수 설정 후 첫 어드민 등록:
  ```
  curl -X POST {SITE_URL}/api/admin/setup \
    -H "Content-Type: application/json" \
    -d '{"token":"YOUR_SETUP_TOKEN","email":"admin@example.com"}'
  ```
  등록 후 `ADMIN_SETUP_TOKEN` 삭제 또는 변경
- [ ] `supabase gen types typescript --local > types/supabase.ts` 실행
- [ ] Vercel 환경 변수 동기화 후 프로덕션 배포

---

## 완료 현황 요약 (2026-05-29 기준)

| 구분 | 완료 | 미완료 |
|------|------|--------|
| Phase 1 MVP | ✅ 대부분 완료 | T-002, T-003, T-005 (환경/배포) |
| Phase 2 고도화 | ✅ 핵심 기능 완료 | 알림(T-120~123), 크롤러(T-100~103), 모바일검수 |
| 계정 관리 | ✅ 회원탈퇴·비밀번호재설정 완료 | — |
| 에러 페이지 | ✅ 404·500 전역·(main) 완료 | — |
| 어드민 | ✅ DB 기반 권한체계 + 전체 CRUD 완료 | — |
| SEO | ✅ 메타태그·sitemap·robots 완료 | OG 이미지(디자인) |
| Phase 3 확장 | 🔜 미착수 | — |
| 보안/암호화 | ✅ T-201 완료 | T-202 약관, T-203 성능테스트 |
| **다음 우선순위** | — | **배포 (T-003, T-005) → OG 이미지(T-184)** |
