"""
분기별 자동 크롤링 스케줄러 (T-103)

실행 방법:
  python scheduler.py              # 포어그라운드로 실행 (서버에서 nohup/screen 사용)
  python scheduler.py --once       # 즉시 1회 실행 후 종료

배포 환경에서는 cron 또는 GitHub Actions를 권장합니다.
  # crontab 예시 (매 분기 첫 날 새벽 2시)
  0 2 1 1,4,7,10 * cd /path/to/crawler && python main.py run >> /var/log/crawler.log 2>&1
"""
from __future__ import annotations

import logging
import subprocess
import sys
from datetime import datetime

import click
import schedule
import time

logger = logging.getLogger(__name__)


def run_crawl_job() -> None:
    """크롤링 작업 실행 (main.py run 호출)"""
    start = datetime.now()
    logger.info("=== 정기 크롤링 시작: %s ===", start.strftime("%Y-%m-%d %H:%M"))

    try:
        result = subprocess.run(
            [sys.executable, "main.py", "run"],
            capture_output=True,
            text=True,
            timeout=7200,  # 2시간 타임아웃
        )
        if result.returncode == 0:
            logger.info("크롤링 완료 (소요: %s)", datetime.now() - start)
        else:
            logger.error("크롤링 실패 (exit=%d):\n%s", result.returncode, result.stderr)
    except subprocess.TimeoutExpired:
        logger.error("크롤링 타임아웃 (2시간 초과)")
    except Exception as e:
        logger.error("크롤링 실행 오류: %s", e)


@click.command()
@click.option("--once", is_flag=True, help="즉시 1회 실행 후 종료")
@click.option(
    "--interval",
    default="quarterly",
    type=click.Choice(["daily", "weekly", "monthly", "quarterly"]),
    help="실행 주기",
)
def main(once: bool, interval: str) -> None:
    """분기별 자동 크롤링 스케줄러"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    if once:
        logger.info("단발 실행 모드")
        run_crawl_job()
        return

    # 스케줄 등록
    if interval == "daily":
        schedule.every().day.at("02:00").do(run_crawl_job)
        logger.info("스케줄 등록: 매일 02:00")
    elif interval == "weekly":
        schedule.every().monday.at("02:00").do(run_crawl_job)
        logger.info("스케줄 등록: 매주 월요일 02:00")
    elif interval == "monthly":
        schedule.every(30).days.at("02:00").do(run_crawl_job)
        logger.info("스케줄 등록: 30일마다 02:00")
    else:  # quarterly
        schedule.every(90).days.at("02:00").do(run_crawl_job)
        logger.info("스케줄 등록: 90일마다 02:00 (분기별)")

    logger.info("스케줄러 대기 중... (Ctrl+C로 종료)")
    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    main()
