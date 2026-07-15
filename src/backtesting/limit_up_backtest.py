"""Daily-bar proxy backtest for the limit-up continuation idea.

Daily bars cannot reproduce seal-order amount, first seal time, or intraday
open-board counts.  This engine therefore uses only information observable in
the historical daily-bar dataset and labels its results as a proxy backtest.
"""

from __future__ import annotations

import argparse
import csv
import json
import sqlite3
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import date, datetime
from pathlib import Path
from statistics import mean, median
from typing import Iterable
from zoneinfo import ZoneInfo


SHANGHAI = ZoneInfo("Asia/Shanghai")


@dataclass(frozen=True)
class BacktestConfig:
    max_candidates: int = 3
    min_score: float = 55.0
    min_turnover_rate: float = 1.0
    max_turnover_rate: float = 35.0
    min_amount: float = 50_000_000
    one_way_cost_bps: float = 10.0


@dataclass(frozen=True)
class BacktestSelection:
    trade_date: str
    code: str
    name: str
    industry: str
    score: float
    board_count: int
    turnover_rate: float
    amount: float
    next_trade_date: str
    next_limit_up: bool
    next_open_buyable: bool
    next_open_gap_pct: float
    next_open_to_close_pct: float | None
    next_open_to_high_pct: float | None


@dataclass(frozen=True)
class BacktestReport:
    generated_at: str
    start_date: str
    end_date: str
    model: str
    candidate_count: int
    trading_days: int
    continuation_hits: int
    continuation_hit_rate: float
    executable_count: int
    unbuyable_open_limit_count: int
    avg_open_gap_pct: float
    avg_open_to_close_pct: float
    median_open_to_close_pct: float
    profitable_rate: float
    avg_open_to_high_pct: float
    cumulative_net_return_pct: float
    max_drawdown_pct: float
    annual: dict[str, dict[str, float | int]]
    limitations: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


