"""
공기업 가산점 크롤러 메인 실행 파일

사용법:
  # 전체 실행 (기업 목록 수집 + 가산점 파싱 + DB 저장)
  python main.py run

  # 특정 기업만 실행
  python main.py run --enterprise "한국전력공사"

  # 기업 목록만 DB에 등록 (가산점 미수집)
  python main.py sync-enterprises

  # 드라이런 (DB 저장 없이 파싱 결과만 출력)
  python main.py run --dry-run

  # 재실행 모드 (기존 규칙 삭제 후 새로 저장)
  python main.py run --overwrite

  # 특정 URL에서 직접 가산점 파싱 (가장 실용적)
  python main.py crawl-url "한국전력공사" "https://home.kepco.co.kr/kepco/TR/...공고URL"

  # 텍스트 직접 입력 파싱 (공고 복붙용)
  python main.py parse-text "TOEIC 700점 이상: 3%, 전기기사: 5%"

  # 실제 크롤링 결과 디버깅 (HTTP 응답 상태 확인)
  python main.py run --dry-run --verbose
"""
from __future__ import annotations

import logging
import time
from typing import Optional

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table

import config
from spiders.alio_spider import AlioSpider
from spiders.narajob_spider import NarajobSpider, EnterpriseWebSpider
from parsers.bonus_parser import BonusParser, BonusRule
from pipelines.supabase_pipeline import SupabasePipeline

# ── 로깅 설정 ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
console = Console()


# ── CLI 명령어 ────────────────────────────────────────────────────────────────

@click.group()
def cli():
    """공기업 가산점 DB 자동 수집 크롤러"""
    pass


@cli.command()
@click.option("--enterprise", "-e", default=None, help="특정 기업명만 처리")
@click.option("--dry-run", is_flag=True, help="DB 저장 없이 파싱 결과만 출력")
@click.option("--overwrite", is_flag=True, help="기존 규칙 삭제 후 새로 저장")
@click.option("--skip-web", is_flag=True, help="개별 기관 홈페이지 크롤링 생략")
@click.option("--verbose", "-v", is_flag=True, help="HTTP 응답 상태 등 상세 로그 출력")
def run(
    enterprise: Optional[str],
    dry_run: bool,
    overwrite: bool,
    skip_web: bool,
    verbose: bool,
):
    """전체 크롤링 파이프라인 실행"""
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    console.rule("[bold blue]공기업 가산점 크롤러 시작[/bold blue]")

    # 스파이더 / 파이프라인 초기화
    alio_spider = AlioSpider()
    narajob_spider = NarajobSpider()
    web_spider = EnterpriseWebSpider()
    pipeline = SupabasePipeline(safe=not overwrite) if not dry_run else None

    # 기업 목록 수집
    if enterprise:
        from spiders.alio_spider import EnterpriseItem
        enterprises = [EnterpriseItem(name=enterprise, type="공기업")]
    else:
        console.print("[cyan]공공기관 목록 수집 중...[/cyan]")
        enterprises = list(alio_spider.crawl())
        console.print(f"[green]총 {len(enterprises)}개 기관 수집 완료[/green]")

    # 기업별 처리
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("가산점 수집 중...", total=len(enterprises))

        for ent in enterprises:
            progress.update(task, description=f"[{ent.name}] 처리 중")
            all_rules: list[BonusRule] = []

            # 1) 나라일터에서 채용공고 수집
            try:
                for posting in narajob_spider.crawl_by_enterprise(ent.name):
                    parser = BonusParser(source_url=posting.source_url)
                    rules = parser.parse(
                        text=posting.bonus_text,
                        tables=posting.bonus_table,
                    )
                    all_rules.extend(rules)
                    logger.debug("[%s] 나라일터 규칙 %d개", ent.name, len(rules))
            except Exception as e:
                logger.warning("[%s] 나라일터 크롤링 실패: %s", ent.name, e)

            # 2) 나라일터에서 못 찾은 경우 기관 홈페이지 시도
            if not all_rules and not skip_web and ent.website_url:
                try:
                    posting = web_spider.crawl(ent.name, ent.website_url)
                    if posting:
                        parser = BonusParser(source_url=posting.source_url)
                        rules = parser.parse(
                            text=posting.bonus_text,
                            tables=posting.bonus_table,
                        )
                        all_rules.extend(rules)
                        logger.debug("[%s] 홈페이지 규칙 %d개", ent.name, len(rules))
                except Exception as e:
                    logger.warning("[%s] 홈페이지 크롤링 실패: %s", ent.name, e)

            # 3) 결과 출력 / 저장
            if dry_run:
                _print_dry_run(ent.name, all_rules)
            elif pipeline and all_rules:
                pipeline.save(ent, all_rules)
            elif pipeline and not all_rules:
                # 규칙이 없어도 기업 정보는 등록
                pipeline.upsert_enterprise(ent)

            progress.advance(task)
            time.sleep(config.CRAWL_DELAY_SECONDS)

    # 결과 요약
    if pipeline:
        console.rule("[bold green]완료[/bold green]")
        console.print(f"[bold]{pipeline.stats.summary()}[/bold]")


