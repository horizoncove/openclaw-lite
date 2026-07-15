"""Download and cache unadjusted A-share daily bars for reproducible backtests."""

from __future__ import annotations

import argparse
import sqlite3
import time
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Iterable


BAR_FIELDS = (
    "date,code,open,high,low,close,preclose,volume,amount,turn,"
    "tradestatus,pctChg,isST"
)


@dataclass(frozen=True)
class DownloadSummary:
    database: Path
    start_date: date
    end_date: date
    stock_count: int
    completed_count: int
    failed_count: int
    bar_count: int


class AShareHistoryDownloader:
    """Resumable BaoStock-to-SQLite daily-bar downloader.

    BaoStock covers Shanghai and Shenzhen stocks, including delisted symbols.
    It does not cover Beijing Stock Exchange symbols. Prices are deliberately
    unadjusted because limit-up detection depends on the actual traded price.
    """

    def __init__(
        self,
        database: str | Path,
        *,
        retry_count: int = 3,
        retry_delay: float = 1.0,
    ) -> None:
        self.database = Path(database)
        self.retry_count = retry_count
        self.retry_delay = retry_delay

    def download(self, start_date: date, end_date: date) -> DownloadSummary:
        if start_date > end_date:
            raise ValueError("开始日期不能晚于结束日期")
        try:
            import baostock as bs
        except ImportError as exc:
            raise RuntimeError("请先安装 baostock: pip install baostock") from exc

        self.database.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.database)
        connection.row_factory = sqlite3.Row
        self._create_schema(connection)

        login = bs.login()
        if login.error_code != "0":
            connection.close()
            raise RuntimeError(f"BaoStock 登录失败: {login.error_msg}")

        failed = 0
        completed = 0
        try:
            stocks = self._fetch_stock_universe(bs, start_date, end_date)
            industries = self._fetch_industries(bs)
            self._save_stocks(connection, stocks, industries)
            self._set_metadata(connection, "source", "BaoStock 0.9.x")
            self._set_metadata(connection, "price_adjustment", "none")
            self._set_metadata(connection, "exchange_coverage", "SSE,SZSE (BSE excluded)")
            self._set_metadata(connection, "requested_start", start_date.isoformat())
            self._set_metadata(connection, "requested_end", end_date.isoformat())

            total = len(stocks)
            for index, stock in enumerate(stocks, start=1):
                code = stock["code"]
                if self._already_complete(connection, code, start_date, end_date):
                    completed += 1
                    continue
                try:
                    rows = self._fetch_bars_with_retry(
                        bs, code, start_date, end_date
                    )
                    self._save_bars(
                        connection, code, start_date, end_date, rows
                    )
                    completed += 1
                except Exception as exc:
                    failed += 1
                    self._mark_failed(
                        connection, code, start_date, end_date, str(exc)
                    )
                if index == 1 or index % 50 == 0 or index == total:
                    print(
                        f"[{index}/{total}] 已完成 {completed}，失败 {failed}，"
                        f"当前 {code}",
                        flush=True,
                    )
        finally:
            bs.logout()

        bar_count = connection.execute("SELECT COUNT(*) FROM daily_bars").fetchone()[0]
        connection.close()
        return DownloadSummary(
            database=self.database,
            start_date=start_date,
            end_date=end_date,
            stock_count=len(stocks),
            completed_count=completed,
            failed_count=failed,
            bar_count=bar_count,
        )

    @staticmethod
    def _create_schema(connection: sqlite3.Connection) -> None:
        connection.executescript(
            """
            PRAGMA journal_mode=WAL;
            PRAGMA synchronous=NORMAL;
            CREATE TABLE IF NOT EXISTS metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS stocks (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                ipo_date TEXT,
                out_date TEXT,
                listing_status TEXT NOT NULL,
                industry TEXT NOT NULL DEFAULT '未分类',
                industry_updated_at TEXT
            );
            CREATE TABLE IF NOT EXISTS daily_bars (
                trade_date TEXT NOT NULL,
                code TEXT NOT NULL,
                open REAL NOT NULL,
                high REAL NOT NULL,
                low REAL NOT NULL,
                close REAL NOT NULL,
                preclose REAL NOT NULL,
                volume REAL NOT NULL,
                amount REAL NOT NULL,
                turnover_rate REAL NOT NULL,
                trade_status INTEGER NOT NULL,
                pct_change REAL NOT NULL,
                is_st INTEGER NOT NULL,
                PRIMARY KEY (trade_date, code)
            ) WITHOUT ROWID;
            CREATE INDEX IF NOT EXISTS idx_daily_bars_code_date
                ON daily_bars(code, trade_date);
            CREATE TABLE IF NOT EXISTS download_status (
                code TEXT PRIMARY KEY,
                requested_start TEXT NOT NULL,
                requested_end TEXT NOT NULL,
                row_count INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL,
                error TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

    @staticmethod
    def _fetch_stock_universe(
        bs: Any, start_date: date, end_date: date
    ) -> list[dict[str, str]]:
        result = bs.query_stock_basic()
        _raise_baostock_error(result, "证券列表")
        stocks = []
        while result.next():
            row = dict(zip(result.fields, result.get_row_data()))
            if row.get("type") != "1" or not _is_a_share(row.get("code", "")):
                continue
            ipo_date = _parse_optional_date(row.get("ipoDate"))
            out_date = _parse_optional_date(row.get("outDate"))
            if ipo_date and ipo_date > end_date:
                continue
            if out_date and out_date < start_date:
                continue
            stocks.append(row)
        return stocks

    @staticmethod
    def _fetch_industries(bs: Any) -> dict[str, tuple[str, str]]:
        result = bs.query_stock_industry()
        _raise_baostock_error(result, "行业分类")
        industries = {}
        while result.next():
            row = dict(zip(result.fields, result.get_row_data()))
            industries[row["code"]] = (
                row.get("industry") or "未分类",
                row.get("updateDate") or "",
            )
        return industries

    @staticmethod
    def _save_stocks(
        connection: sqlite3.Connection,
        stocks: list[dict[str, str]],
        industries: dict[str, tuple[str, str]],
    ) -> None:
        with connection:
            connection.executemany(
                """
                INSERT INTO stocks (
                    code, name, ipo_date, out_date, listing_status,
                    industry, industry_updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(code) DO UPDATE SET
                    name=excluded.name,
                    ipo_date=excluded.ipo_date,
                    out_date=excluded.out_date,
                    listing_status=excluded.listing_status,
                    industry=excluded.industry,
                    industry_updated_at=excluded.industry_updated_at
                """,
                [
                    (
                        stock["code"],
                        stock["code_name"],
                        stock.get("ipoDate") or "",
                        stock.get("outDate") or "",
                        stock.get("status") or "",
                        industries.get(stock["code"], ("未分类", ""))[0],
                        industries.get(stock["code"], ("未分类", ""))[1],
                    )
                    for stock in stocks
                ],
            )

    def _fetch_bars_with_retry(
        self, bs: Any, code: str, start_date: date, end_date: date
    ) -> list[tuple[Any, ...]]:
        last_error: Exception | None = None
        for attempt in range(self.retry_count):
            try:
                result = bs.query_history_k_data_plus(
                    code,
                    BAR_FIELDS,
                    start_date=start_date.isoformat(),
                    end_date=end_date.isoformat(),
                    frequency="d",
                    adjustflag="3",
                )
                _raise_baostock_error(result, f"{code} 日线")
                rows = []
                while result.next():
                    raw = result.get_row_data()
                    if not raw or not raw[0] or not raw[2]:
                        continue
                    rows.append(_parse_bar(raw))
                return rows
            except Exception as exc:
                last_error = exc
                if attempt + 1 < self.retry_count:
                    time.sleep(self.retry_delay * (2**attempt))
        raise RuntimeError(str(last_error) if last_error else "未知下载错误")

    @staticmethod
    def _save_bars(
        connection: sqlite3.Connection,
        code: str,
        start_date: date,
        end_date: date,
        rows: list[tuple[Any, ...]],
    ) -> None:
        with connection:
            connection.executemany(
                """
                INSERT OR REPLACE INTO daily_bars (
                    trade_date, code, open, high, low, close, preclose,
                    volume, amount, turnover_rate, trade_status, pct_change, is_st
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                rows,
            )
            connection.execute(
                """
                INSERT INTO download_status (
                    code, requested_start, requested_end, row_count, status, error
                ) VALUES (?, ?, ?, ?, 'complete', '')
                ON CONFLICT(code) DO UPDATE SET
                    requested_start=excluded.requested_start,
                    requested_end=excluded.requested_end,
                    row_count=excluded.row_count,
                    status='complete',
                    error='',
                    updated_at=CURRENT_TIMESTAMP
                """,
                (code, start_date.isoformat(), end_date.isoformat(), len(rows)),
            )

    @staticmethod
    def _mark_failed(
        connection: sqlite3.Connection,
        code: str,
        start_date: date,
        end_date: date,
        error: str,
    ) -> None:
        with connection:
            connection.execute(
                """
                INSERT INTO download_status (
                    code, requested_start, requested_end, status, error
                ) VALUES (?, ?, ?, 'failed', ?)
                ON CONFLICT(code) DO UPDATE SET
                    requested_start=excluded.requested_start,
                    requested_end=excluded.requested_end,
                    status='failed',
                    error=excluded.error,
                    updated_at=CURRENT_TIMESTAMP
                """,
                (code, start_date.isoformat(), end_date.isoformat(), error[:1000]),
            )

    @staticmethod
    def _already_complete(
        connection: sqlite3.Connection,
        code: str,
        start_date: date,
        end_date: date,
    ) -> bool:
        row = connection.execute(
            """
            SELECT requested_start, requested_end
            FROM download_status WHERE code=? AND status='complete'
            """,
            (code,),
        ).fetchone()
        return bool(
            row
            and row["requested_start"] <= start_date.isoformat()
            and row["requested_end"] >= end_date.isoformat()
        )

    @staticmethod
    def _set_metadata(
        connection: sqlite3.Connection, key: str, value: str
    ) -> None:
        with connection:
            connection.execute(
                "INSERT OR REPLACE INTO metadata(key, value) VALUES (?, ?)",
                (key, value),
            )


def _raise_baostock_error(result: Any, label: str) -> None:
    if result.error_code != "0":
        raise RuntimeError(f"{label}获取失败: {result.error_msg}")


def _is_a_share(code: str) -> bool:
    return code.startswith("sh.6") or code.startswith(("sz.0", "sz.3"))


def _parse_optional_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


def _float(value: str) -> float:
    return float(value) if value else 0.0


def _parse_bar(raw: list[str]) -> tuple[Any, ...]:
    return (
        raw[0],
        raw[1],
        _float(raw[2]),
        _float(raw[3]),
        _float(raw[4]),
        _float(raw[5]),
        _float(raw[6]),
        _float(raw[7]),
        _float(raw[8]),
        _float(raw[9]),
        int(raw[10] or 0),
        _float(raw[11]),
        int(raw[12] or 0),
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="下载沪深A股历史日线到SQLite")
    parser.add_argument("--start", required=True, type=date.fromisoformat)
    parser.add_argument("--end", required=True, type=date.fromisoformat)
    parser.add_argument(
        "--database",
        default="data/backtest/a_share_daily.sqlite",
        type=Path,
    )
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    summary = AShareHistoryDownloader(args.database).download(args.start, args.end)
    print(
        f"下载完成：{summary.completed_count}/{summary.stock_count} 只，"
        f"失败 {summary.failed_count} 只，共 {summary.bar_count:,} 条日线，"
        f"数据库 {summary.database}"
    )
    return 1 if summary.failed_count else 0


if __name__ == "__main__":
    raise SystemExit(main())
