"""
가산점 텍스트 파싱 모듈
- 채용공고 텍스트/테이블에서 구조화된 가산점 규칙을 추출합니다.
- engine.ts의 매칭 로직과 동일한 형식으로 데이터를 출력합니다.
"""
from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from typing import Literal

logger = logging.getLogger(__name__)

# ── 타입 정의 ──────────────────────────────────────────────────────────────────

BonusCategory = Literal["자격증", "어학", "전공", "보훈", "장애", "지역인재", "기타"]

@dataclass
class BonusRule:
    """파싱된 가산점 규칙 하나"""
    category: BonusCategory
    condition_detail: str          # "TOEIC 700점 이상", "전기기사" 등
    bonus_point_percentage: float  # 가산점 비율 (%)
    source_url: str = ""
    confidence: float = 1.0        # 파싱 신뢰도 (0.0 ~ 1.0)


# ── 패턴 정의 ────────────────────────────────────────────────────────────────

# 카테고리별 키워드
CATEGORY_KEYWORDS: dict[BonusCategory, list[str]] = {
    "어학":    ["toeic", "opic", "toefl", "ielts", "jpt", "jlpt", "hsk", "토익", "오픽", "어학"],
    "자격증":  ["기사", "산업기사", "기능사", "기술사", "자격증", "면허", "면허증", "자격"],
    "전공":    ["전공", "학과", "학부", "이공계", "상경계", "인문", "사범"],
    "보훈":    ["보훈", "취업지원대상자", "국가유공자", "보훈대상"],
    "장애":    ["장애인", "장애"],
    "지역인재": ["지역인재", "지역출신", "지방대"],
    "기타":    ["비수도권", "저소득", "다문화", "한부모"],
}

# 어학 점수/등급 패턴 (조건 텍스트 정규화용)
LANGUAGE_PATTERNS: list[tuple[str, str]] = [
    # TOEIC 점수
    (r"토익\s*(\d+)\s*점?\s*이상", r"TOEIC \1점 이상"),
    (r"toeic\s*(\d+)\s*점?\s*이상", r"TOEIC \1점 이상"),

    # TOEIC Speaking
    (r"토익\s*스피킹\s*(?:lv\.?|레벨\s*)?(\d+)\s*이상", r"TOEIC SPEAKING Lv.\1 이상"),
    (r"toeic\s*speaking\s*(?:lv\.?)?(\d+)\s*이상", r"TOEIC SPEAKING Lv.\1 이상"),

    # OPIc
    (r"오픽\s*([a-z]{2,3})\s*이상", lambda m: f"OPIc {m.group(1).upper()} 이상"),
    (r"opic\s*([a-z]{2,3})\s*이상", lambda m: f"OPIc {m.group(1).upper()} 이상"),

    # TOEFL
    (r"토플\s*(\d+)\s*점?\s*이상", r"TOEFL \1점 이상"),
    (r"toefl\s*(\d+)\s*점?\s*이상", r"TOEFL \1점 이상"),

    # IELTS
    (r"아이엘츠\s*(\d+(?:\.\d+)?)\s*이상", r"IELTS \1 이상"),
    (r"ielts\s*(\d+(?:\.\d+)?)\s*이상", r"IELTS \1 이상"),

    # JLPT
    (r"jlpt\s*(n?\d)\s*이상", lambda m: f"JLPT {m.group(1).upper()} 이상"),
    (r"일본어능력시험\s*(n?\d)\s*이상", lambda m: f"JLPT {m.group(1).upper()} 이상"),

    # HSK
    (r"hsk\s*(\d+)\s*급?\s*이상", r"HSK \1급 이상"),

    # JPT
    (r"jpt\s*(\d+)\s*점?\s*이상", r"JPT \1점 이상"),
]