@cli.command("sync-enterprises")
@click.option("--dry-run", is_flag=True)
def sync_enterprises(dry_run: bool):
    """기업 목록만 DB에 등록 (가산점 수집 없음)"""
    console.print("[cyan]공공기관 목록 동기화 시작...[/cyan]")
    spider = AlioSpider()
    pipeline = SupabasePipeline(safe=True) if not dry_run else None

    count = 0
    for ent in spider.crawl():
        if dry_run:
            console.print(f"  [dim]{ent.name}[/dim] ({ent.type}) — {ent.ministry}")
        elif pipeline:
            pipeline.upsert_enterprise(ent)
        count += 1

    if pipeline:
        console.print(
            f"\n[green]완료: {count}개 처리 "
            f"(신규 {pipeline.stats.enterprises_inserted}개 / "
            f"기존 {pipeline.stats.enterprises_skipped}개)[/green]"
        )
    else:
        console.print(f"\n[yellow]드라이런: {count}개 감지됨 (저장 없음)[/yellow]")


@cli.command("crawl-url")
@click.argument("enterprise_name")
@click.argument("url")
@click.option("--dry-run", is_flag=True, help="DB 저장 없이 파싱 결과만 출력")
@click.option("--overwrite", is_flag=True, help="기존 규칙 삭제 후 새로 저장")
def crawl_url(enterprise_name: str, url: str, dry_run: bool, overwrite: bool):
    """
    특정 URL을 직접 지정해서 가산점 파싱 후 저장

    예시:
      python main.py crawl-url "한국전력공사" "https://home.kepco.co.kr/...공고URL"
      python main.py crawl-url "한국가스공사" "https://..." --dry-run
    """
    import requests
    from bs4 import BeautifulSoup

    console.print(f"[cyan]URL 크롤링: {url}[/cyan]")

    # 페이지 가져오기
    try:
        resp = requests.get(url, headers=config.DEFAULT_HEADERS, timeout=config.CRAWL_TIMEOUT_SECONDS)
        resp.raise_for_status()
    except Exception as e:
        console.print(f"[red]HTTP 요청 실패: {e}[/red]")
        raise SystemExit(1)

    soup = BeautifulSoup(resp.text, "lxml")

    # 가산점 섹션 추출
    BONUS_KEYWORDS = ["가산점", "우대사항", "가점", "우대조건", "우대 사항"]
    full_text = soup.get_text(separator="\n")

    # 키워드 주변 텍스트만 추출
    lines = full_text.splitlines()
    bonus_lines: list[str] = []
    in_section = False
    empty_count = 0
    for line in lines:
        stripped = line.strip()
        if any(kw in stripped for kw in BONUS_KEYWORDS):
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

    bonus_text = "\n".join(bonus_lines)

    # 테이블 추출
    bonus_table: list[list[str]] = []
    for table in soup.find_all("table"):
        if any(kw in table.get_text() for kw in BONUS_KEYWORDS):
            for row in table.find_all("tr"):
                cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
                if cells:
                    bonus_table.append(cells)

    if not bonus_text and not bonus_table:
        console.print("[yellow]⚠ 가산점 관련 섹션을 찾지 못했습니다.[/yellow]")
        console.print("[dim]힌트: 해당 페이지에 '가산점', '우대사항' 키워드가 있는지 확인하세요.[/dim]")
        return

    # 파싱
    parser = BonusParser(source_url=url)
    rules = parser.parse(text=bonus_text, tables=bonus_table if bonus_table else None)

    console.print(f"\n[bold yellow]{enterprise_name}[/bold yellow] — {len(rules)}개 규칙 파싱됨")
    _print_rules_table(rules)

    if dry_run or not rules:
        return

    # DB 저장
    from spiders.alio_spider import EnterpriseItem
    pipeline = SupabasePipeline(safe=not overwrite)
    ent = EnterpriseItem(name=enterprise_name, type="공기업")
    ok = pipeline.save(ent, rules)
    if ok:
        console.print(f"\n[green]✅ 저장 완료: {pipeline.stats.rules_inserted}개 규칙[/green]")
    else:
        console.print("[red]저장 실패[/red]")


