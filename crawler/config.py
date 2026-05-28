"""
크롤러 전역 설정
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# ── 공공데이터포털 ─────────────────────────────────────────────────────────────
DATA_GO_KR_API_KEY = os.getenv("DATA_GO_KR_API_KEY", "")

# ── HTTP 클라이언트 설정 ───────────────────────────────────────────────────────
CRAWL_DELAY_SECONDS = float(os.getenv("CRAWL_DELAY_SECONDS", "2"))
CRAWL_MAX_ENTERPRISES = int(os.getenv("CRAWL_MAX_ENTERPRISES", "200"))
CRAWL_TIMEOUT_SECONDS = int(os.getenv("CRAWL_TIMEOUT_SECONDS", "30"))

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
}

# ── 로깅 ──────────────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# ── 알리오 OpenAPI ─────────────────────────────────────────────────────────────
# 공공기관 경영정보 공개시스템 (https://alio.go.kr)
ALIO_BASE_URL = "https://alio.go.kr/openapi"

# ── 공공데이터포털 API 엔드포인트 ──────────────────────────────────────────────
# 공공기관 현황 데이터셋
DATA_GO_KR_ENTERPRISE_URL = (
    "https://api.odcloud.kr/api/15012690/v1/"
    "uddi:83a7a03e-ab60-4dc0-9e7e-41bda7e2f3e9"
)

# ── 나라일터 ───────────────────────────────────────────────────────────────────
NARAJOB_BASE_URL = "https://www.nabul.go.kr"
NARAJOB_SEARCH_URL = f"{NARAJOB_BASE_URL}/front/job/jobMergeNoticeList.do"

# ── 가산점 파싱 관련 상수 ───────────────────────────────────────────────────────
# 파싱 결과 신뢰도 기준 (이 값 이상일 때만 DB에 저장)
MIN_CONFIDENCE_SCORE = 0.6