class DailyBarLimitUpBacktester:
    def __init__(
        self,
        database: str | Path,
        config: BacktestConfig | None = None,
    ) -> None:
        self.database = Path(database)
        self.config = config or BacktestConfig()

    def run(
        self, start_date: date, end_date: date
    ) -> tuple[BacktestReport, list[BacktestSelection]]:
        if start_date > end_date:
            raise ValueError("开始日期不能晚于结束日期")
        if not self.database.exists():
            raise FileNotFoundError(self.database)

        connection = sqlite3.connect(self.database)
        connection.row_factory = sqlite3.Row
        try:
            trading_dates = [
                row[0]
                for row in connection.execute(
                    """
                    SELECT DISTINCT trade_date FROM daily_bars
                    WHERE trade_date BETWEEN ? AND ? ORDER BY trade_date
                    """,
                    (start_date.isoformat(), end_date.isoformat()),
                )
            ]
            if not trading_dates:
                raise ValueError("指定区间内没有可用日线数据")
            date_index = {value: index for index, value in enumerate(trading_dates)}
            rows = connection.execute(
                f"""
                WITH ordered AS (
                    SELECT b.*, s.name, s.industry, s.ipo_date,
                        LEAD(b.trade_date) OVER (
                            PARTITION BY b.code ORDER BY b.trade_date
                        ) AS next_trade_date,
                        LEAD(b.open) OVER (
                            PARTITION BY b.code ORDER BY b.trade_date
                        ) AS next_open,
                        LEAD(b.high) OVER (
                            PARTITION BY b.code ORDER BY b.trade_date
                        ) AS next_high,
                        LEAD(b.close) OVER (
                            PARTITION BY b.code ORDER BY b.trade_date
                        ) AS next_close,
                        LEAD(b.preclose) OVER (
                            PARTITION BY b.code ORDER BY b.trade_date
                        ) AS next_preclose,
                        LEAD(b.pct_change) OVER (
                            PARTITION BY b.code ORDER BY b.trade_date
                        ) AS next_pct_change
                    FROM daily_bars b JOIN stocks s ON s.code=b.code
                )
                SELECT * FROM ordered
                WHERE trade_date BETWEEN ? AND ?
                  AND trade_status=1 AND is_st=0
                  AND julianday(trade_date) - julianday(ipo_date) >= 10
                  AND ({_limit_up_sql("pct_change", "code")})
                ORDER BY trade_date, code
                """,
                (start_date.isoformat(), end_date.isoformat()),
            ).fetchall()
        finally:
            connection.close()

        by_date: dict[str, list[sqlite3.Row]] = defaultdict(list)
        for row in rows:
            by_date[row["trade_date"]].append(row)

        selections: list[BacktestSelection] = []
        last_limit_index: dict[str, int] = {}
        board_count_by_code: dict[str, int] = {}
        for trade_date in trading_dates:
            day_rows = by_date.get(trade_date, [])
            if not day_rows:
                continue
            current_index = date_index[trade_date]
            sector_counts: dict[str, int] = defaultdict(int)
            for row in day_rows:
                sector_counts[row["industry"] or "未分类"] += 1
            max_sector_count = max(sector_counts.values(), default=1)

            scored = []
            for row in day_rows:
                code = row["code"]
                if last_limit_index.get(code) == current_index - 1:
                    board_count = board_count_by_code.get(code, 1) + 1
                else:
                    board_count = 1
                last_limit_index[code] = current_index
                board_count_by_code[code] = board_count

                if not self._eligible(row):
                    continue
                score = self._score(
                    row,
                    board_count,
                    sector_counts[row["industry"] or "未分类"],
                    max_sector_count,
                    day_rows,
                )
                if score >= self.config.min_score and row["next_open"]:
                    scored.append((score, board_count, row))

            scored.sort(
                key=lambda item: (item[0], item[1], item[2]["amount"]),
                reverse=True,
            )
            for score, board_count, row in scored[: self.config.max_candidates]:
                selections.append(self._selection(score, board_count, row))

        actual_start = date.fromisoformat(trading_dates[0])
        actual_end = date.fromisoformat(trading_dates[-1])
        return self._report(actual_start, actual_end, selections), selections

    def _eligible(self, row: sqlite3.Row) -> bool:
        return (
            row["industry"]
            and row["industry"] != "未分类"
            and self.config.min_turnover_rate
            <= row["turnover_rate"]
            <= self.config.max_turnover_rate
            and row["amount"] >= self.config.min_amount
        )

    def _score(
        self,
        row: sqlite3.Row,
        board_count: int,
        sector_count: int,
        max_sector_count: int,
        day_rows: list[sqlite3.Row],
    ) -> float:
        sector_score = 35.0 * sector_count / max_sector_count
        turnover_score = 2.0 * _turnover_score(row["turnover_rate"])
        board_score = 2.0 * _board_height_score(board_count)

        open_change = (
            (row["open"] / row["preclose"] - 1) * 100
            if row["preclose"]
            else 0.0
        )
        tradability_score = 15.0 * max(0.0, min(1.0, (10.0 - open_change) / 8.0))

        amounts = sorted(item["amount"] for item in day_rows)
        amount_rank = amounts.index(row["amount"]) + 1
        liquidity_score = 10.0 * amount_rank / max(1, len(amounts))
        return round(
            min(
                100.0,
                sector_score
                + turnover_score
                + board_score
                + tradability_score
                + liquidity_score,
            ),
            2,
        )

    def _selection(
        self, score: float, board_count: int, row: sqlite3.Row
    ) -> BacktestSelection:
        next_preclose = row["next_preclose"] or row["close"]
        open_gap = (
            (row["next_open"] / next_preclose - 1) * 100
            if next_preclose
            else 0.0
        )
        next_limit_up = _is_limit_up(row["code"], row["next_pct_change"])
        open_limit_threshold = _limit_threshold(row["code"])
        buyable = open_gap < open_limit_threshold
        open_to_close = (
            (row["next_close"] / row["next_open"] - 1) * 100
            if buyable and row["next_open"]
            else None
        )
        open_to_high = (
            (row["next_high"] / row["next_open"] - 1) * 100
            if buyable and row["next_open"]
            else None
        )
        return BacktestSelection(
            trade_date=row["trade_date"],
            code=row["code"].split(".")[-1],
            name=row["name"],
            industry=row["industry"],
            score=score,
            board_count=board_count,
            turnover_rate=round(row["turnover_rate"], 4),
            amount=round(row["amount"], 2),
            next_trade_date=row["next_trade_date"],
            next_limit_up=next_limit_up,
            next_open_buyable=buyable,
            next_open_gap_pct=round(open_gap, 4),
            next_open_to_close_pct=(
                round(open_to_close, 4) if open_to_close is not None else None
            ),
            next_open_to_high_pct=(
                round(open_to_high, 4) if open_to_high is not None else None
            ),
        )

    def _report(
        self,
        start_date: date,
        end_date: date,
        selections: list[BacktestSelection],
    ) -> BacktestReport:
        executable = [
            item
            for item in selections
            if item.next_open_buyable and item.next_open_to_close_pct is not None
        ]
        daily_returns: dict[str, list[float]] = defaultdict(list)
        round_trip_cost_pct = self.config.one_way_cost_bps * 2 / 100
        for item in executable:
            daily_returns[item.next_trade_date].append(
                item.next_open_to_close_pct - round_trip_cost_pct
            )
        portfolio_returns = [
            mean(values) / 100
            for _, values in sorted(daily_returns.items())
        ]
        cumulative = 1.0
        peak = 1.0
        max_drawdown = 0.0
        for daily_return in portfolio_returns:
            cumulative *= 1 + daily_return
            peak = max(peak, cumulative)
            max_drawdown = min(max_drawdown, cumulative / peak - 1)

        annual: dict[str, dict[str, float | int]] = {}
        by_year: dict[str, list[BacktestSelection]] = defaultdict(list)
        for item in selections:
            by_year[item.trade_date[:4]].append(item)
        for year, items in sorted(by_year.items()):
            year_exec = [
                item
                for item in items
                if item.next_open_buyable
                and item.next_open_to_close_pct is not None
            ]
            annual[year] = {
                "candidates": len(items),
                "continuation_hit_rate": round(
                    100 * sum(item.next_limit_up for item in items) / len(items),
                    4,
                ),
                "executable": len(year_exec),
                "avg_open_to_close_pct": round(
                    mean(item.next_open_to_close_pct for item in year_exec), 4
                )
                if year_exec
                else 0.0,
            }

        close_returns = [
            item.next_open_to_close_pct
            for item in executable
            if item.next_open_to_close_pct is not None
        ]
        high_returns = [
            item.next_open_to_high_pct
            for item in executable
            if item.next_open_to_high_pct is not None
        ]
        return BacktestReport(
            generated_at=datetime.now(SHANGHAI).isoformat(timespec="seconds"),
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            model="daily_bar_proxy_v1",
            candidate_count=len(selections),
            trading_days=len({item.trade_date for item in selections}),
            continuation_hits=sum(item.next_limit_up for item in selections),
            continuation_hit_rate=_percentage(
                sum(item.next_limit_up for item in selections), len(selections)
            ),
            executable_count=len(executable),
            unbuyable_open_limit_count=sum(
                not item.next_open_buyable for item in selections
            ),
            avg_open_gap_pct=_safe_mean(
                [item.next_open_gap_pct for item in selections]
            ),
            avg_open_to_close_pct=_safe_mean(close_returns),
            median_open_to_close_pct=round(median(close_returns), 4)
            if close_returns
            else 0.0,
            profitable_rate=_percentage(
                sum(value > 0 for value in close_returns), len(close_returns)
            ),
            avg_open_to_high_pct=_safe_mean(high_returns),
            cumulative_net_return_pct=round((cumulative - 1) * 100, 4),
            max_drawdown_pct=round(max_drawdown * 100, 4),
            annual=annual,
            limitations=(
                "日线数据不含封单金额、首次封板时间和精确炸板次数，结果是代理模型而非实盘策略的完全复现。",
                "BaoStock不覆盖北交所。",
                "行业分类为数据下载时的当前证监会行业分类，存在分类变更偏差。",
                "收益按次日开盘等权买入、收盘卖出计算；开盘涨停视为无法成交。",
                f"交易成本按单边{self.config.one_way_cost_bps:.1f}个基点计算。",
            ),
        )