@cli.command("add-rule")
@click.option("--enterprise", "-e", required=True, help="기업명")
@click.option("--category", "-c", required=True,
              type=click.Choice(["자격증", "어학", "전공", "보훈", "장애", "지역인재", "기타"]),
              help="가산점 카테고리")
@click.option("--condition", required=True, help='조건 상세 (예: "TOEIC 700점 이상", "전기기사")')
@click.option("--bonus", "-b", required=True, type=float, help="가산점 비율 (%)")
@click.option("--source-url", default="", help="출처 URL")
def add_rule(enterprise: str, category: str, condition: str, bonus: float, source_url: str):
    """
    가산점 규칙을 수동으로 추가 (공고 확인 후 직접 입력)

    예시:
      python main.py add-rule -e "한국전력공사" -c 어학 --condition "TOEIC 700점 이상" -b 3.0 --source-url "https://..."
      python main.py add-rule -e "한국가스공사" -c 자격증 --condition "전기기사" -b 5.0
    """
    from spiders.alio_spider import EnterpriseItem
    from parsers.bonus_parser import BonusRule

    rule = BonusRule(
        category=category,
        condition_detail=condition,
        bonus_point_percentage=bonus,
        source_url=source_url,
        confidence=1.0,  # 수동 입력은 신뢰도 100%
    )

    console.print(f"\n추가할 규칙:")
    _print_rules_table([rule])

    if not click.confirm(f"\n[{enterprise}]에 위 규칙을 저장할까요?"):
        console.print("취소됨")
        return

    pipeline = SupabasePipeline(safe=True)
    ent = EnterpriseItem(name=enterprise, type="공기업")
    ok = pipeline.save(ent, [rule])
    if ok:
        console.print(f"[green]✅ 저장 완료[/green]")
    else:
        console.print("[red]저장 실패[/red]")


@cli.command("parse-text")
@click.argument("text")
@click.option("--source-url", default="", help="출처 URL")
def parse_text(text: str, source_url: str):
    """텍스트에서 가산점 규칙 파싱 테스트 (파일 경로 또는 직접 입력)"""
    import os
    if os.path.isfile(text):
        with open(text, encoding="utf-8") as f:
            raw = f.read()
    else:
        raw = text

    parser = BonusParser(source_url=source_url)
    rules = parser.parse(text=raw)
    _print_rules_table(rules)


# ── 출력 헬퍼 ────────────────────────────────────────────────────────────────

def _print_dry_run(enterprise_name: str, rules: list[BonusRule]) -> None:
    if not rules:
        console.print(f"  [dim]{enterprise_name}: 가산점 규칙 없음[/dim]")
        return

    console.print(f"\n[bold yellow]{enterprise_name}[/bold yellow] — {len(rules)}개 규칙")
    _print_rules_table(rules)


def _print_rules_table(rules: list[BonusRule]) -> None:
    if not rules:
        console.print("[dim]규칙 없음[/dim]")
        return

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("카테고리", width=10)
    table.add_column("조건", width=30)
    table.add_column("가산점", justify="right", width=8)
    table.add_column("신뢰도", justify="right", width=8)

    for rule in rules:
        table.add_row(
            rule.category,
            rule.condition_detail,
            f"{rule.bonus_point_percentage:.1f}%",
            f"{rule.confidence:.0%}",
        )

    console.print(table)


# ── 진입점 ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli()
