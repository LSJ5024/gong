"""
알리오(ALIO) / 공공데이터포털 기반 공공기관 목록 수집 스파이더
- 공공기관 현황 API에서 기관명·유형·주무부처·소재지 수집
- API 키 없이도 기본 동작하도록 fallback 내장
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Iterator

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

import config

logger = logging.getLogger(__name__)


# ── 데이터 모델 ────────────────────────────────────────────────────────────────

@dataclass
class EnterpriseItem:
    name: str
    type: str                    # 공기업 | 준정부기관 | 기타공공기관
    ministry: str = ""           # 주무부처
    location: str = ""           # 소재지 (시/도)
    website_url: str = ""        # 홈페이지
    source_url: str = ""         # 수집 출처 URL


# ── 공공기관 유형 정규화 ──────────────────────────────────────────────────────

TYPE_MAP: dict[str, str] = {
    "공기업": "공기업",
    "준정부기관": "준정부기관",
    "기타공공기관": "기타공공기관",
    "위탁집행형": "준정부기관",
    "기금관리형": "준정부기관",
    "시장형": "공기업",
    "준시장형": "공기업",
}


def normalize_type(raw: str) -> str:
    for key, val in TYPE_MAP.items():
        if key in raw:
            return val
    return "기타공공기관"


# ── 소재지 정규화 (시·도명 추출) ──────────────────────────────────────────────

REGIONS = [
    "서울", "부산", "대구", "인천", "광주", "대전", "울산",
    "세종", "경기", "강원", "충북", "충남", "전북", "전남",
    "경북", "경남", "제주",
]


def extract_region(address: str) -> str:
    for region in REGIONS:
        if region in address:
            return region
    return ""


# ── 공공데이터포털 API 스파이더 ───────────────────────────────────────────────

class AlioSpider:
    """
    공공데이터포털 공공기관 현황 API 또는 알리오 OpenAPI를 통해
    공공기관 목록을 수집합니다.

    사용법:
        spider = AlioSpider()
        for item in spider.crawl():
            print(item.name, item.type)
    """

    PAGE_SIZE = 100

    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update(config.DEFAULT_HEADERS)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    def _get(self, url: str, params: dict) -> dict:
        resp = self.session.get(url, params=params, timeout=config.CRAWL_TIMEOUT_SECONDS)
        resp.raise_for_status()
        return resp.json()

    def crawl(self) -> Iterator[EnterpriseItem]:
        """공공기관 목록을 페이지 단위로 수집 후 yield"""
        key = config.DATA_GO_KR_API_KEY
        has_real_key = bool(key) and not key.startswith("your_")

        if has_real_key:
            yield from self._crawl_data_go_kr()
        else:
            logger.warning(
                "DATA_GO_KR_API_KEY가 설정되지 않았습니다. "
                "내장 기관 목록(fallback 40개)을 사용합니다. "
                "전체 목록은 data.go.kr에서 API 키를 발급받으세요."
            )
            yield from self._fallback_list()

    def _crawl_data_go_kr(self) -> Iterator[EnterpriseItem]:
        """공공데이터포털 공공기관 현황 API 수집"""
        page = 1
        total_collected = 0

        while total_collected < config.CRAWL_MAX_ENTERPRISES:
            try:
                data = self._get(
                    config.DATA_GO_KR_ENTERPRISE_URL,
                    params={
                        "serviceKey": config.DATA_GO_KR_API_KEY,
                        "page": page,
                        "perPage": self.PAGE_SIZE,
                    },
                )
            except Exception as e:
                logger.error("공공데이터포털 API 오류: %s", e)
                break

            rows = data.get("data", [])
            if not rows:
                break

            for row in rows:
                raw_type = row.get("기관유형", "")
                item = EnterpriseItem(
                    name=row.get("기관명", "").strip(),
                    type=normalize_type(raw_type),
                    ministry=row.get("주무부처", "").strip(),
                    location=extract_region(row.get("소재지", "")),
                    website_url=row.get("홈페이지", "").strip(),
                    source_url=config.DATA_GO_KR_ENTERPRISE_URL,
                )
                if item.name:
                    yield item
                    total_collected += 1

            logger.info("알리오 스파이더: %d개 수집 완료 (page=%d)", total_collected, page)

            # 마지막 페이지 확인
            if len(rows) < self.PAGE_SIZE:
                break

            page += 1
            time.sleep(config.CRAWL_DELAY_SECONDS)

    def _fallback_list(self) -> Iterator[EnterpriseItem]:
        """
        API 키 없이 동작하는 fallback — 주요 공공기관 목록을 하드코딩
        (실제 서비스에서는 API 키 발급 권장)
        """
        FALLBACK_ENTERPRISES: list[dict] = [
            # 공기업
            {"name": "한국전력공사", "type": "공기업", "ministry": "산업통상자원부", "location": "전남", "website_url": "https://home.kepco.co.kr"},
            {"name": "한국가스공사", "type": "공기업", "ministry": "산업통상자원부", "location": "대구", "website_url": "https://www.kogas.or.kr"},
            {"name": "한국수력원자력", "type": "공기업", "ministry": "산업통상자원부", "location": "경주", "website_url": "https://www.khnp.co.kr"},
            {"name": "한국동서발전", "type": "공기업", "ministry": "산업통상자원부", "location": "울산", "website_url": "https://www.ewp.co.kr"},
            {"name": "한국서부발전", "type": "공기업", "ministry": "산업통상자원부", "location": "충남", "website_url": "https://www.kowepo.co.kr"},
            {"name": "한국남부발전", "type": "공기업", "ministry": "산업통상자원부", "location": "부산", "website_url": "https://www.kospo.co.kr"},
            {"name": "한국중부발전", "type": "공기업", "ministry": "산업통상자원부", "location": "충남", "website_url": "https://www.komipo.co.kr"},
            {"name": "한국남동발전", "type": "공기업", "ministry": "산업통상자원부", "location": "경남", "website_url": "https://www.koen.co.kr"},
            {"name": "한국도로공사", "type": "공기업", "ministry": "국토교통부", "location": "경북", "website_url": "https://www.ex.co.kr"},
            {"name": "한국철도공사", "type": "공기업", "ministry": "국토교통부", "location": "대전", "website_url": "https://www.korail.com"},
            {"name": "한국토지주택공사", "type": "공기업", "ministry": "국토교통부", "location": "경남", "website_url": "https://www.lh.or.kr"},
            {"name": "인천국제공항공사", "type": "공기업", "ministry": "국토교통부", "location": "인천", "website_url": "https://www.airport.kr"},
            {"name": "한국공항공사", "type": "공기업", "ministry": "국토교통부", "location": "서울", "website_url": "https://www.airport.co.kr"},
            {"name": "부산항만공사", "type": "공기업", "ministry": "해양수산부", "location": "부산", "website_url": "https://www.busanpa.com"},
            {"name": "인천항만공사", "type": "공기업", "ministry": "해양수산부", "location": "인천", "website_url": "https://www.icpa.or.kr"},
            {"name": "한국수자원공사", "type": "공기업", "ministry": "환경부", "location": "대전", "website_url": "https://www.kwater.or.kr"},
            {"name": "한국석유공사", "type": "공기업", "ministry": "산업통상자원부", "location": "울산", "website_url": "https://www.knoc.co.kr"},
            {"name": "한국광물자원공사", "type": "공기업", "ministry": "산업통상자원부", "location": "원주", "website_url": "https://www.kores.or.kr"},
            {"name": "강원랜드", "type": "공기업", "ministry": "산업통상자원부", "location": "강원", "website_url": "https://www.high1.com"},
            {"name": "한국마사회", "type": "공기업", "ministry": "농림축산식품부", "location": "경기", "website_url": "https://www.kra.co.kr"},
            # 준정부기관
            {"name": "국민건강보험공단", "type": "준정부기관", "ministry": "보건복지부", "location": "강원", "website_url": "https://www.nhis.or.kr"},
            {"name": "국민연금공단", "type": "준정부기관", "ministry": "보건복지부", "location": "전북", "website_url": "https://www.nps.or.kr"},
            {"name": "근로복지공단", "type": "준정부기관", "ministry": "고용노동부", "location": "울산", "website_url": "https://www.comwel.or.kr"},
            {"name": "건강보험심사평가원", "type": "준정부기관", "ministry": "보건복지부", "location": "강원", "website_url": "https://www.hira.or.kr"},
            {"name": "한국산업인력공단", "type": "준정부기관", "ministry": "고용노동부", "location": "울산", "website_url": "https://www.hrdkorea.or.kr"},
            {"name": "한국장학재단", "type": "준정부기관", "ministry": "교육부", "location": "대구", "website_url": "https://www.kosaf.go.kr"},
            {"name": "한국무역보험공사", "type": "준정부기관", "ministry": "산업통상자원부", "location": "서울", "website_url": "https://www.ksure.or.kr"},
            {"name": "신용보증기금", "type": "준정부기관", "ministry": "금융위원회", "location": "대구", "website_url": "https://www.kodit.co.kr"},
            {"name": "기술보증기금", "type": "준정부기관", "ministry": "금융위원회", "location": "부산", "website_url": "https://www.kibo.or.kr"},
            {"name": "한국농어촌공사", "type": "준정부기관", "ministry": "농림축산식품부", "location": "전남", "website_url": "https://www.ekr.or.kr"},
            {"name": "한국환경공단", "type": "준정부기관", "ministry": "환경부", "location": "인천", "website_url": "https://www.keco.or.kr"},
            {"name": "한국산업단지공단", "type": "준정부기관", "ministry": "산업통상자원부", "location": "대구", "website_url": "https://www.kicox.or.kr"},
            {"name": "한국전기안전공사", "type": "준정부기관", "ministry": "산업통상자원부", "location": "전북", "website_url": "https://www.kesco.or.kr"},
            {"name": "한국가스안전공사", "type": "준정부기관", "ministry": "산업통상자원부", "location": "충북", "website_url": "https://www.kgs.or.kr"},
            {"name": "한국에너지공단", "type": "준정부기관", "ministry": "산업통상자원부", "location": "경기", "website_url": "https://www.energy.or.kr"},
            {"name": "한국사회보장정보원", "type": "기타공공기관", "ministry": "보건복지부", "location": "서울", "website_url": "https://www.ssis.or.kr"},
            {"name": "한국교육학술정보원", "type": "기타공공기관", "ministry": "교육부", "location": "대구", "website_url": "https://www.keris.or.kr"},
            {"name": "한국고용정보원", "type": "기타공공기관", "ministry": "고용노동부", "location": "충북", "website_url": "https://www.keis.or.kr"},
            {"name": "한국보건복지인재원", "type": "기타공공기관", "ministry": "보건복지부", "location": "충북", "website_url": "https://www.kohi.or.kr"},
            {"name": "도로교통공단", "type": "기타공공기관", "ministry": "경찰청", "location": "경기", "website_url": "https://www.koroad.or.kr"},
        ]

        for e in FALLBACK_ENTERPRISES:
            yield EnterpriseItem(
                name=e["name"],
                type=e["type"],
                ministry=e["ministry"],
                location=e["location"],
                website_url=e["website_url"],
                source_url="fallback",
            )