def _limit_up_sql(pct_column: str, code_column: str) -> str:
    growth = (
        f"({code_column} LIKE 'sh.688%' OR {code_column} LIKE 'sz.300%' "
        f"OR {code_column} LIKE 'sz.301%')"
    )
    return (
        f"(({growth}) AND {pct_column} BETWEEN 19.5 AND 21.0) OR "
        f"((NOT {growth}) AND {pct_column} BETWEEN 9.5 AND 11.0)"
    )


def _limit_threshold(code: str) -> float:
    return 19.5 if code.startswith(("sh.688", "sz.300", "sz.301")) else 9.5


def _is_limit_up(code: str, pct_change: float | None) -> bool:
    if pct_change is None:
        return False
    threshold = _limit_threshold(code)
    upper = 21.0 if threshold > 10 else 11.0
    return threshold <= pct_change <= upper


def _turnover_score(turnover_rate: float) -> float:
    if 5 <= turnover_rate <= 20:
        return 10.0
    if 1 <= turnover_rate < 5:
        return 2.5 * (turnover_rate - 1)
    if 20 < turnover_rate <= 35:
        return max(0.0, 10.0 * (35 - turnover_rate) / 15)
    return 0.0


def _board_height_score(board_count: int) -> float:
    if board_count <= 1:
        return 2.5
    if board_count == 2:
        return 6.0
    if board_count == 3:
        return 10.0
    if board_count == 4:
        return 8.0
    return 6.0


