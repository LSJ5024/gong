"""
Supabase 저장 파이프라인
- 파싱된 기업 정보와 가산점 규칙을 Supabase에 upsert합니다.
- 기존 데이터를 덮어쓰지 않고 새로운 항목만 추가 (안전 모드 기본값)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from supabase import create_client, Client
from tenacity import retry, stop_after_attempt, wait_exponential

import config
from parsers.bonus_parser import BonusRule
from spiders.alio_spider import EnterpriseItem

logger = logging.getLogger(__name__)


# ── 파이프라인 결과 통계 ──────────────────────────────────────────────────────

@dataclass
class PipelineStats:
    enterprises_inserted: int = 0
    enterprises_skipped: int = 0
    rules_inserted: int = 0
    rules_skipped: int = 0
    errors: int = 0

    def summary(self) -> str:
        return (
            f"기업: +{self.enterprises_inserted} 신규 / {self.enterprises_skipped} 건너뜀 | "
            f"규칙: +{self.rules_inserted} 신규 / {self.rules_skipped} 건너뜀 | "
            f"오류: {self.errors}"
        )


# ── 파이프라인 ────────────────────────────────────────────────────────────────

class SupabasePipeline:
    """
    기업 정보와 가산점 규칙을 Supabase public_enterprises / bonus_point_rules
    테이블에 저장합니다.

    모드:
      safe=True  → 기존 데이터 유지, 신규만 INSERT
      safe=False → 기존 규칙 삭제 후 전체 UPSERT (크롤러 재실행 시)
    """

    MIN_CONFIDENCE = config.MIN_CONFIDENCE_SCORE

    def __init__(self, safe: bool = True) -> None:
        self.client: Client = create_client(
            config.SUPABASE_URL,
            config.SUPABASE_SERVICE_ROLE_KEY,  # Service Role Key — RLS 우회
        )
        self.safe = safe
        self.stats = PipelineStats()

    # ── 기업 저장 ─────────────────────────────────────────────────────────

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=5))
    def upsert_enterprise(self, item: EnterpriseItem) -> str | None:
        """
        기업을 DB에 저장하고 enterprise_id를 반환합니다.
        이미 존재하면 기존 ID를 반환합니다.
        """
        # 이미 존재하는지 이름으로 확인
        existing = (
            self.client.table("public_enterprises")
            .select("id")
            .eq("name", item.name)
            .maybe_single()
            .execute()
        )

        if existing.data:
            enterprise_id: str = existing.data["id"]
            logger.debug("[%s] 이미 존재 → id=%s", item.name, enterprise_id)
            self.stats.enterprises_skipped += 1
            return enterprise_id

        # 신규 기업 INSERT
        result = (
            self.client.table("public_enterprises")
            .insert({
                "name": item.name,
                "type": item.type,
                "ministry": item.ministry or None,
                "location": item.location or None,
                "website_url": item.website_url or None,
                "last_updated": datetime.now(timezone.utc).isoformat(),
            })
            .execute()
        )

        if result.data:
            enterprise_id = result.data[0]["id"]
            logger.info("[%s] 신규 기업 등록 → id=%s", item.name, enterprise_id)
            self.stats.enterprises_inserted += 1
            return enterprise_id

        logger.error("[%s] 기업 INSERT 실패", item.name)
        self.stats.errors += 1
        return None

    # ── 가산점 규칙 저장 ───────────────────────────────────────────────────

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=5))
    def upsert_rules(self, enterprise_id: str, rules: list[BonusRule]) -> None:
        """
        가산점 규칙을 DB에 저장합니다.
        safe=False 이면 해당 기업의 기존 규칙을 먼저 삭제합니다.
        """
        # 신뢰도 필터링
        valid_rules = [r for r in rules if r.confidence >= self.MIN_CONFIDENCE]
        if not valid_rules:
            logger.debug("enterprise_id=%s: 저장할 유효 규칙 없음", enterprise_id)
            return

        if not self.safe:
            # 기존 규칙 전체 삭제 (재크롤링 모드)
            self.client.table("bonus_point_rules") \
                .delete() \
                .eq("enterprise_id", enterprise_id) \
                .execute()
            logger.debug("enterprise_id=%s: 기존 규칙 삭제 완료", enterprise_id)

        for rule in valid_rules:
            self._insert_rule_if_not_exists(enterprise_id, rule)

    def _insert_rule_if_not_exists(
        self, enterprise_id: str, rule: BonusRule
    ) -> None:
        """동일 조건의 규칙이 없으면 INSERT합니다."""
        if self.safe:
            # 중복 확인
            existing = (
                self.client.table("bonus_point_rules")
                .select("id")
                .eq("enterprise_id", enterprise_id)
                .eq("category", rule.category)
                .eq("condition_detail", rule.condition_detail)
                .maybe_single()
                .execute()
            )
            if existing.data:
                self.stats.rules_skipped += 1
                return

        result = (
            self.client.table("bonus_point_rules")
            .insert({
                "enterprise_id": enterprise_id,
                "category": rule.category,
                "condition_detail": rule.condition_detail,
                "bonus_point_percentage": rule.bonus_point_percentage,
                "source_url": rule.source_url or None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .execute()
        )

        if result.data:
            logger.debug(
                "규칙 저장: [%s] %s %s → %.1f%%",
                rule.category, rule.condition_detail,
                enterprise_id, rule.bonus_point_percentage,
            )
            self.stats.rules_inserted += 1
        else:
            logger.warning(
                "규칙 INSERT 실패: enterprise_id=%s category=%s condition=%s",
                enterprise_id, rule.category, rule.condition_detail,
            )
            self.stats.errors += 1

    # ── 배치 저장 ─────────────────────────────────────────────────────────

    def save(
        self,
        enterprise: EnterpriseItem,
        rules: list[BonusRule],
    ) -> bool:
        """기업 + 가산점 규칙을 한 번에 저장합니다."""
        try:
            enterprise_id = self.upsert_enterprise(enterprise)
            if not enterprise_id:
                return False

            if rules:
                self.upsert_rules(enterprise_id, rules)

            return True
        except Exception as e:
            logger.error("[%s] 저장 중 오류: %s", enterprise.name, e)
            self.stats.errors += 1
            return False
