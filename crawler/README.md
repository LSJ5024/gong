# 공기업 가산점 크롤러

공공기관 채용공고에서 가산점 기준을 자동으로 수집해 Supabase DB에 저장하는 Python 크롤러입니다.

## 수집 대상

| 소스 | 수집 내용 |
|------|-----------|
| **공공데이터포털 API** | 공공기관 목록 (기관명, 유형, 주무부처, 소재지) |
| **나라일터 (nabul.go.kr)** | 기관별 채용공고 → 가산점 섹션 텍스트 / 테이블 |
| **각 기관 홈페이지** | 채용 페이지에서 가산점 정보 보조 수집 |

## 디렉토리 구조

```
crawler/
├── main.py                  # CLI 진입점
├── scheduler.py             # 분기별 자동 실행 스케줄러
├── config.py                # 환경 변수 로드 / 전역 설정
├── requirements.txt
├── .env.example             # 환경 변수 예시
├── spiders/
│   ├── alio_spider.py       # 공공기관 목록 수집
│   └── narajob_spider.py    # 채용공고 수집 (나라일터 + 기관 홈페이지)
├── parsers/
│   └── bonus_parser.py      # 가산점 텍스트/테이블 파싱
└── pipelines/
    └── supabase_pipeline.py # Supabase upsert
```

## 설치

```bash
cd crawler
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

## 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 열어 아래 값을 채워주세요
```

| 변수 | 필수 | 설명 |
|------|------|------|
| `SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service Role Key (RLS 우회용) |
| `DATA_GO_KR_API_KEY` | 권장 | 공공데이터포털 API 키 ([발급](https://data.go.kr)) |
| `CRAWL_DELAY_SECONDS` | - | 요청 간격 (기본 2초) |
| `CRAWL_MAX_ENTERPRISES` | - | 최대 수집 기관 수 (기본 200) |

> **공공데이터포털 API 키 발급**: https://data.go.kr 회원가입 → 마이페이지 → 활용신청
> API 키 없이도 내장 fallback 목록(40개)으로 동작합니다.

## 사용법

### 전체 실행

```bash
# 모든 공공기관 크롤링 + DB 저장
python main.py run

# DB 저장 없이 파싱 결과만 출력 (테스트용)
python main.py run --dry-run

# 특정 기관만 처리
python main.py run --enterprise "한국전력공사"

# 기존 규칙 삭제 후 재수집 (전체 갱신)
python main.py run --overwrite
```

### 기업 목록만 등록 (가산점 수집 없음)

```bash
python main.py sync-enterprises
python main.py sync-enterprises --dry-run  # 확인만
```

### 텍스트 파싱 테스트

```bash
# 직접 텍스트 입력
python main.py parse-text "TOEIC 700점 이상: 3%, 전기기사: 5%"

# 파일에서 읽기
python main.py parse-text ./sample_posting.txt
```

### 분기별 스케줄러

```bash
# 포어그라운드 실행 (분기마다 자동 실행)
python scheduler.py

# 즉시 1회 실행
python scheduler.py --once

# 주기 변경
python scheduler.py --interval weekly
```

## GitHub Actions 자동화

`.github/workflows/crawl.yml`을 사용해 분기별 자동 실행이 설정되어 있습니다.

Secrets에 아래 값을 등록하세요:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATA_GO_KR_API_KEY` (선택)

## 파싱 로직

가산점 텍스트는 두 가지 방식으로 파싱됩니다.

### 1. 텍스트 파싱
채용공고 본문에서 "가산점", "우대사항" 키워드 주변 텍스트를 추출 후 정규식으로 구조화합니다.

```
TOEIC 700점 이상: 3%          → category: 어학, condition: "TOEIC 700점 이상", bonus: 3.0
전기기사 보유자: 5%            → category: 자격증, condition: "전기기사", bonus: 5.0
취업지원대상자(보훈): 5~10%   → category: 보훈, condition: "취업지원대상자", bonus: 5.0
```

### 2. 테이블 파싱
HTML 테이블 형식의 가산점 데이터를 열(구분/조건/가산점) 기준으로 파싱합니다.

### 신뢰도 점수
- 테이블 파싱: 0.9 (구조적으로 명확)
- 텍스트 파싱 (보훈/장애): 0.9
- 텍스트 파싱 (어학/자격증): 0.8
- 헤더 없는 테이블: 0.7
- 기본 임계값: 0.6 이상만 저장

## 주의사항

- `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회합니다. **절대 외부에 노출하지 마세요.**
- 크롤링 대상 사이트의 robots.txt를 준수하고, `CRAWL_DELAY_SECONDS`를 2초 이상 유지하세요.
- 채용공고의 가산점 정보는 공고마다 다를 수 있으므로 수집 후 수동 검토를 권장합니다.
- 파싱된 데이터는 참고용이며, 실제 가산점 기준은 각 기관 공식 공고를 확인하세요.