def _safe_mean(values: list[float]) -> float:
    return round(mean(values), 4) if values else 0.0


def _percentage(numerator: int, denominator: int) -> float:
    return round(100 * numerator / denominator, 4) if denominator else 0.0


def write_results(
    report: BacktestReport,
    selections: list[BacktestSelection],
    output_dir: str | Path,
) -> tuple[Path, Path]:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = f"limit_up_backtest_{report.start_date}_{report.end_date}"
    report_path = output_dir / f"{stem}.json"
    selections_path = output_dir / f"{stem}_selections.csv"
    report_path.write_text(
        json.dumps(report.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    with selections_path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=list(asdict(selections[0]).keys())
            if selections
            else [field.name for field in BacktestSelection.__dataclass_fields__.values()],
        )
        writer.writeheader()
        writer.writerows(asdict(item) for item in selections)
    return report_path, selections_path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="回测涨停延续日线代理策略")
    parser.add_argument("--start", required=True, type=date.fromisoformat)
    parser.add_argument("--end", required=True, type=date.fromisoformat)
    parser.add_argument(
        "--database",
        default="data/backtest/a_share_daily.sqlite",
        type=Path,
    )
    parser.add_argument(
        "--output-dir", default="data/backtest/results", type=Path
    )
    parser.add_argument("--max-candidates", type=int, default=3)
    parser.add_argument("--min-score", type=float, default=55.0)
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    config = BacktestConfig(
        max_candidates=args.max_candidates,
        min_score=args.min_score,
    )
    report, selections = DailyBarLimitUpBacktester(
        args.database, config
    ).run(args.start, args.end)
    report_path, selections_path = write_results(
        report, selections, args.output_dir
    )
    print(json.dumps(report.to_dict(), ensure_ascii=False, indent=2))
    print(f"报告: {report_path}")
    print(f"逐笔候选: {selections_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
