"""
나라일터 채용공고 스파이더
- https://www.nabul.go.kr 에서 공공기관 채용공고 수집
- 공고 본문에서 가산점 관련 섹션을 추출해 parser로 전달
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Iterator

import requests
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

import config

logger = logging.getLogger(__name__)


# ── 데이터 모델 ────────────────────────────────────────────────────────────────

@dataclass
class JobPosting:
    enterprise_name: str         # 채용 기관명
    title: str                   # 공고 제목
    url: str                     # 공고 URL
    source_url: str              # 수집 출처
    bonus_text: str = ""         # 가산점 관련 텍스트 (parser 입력용)
    bonus_table: list[list[str]] = field(default_factory=list)  # 테이블 데이터


# ── 나라일터 스파이더 ──────────────────────────────────────────────────────────

class NarajobSpider:
    """
    나라일터(nabul.go.kr)에서 공공기관 채용공고를 수집합니다.
    기관명으로 검색 → 공고 목록 → 공고 상세 → 가산점 섹션 추출
    """

    BASE_URL = "https://www.nabul.go.kr"
    LIST_URL = f"{BASE_URL}/front/job/jobMergeNoticeList.do"
    DETAIL_URL = f"{BASE_URL}/front/job/jobMergeNoticeDetail.do"

    # 가산점 관련 섹션 헤더 키워드
    BONUS_KEYWORDS = ["가산점", "우대사항", "우대조건", "가점", "우대 사항"]

    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update(config.DEFAULT_HEADERS)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    def _get(self, url: str, params: dict | None = None) -> requests.Response:
        resp = self.session.get(url, params=params, timeout=config.CRAWL_TIMEOUT_SECONDS)
        resp.raise_for_status()
        return resp

    def crawl_by_enterprise(self, enterprise_name: str) -> Iterator[JobPosting]:
        """기관명으로 최근 채용공고를 검색하고 가산점 정보를 추출합니다."""
        try:
            postings = self._search_postings(enterprise_name)
        except Exception as e:
            logger.warning("[%s] 나라일터 검색 실패: %s", enterprise_name, e)
            return

        for posting_meta in postings[:3]:  # 최근 3개 공고만 처리
            try:
                posting = self._fetch_detail(posting_meta, enterprise_name)
                if posting and (posting.bonus_text or posting.bonus_table):
                    yield posting
                time.sleep(config.CRAWL_DELAY_SECONDS)
            except Exception as e:
                logger.warning("[%s] 공고 상세 수집 실패: %s", enterprise_name, e)

    def _search_postings(self, enterprise_name: str) -> list[dict]:
        """기관명으로 채용공고 목록을 가져옵니다."""
        try:
            resp = self._get(
                self.LIST_URL,
                params={
                    "schOrgNm": enterprise_name,
                    "pageIndex": "1",
                    "pageUnit": "10",
                },
            )
        except Exception:
            # 나라일터 접근 실패 시 빈 리스트 반환
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        results: list[dict] = []

        # 공고 목록 테이블 파싱
        rows = soup.select("table.board-list tbody tr")
        for row in rows:
            cols = row.select("td")
            if len(cols) < 3:
                continue

            link_tag = row.select_one("a[href]")
            if not link_tag:
                continue

            href = link_tag.get("href", "")
            title = link_tag.get_text(strip=True)

            # onclick 또는 href에서 공고 ID 추출
            notice_id = self._extract_notice_id(href, str(row))
            if notice_id:
                results.append({"id": notice_id, "title": title})

        return results

    def _extract_notice_id(self, href: str, row_html: str) -> str:
        """공고 ID를 href 또는 onclick에서 추출합니다."""
        import re

        # href에서 직접 추출
        m = re.search(r"noticeId=([A-Z0-9]+)", href)
        if m:
            return m.group(1)

        # onclick에서 추출
        m = re.search(r"'([A-Z0-9]{8,})'", row_html)
        if m:
            return m.group(1)

        return ""

    def _fetch_detail(self, posting_meta: dict, enterprise_name: str) -> JobPosting | None:
        """공고 상세 페이지에서 가산점 섹션을 추출합니다."""
        notice_id = posting_meta.get("id", "")
        if not notice_id:
            return None

        detail_url = f"{self.DETAIL_URL}?noticeId={notice_id}"
        try:
            resp = self._get(detail_url)
        except Exception as e:
            logger.warning("공고 상세 요청 실패 (%s): %s", detail_url, e)
            return None

        soup = BeautifulSoup(resp.text, "lxml")
        posting = JobPosting(
            enterprise_name=enterprise_name,
            title=posting_meta.get("title", ""),
            url=detail_url,
            source_url=detail_url,
        )

        # 1) 가산점 관련 텍스트 섹션 추출
        posting.bonus_text = self._extract_bonus_text(soup)

        # 2) 가산점 테이블 추출
        posting.bonus_table = self._extract_bonus_tables(soup)

        return posting

    def _extract_bonus_text(self, soup: BeautifulSoup) -> str:
        """가산점/우대사항 키워드 주변 텍스트를 수집합니다."""
        full_text = soup.get_text(separator="\n")
        lines = full_text.splitlines()

        bonus_lines: list[str] = []
        in_bonus_section = False
        consecutive_empty = 0

        for line in lines:
            stripped = line.strip()

            # 가산점 섹션 시작 감지
            if any(kw in stripped for kw in self.BONUS_KEYWORDS):
                in_bonus_section = True
                consecutive_empty = 0

            if in_bonus_section:
                if stripped:
                    bonus_lines.append(stripped)
                    consecutive_empty = 0
                else:
                    consecutive_empty += 1
                    # 빈 줄 3개 연속이면 섹션 종료로 판단
                    if consecutive_empty >= 3:
                        break

        return "\n".join(bonus_lines)

    def _extract_bonus_tables(self, soup: BeautifulSoup) -> list[list[str]]:
        """가산점 관련 테이블 데이터를 추출합니다."""
        results: list[list[str]] = []

        for table in soup.find_all("table"):
            table_text = table.get_text()
            # 가산점 키워드가 포함된 테이블만 처리
            if not any(kw in table_text for kw in self.BONUS_KEYWORDS):
                continue

            for row in table.find_all("tr"):
                cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
                if cells:
                    results.append(cells)

        return results


# ── 개별 기관 홈페이지 스파이더 (보조) ────────────────────────────────────────

class EnterpriseWebSpider:
    """
    개별 기관 홈페이지의 채용공고 페이지에서 가산점 정보를 수집합니다.
    나라일터에 공고가 없는 기관을 위한 보조 스파이더입니다.
    """

    # 채용공고 페이지 경로 후보 (기관 홈페이지 하위)
    RECRUIT_PATH_CANDIDATES = [
        "/recruit", "/recruitment", "/hiring",
        "/employ", "/job", "/career",
        "/고용정보", "/채용", "/채용공고",
        "/human/recruit", "/about/recruit",
    ]

    BONUS_KEYWORDS = ["가산점", "우대사항", "가점", "우대조건"]

    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update(config.DEFAULT_HEADERS)

    def crawl(self, enterprise_name: str, website_url: str) -> JobPosting | None:
        """기관 홈페이지에서 채용공고 페이지를 찾아 가산점 정보를 추출합니다."""
        if not website_url or website_url == "fallback":
            return None

        base = website_url.rstrip("/")
        for path in self.RECRUIT_PATH_CANDIDATES:
            url = base + path
            try:
                resp = self.session.get(url, timeout=10, allow_redirects=True)
                if resp.status_code != 200:
                    continue

                soup = BeautifulSoup(resp.text, "lxml")
                bonus_text = self._extract_bonus_text(soup)
                bonus_table = self._extract_bonus_tables(soup)

                if bonus_text or bonus_table:
                    logger.info("[%s] 가산점 정보 발견: %s", enterprise_name, url)
                    return JobPosting(
                        enterprise_name=enterprise_name,
                        title="채용공고",
                        url=url,
                        source_url=url,
                        bonus_text=bonus_text,
                        bonus_table=bonus_table,
                    )

                time.sleep(1)
            except Exception:
                continue

        return None

    def _extract_bonus_text(self, soup: BeautifulSoup) -> str:
        text = soup.get_text(separator="\n")
        if not any(kw in text for kw in self.BONUS_KEYWORDS):
            return ""

        lines = text.splitlines()
        bonus_lines: list[str] = []
        in_section = False
        empty_count = 0

        for line in lines:
            stripped = line.strip()
            if any(kw in stripped for kw in self.BONUS_KEYWORDS):
                in_section = True
                empty_count = 0
            if in_section:
                if stripped:
                    bonus_lines.append(stripped)
                    empty_count = 0
                else:
                    empty_count += 1
                    if empty_count >= 3:
                        break

        return "\n".join(bonus_lines[:50])  # 최대 50줄

    def _extract_bonus_tables(self, soup: BeautifulSoup) -> list[list[str]]:
        results: list[list[str]] = []
        for table in soup.find_all("table"):
            if not any(kw in table.get_text() for kw in self.BONUS_KEYWORDS):
                continue
            for row in table.find_all("tr"):
                cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
                if cells:
                    results.append(cells)
        return results