# 자격증 이름 패턴 (한국산업인력공단 주요 자격증)
CERT_NAMES: list[str] = [
    # 전기/전자
    "전기기사", "전기산업기사", "전기기능사", "전기공사기사", "전기공사산업기사",
    "전기안전기술사", "발송배전기술사",
    # IT
    "정보처리기사", "정보처리산업기사", "정보보안기사", "정보보안산업기사",
    "네트워크관리사", "리눅스마스터", "정보처리기능사",
    # 기계
    "일반기계기사", "기계설계산업기사", "용접기사", "용접산업기사",
    # 화학
    "화학분석기사", "화학분석산업기사", "위험물산업기사", "위험물기능사",
    # 건설/토목
    "토목기사", "토목산업기사", "건설재료시험기사", "측량및지형공간정보기사",
    "건축기사", "건축산업기사",
    # 환경
    "환경기사", "대기환경기사", "수질환경기사", "소음진동기사",
    # 회계/경영
    "공인회계사", "세무사", "변호사", "공인노무사",
    # 금융
    "금융투자분석사", "재무위험관리사", "보험계리사",
    # 안전
    "산업안전기사", "산업안전산업기사", "소방기사", "소방설비기사",
]

# 가산점 비율 추출 패턴
PERCENTAGE_PATTERNS: list[re.Pattern] = [
    re.compile(r"(\d+(?:\.\d+)?)\s*(?:점|%|퍼센트)\s*가산"),
    re.compile(r"가산\s*점?\s*:?\s*(\d+(?:\.\d+)?)\s*(?:점|%)?"),
    re.compile(r"(\d+(?:\.\d+)?)\s*(?:점|%)\s*우대"),
    re.compile(r":\s*(\d+(?:\.\d+)?)\s*(?:점|%|퍼센트)"),
    re.compile(r"\(\s*\+\s*(\d+(?:\.\d+)?)\s*(?:점|%)\s*\)"),
]


# ── 메인 파서 ─────────────────────────────────────────────────────────────────

class BonusParser:
    """
    채용공고 텍스트와 테이블에서 가산점 규칙을 추출합니다.

    사용법:
        parser = BonusParser(source_url="https://...")
        rules = parser.parse(text=posting.bonus_text, tables=posting.bonus_table)
    """

    def __init__(self, source_url: str = "") -> None:
        self.source_url = source_url

    def parse(
        self,
        text: str = "",
        tables: list[list[str]] | None = None,
    ) -> list[BonusRule]:
        """텍스트와 테이블을 모두 파싱하여 중복 제거 후 반환합니다."""
        rules: list[BonusRule] = []

        if text:
            rules.extend(self._parse_text(text))

        if tables:
            rules.extend(self._parse_tables(tables))

        return self._deduplicate(rules)

    # ── 텍스트 파싱 ──────────────────────────────────────────────────────────

    def _parse_text(self, text: str) -> list[BonusRule]:
        rules: list[BonusRule] = []

        # 줄바꿈 + 쉼표 모두로 분리 → 항목마다 개별 처리
        raw_lines = text.splitlines()
        lines: list[str] = []
        for raw in raw_lines:
            # 쉼표로 분리된 복합 항목 처리 (예: "TOEIC 700점: 3%, 전기기사: 5%")
            parts = [p.strip() for p in raw.split(",")]
            lines.extend(parts)

        for line in lines:
            stripped = line.strip()
            if len(stripped) < 5:
                continue

            line_lower = stripped.lower()

            # 1) 보훈 — 법적 고정 비율 (5~10%, 중간값 7.5%)
            if self._match_category("보훈", line_lower):
                pct = self._extract_percentage(stripped) or 5.0
                rules.append(BonusRule(
                    category="보훈",
                    condition_detail="취업지원대상자",
                    bonus_point_percentage=pct,
                    source_url=self.source_url,
                    confidence=0.9,
                ))

            # 2) 장애
            elif self._match_category("장애", line_lower):
                pct = self._extract_percentage(stripped) or 3.0
                rules.append(BonusRule(
                    category="장애",
                    condition_detail="장애인",
                    bonus_point_percentage=pct,
                    source_url=self.source_url,
                    confidence=0.9,
                ))

            # 3) 지역인재
            elif self._match_category("지역인재", line_lower):
                pct = self._extract_percentage(stripped) or 3.0
                rules.append(BonusRule(
                    category="지역인재",
                    condition_detail="지역인재",
                    bonus_point_percentage=pct,
                    source_url=self.source_url,
                    confidence=0.85,
                ))

            # 4) 어학
            elif self._match_category("어학", line_lower):
                lang_rules = self._parse_language_line(stripped)
                rules.extend(lang_rules)

            # 5) 자격증
            else:
                cert_rules = self._parse_cert_line(stripped)
                rules.extend(cert_rules)

        return rules

    def _parse_language_line(self, line: str) -> list[BonusRule]:
        """한 줄에서 어학 가산점 규칙을 추출합니다."""
        rules: list[BonusRule] = []
        line_lower = line.lower()

        pct = self._extract_percentage(line)
        if pct is None:
            return rules

        condition = self._normalize_language_condition(line_lower)
        if condition:
            rules.append(BonusRule(
                category="어학",
                condition_detail=condition,
                bonus_point_percentage=pct,
                source_url=self.source_url,
                confidence=0.8,
            ))

        return rules

    def _normalize_language_condition(self, line_lower: str) -> str:
        """어학 조건 텍스트를 engine.ts가 인식하는 형식으로 정규화합니다."""
        # 각 언어 시험별 패턴 적용
        if "toeic speaking" in line_lower or "토익 스피킹" in line_lower:
            m = re.search(r"(?:toeic speaking|토익 스피킹)\s*(?:lv\.?|레벨\s*)?(\d+)\s*이상", line_lower)
            if m:
                return f"TOEIC SPEAKING Lv.{m.group(1)} 이상"

        if "toeic" in line_lower or "토익" in line_lower:
            m = re.search(r"(\d{3,4})\s*점?\s*이상", line_lower)
            if m:
                return f"TOEIC {m.group(1)}점 이상"

        if "opic" in line_lower or "오픽" in line_lower:
            m = re.search(r"(nl|nm|nh|il|im\d?|ih|al)\s*이상", line_lower)
            if m:
                return f"OPIc {m.group(1).upper()} 이상"

        if "toefl" in line_lower or "토플" in line_lower:
            m = re.search(r"(\d{2,3})\s*점?\s*이상", line_lower)
            if m:
                return f"TOEFL {m.group(1)}점 이상"

        if "ielts" in line_lower or "아이엘츠" in line_lower:
            m = re.search(r"(\d(?:\.\d)?)\s*이상", line_lower)
            if m:
                return f"IELTS {m.group(1)} 이상"

        if "jlpt" in line_lower or "일본어능력시험" in line_lower:
            m = re.search(r"(n?\d)\s*이상", line_lower, re.IGNORECASE)
            if m:
                return f"JLPT {m.group(1).upper()} 이상"

        if "hsk" in line_lower:
            m = re.search(r"(\d)\s*급?\s*이상", line_lower)
            if m:
                return f"HSK {m.group(1)}급 이상"

        if "jpt" in line_lower:
            m = re.search(r"(\d{3,4})\s*점?\s*이상", line_lower)
            if m:
                return f"JPT {m.group(1)}점 이상"

        return ""

    def _parse_cert_line(self, line: str) -> list[BonusRule]:
        """한 줄에서 자격증 가산점 규칙을 추출합니다."""
        rules: list[BonusRule] = []

        pct = self._extract_percentage(line)
        if pct is None:
            return rules

        # 자격증 이름 목록에서 매칭
        for cert in CERT_NAMES:
            if cert in line:
                rules.append(BonusRule(
                    category="자격증",
                    condition_detail=cert,
                    bonus_point_percentage=pct,
                    source_url=self.source_url,
                    confidence=0.85,
                ))
                break  # 한 줄에 여러 자격증이 있을 수 있지만 우선 첫 번째만

        return rules

    # ── 테이블 파싱 ──────────────────────────────────────────────────────────

    def _parse_tables(self, tables: list[list[str]]) -> list[BonusRule]:
        """테이블 형식의 가산점 데이터를 파싱합니다."""
        rules: list[BonusRule] = []

        # 헤더 행 찾기
        header_idx = -1
        cat_col = cond_col = pct_col = -1

        for i, row in enumerate(tables):
            row_lower = [cell.lower() for cell in row]
            if any("구분" in c or "항목" in c or "종류" in c for c in row_lower):
                header_idx = i
                # 열 인덱스 파악
                for j, cell in enumerate(row_lower):
                    if "구분" in cell or "항목" in cell or "종류" in cell:
                        cat_col = j
                    elif "조건" in cell or "기준" in cell or "내용" in cell:
                        cond_col = j
                    elif "가산" in cell or "%" in cell or "점수" in cell:
                        pct_col = j
                break

        if header_idx == -1:
            # 헤더를 못 찾으면 2열/3열 테이블로 가정
            return self._parse_simple_table(tables)

        # 데이터 행 파싱
        for row in tables[header_idx + 1:]:
            if len(row) < 2:
                continue

            cat_text = row[cat_col].strip() if cat_col >= 0 and cat_col < len(row) else ""
            cond_text = row[cond_col].strip() if cond_col >= 0 and cond_col < len(row) else ""
            pct_text = row[pct_col].strip() if pct_col >= 0 and pct_col < len(row) else ""

            category = self._detect_category(cat_text + " " + cond_text)
            if not category:
                continue

            pct = self._extract_percentage(pct_text)
            if pct is None:
                continue

            condition = cond_text or cat_text
            rules.append(BonusRule(
                category=category,
                condition_detail=condition,
                bonus_point_percentage=pct,
                source_url=self.source_url,
                confidence=0.9,  # 테이블은 신뢰도 높음
            ))

        return rules

    def _parse_simple_table(self, tables: list[list[str]]) -> list[BonusRule]:
        """헤더 없는 간단한 2~3열 테이블 파싱"""
        rules: list[BonusRule] = []

        for row in tables:
            if len(row) < 2:
                continue

            # 마지막 열을 가산점 비율로, 나머지를 조건으로 가정
            pct_text = row[-1]
            cond_text = " ".join(row[:-1])

            pct = self._extract_percentage(pct_text)
            if pct is None:
                continue

            category = self._detect_category(cond_text)
            if not category:
                continue

            rules.append(BonusRule(
                category=category,
                condition_detail=cond_text.strip(),
                bonus_point_percentage=pct,
                source_url=self.source_url,
                confidence=0.7,
            ))

        return rules

    # ── 유틸리티 ─────────────────────────────────────────────────────────────

    def _match_category(self, category: BonusCategory, text_lower: str) -> bool:
        """텍스트에 해당 카테고리 키워드가 포함되는지 확인합니다."""
        return any(kw in text_lower for kw in CATEGORY_KEYWORDS.get(category, []))

    def _detect_category(self, text: str) -> BonusCategory | None:
        """텍스트에서 가산점 카테고리를 감지합니다."""
        text_lower = text.lower()
        # 우선순위 순서로 확인
        priority: list[BonusCategory] = [
            "보훈", "장애", "지역인재", "어학", "자격증", "전공", "기타"
        ]
        for cat in priority:
            if self._match_category(cat, text_lower):
                return cat
        return None

    def _extract_percentage(self, text: str) -> float | None:
        """텍스트에서 가산점 비율(%)을 추출합니다."""
        for pattern in PERCENTAGE_PATTERNS:
            m = pattern.search(text)
            if m:
                try:
                    val = float(m.group(1))
                    if 0.5 <= val <= 20:  # 0.5% ~ 20% 범위만 유효
                        return val
                except (ValueError, IndexError):
                    continue

        # 단순 숫자% 패턴
        m = re.search(r"(\d+(?:\.\d+)?)\s*%", text)
        if m:
            try:
                val = float(m.group(1))
                if 0.5 <= val <= 20:
                    return val
            except ValueError:
                pass

        return None

    def _deduplicate(self, rules: list[BonusRule]) -> list[BonusRule]:
        """중복 규칙 제거 — 같은 category + condition_detail은 신뢰도 높은 것만 유지"""
        seen: dict[str, BonusRule] = {}
        for rule in rules:
            key = f"{rule.category}::{rule.condition_detail.lower().strip()}"
            if key not in seen or rule.confidence > seen[key].confidence:
                seen[key] = rule
        return list(seen.values())
