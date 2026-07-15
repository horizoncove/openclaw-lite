"""Backtest the historically observable hard rules from Sharon SOP v3.1."""

from __future__ import annotations

import argparse
import csv
import json
import sqlite3
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import date, datetime
from pathlib import Path
from statistics import mean
from typing import Iterable
from zoneinfo import ZoneInfo

from .limit_up_backtest import _is_limit_up, _limit_threshold, _limit_up_sql


SHANGHAI = ZoneInfo("Asia/Shanghai")


@dataclass(frozen=True)
class SOPBacktestConfig:
    max_ranked_candidates: int = 3
    max_float_market_cap: float = 10_000_000_000
    min_turnover_rate: float = 5.0
    min_sector_limit_ups: int = 3
    min_board_count: int = 2
    max_board_count: int = 4
    small_cap_threshold: float = 3_000_000_000
    small_cap_max_turnover: float = 30.0
    one_way_cost_bps: float = 10.0


@dataclass(frozen=True)
class SOPSelection:
    trade_date: str
    code: str
    name: str
    industry: str
    board_count: int
    sector_limit_up_count: int
    float_market_cap_yi: float
    turnover_rate: float
    ranking_strength: float
    next_trade_date: str
    next_limit_up: bool
    next_open_buyable: bool
    next_open_to_close_pct: float | None


@dataclass(frozen=True)
class ResultMetrics:
    candidate_count: int
    signal_days: int
    continuation_hits: int
    continuation_hit_rate: float
    executable_count: int
    unbuyable_count: int
    avg_open_to_close_pct: float
    profitable_rate: float
    cumulative_net_return_pct: float
    max_drawdown_pct: float


@dataclass(frozen=True)
class SOPBacktestReport:
    generated_at: str
    data_start: str
    data_end: str
    model: str
    strict_pool: ResultMetrics
    ranked_top3: ResultMetrics
    ranked_top3_annual: dict[str, dict[str, float | int]]
    applied_rules: tuple[str, ...]
    unavailable_rules: tuple[str, ...]
    limitations: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


class SOPV31Backtester:
    def __init__(
        self,
        database: str | Path,
        config: SOPBacktestConfig | None = None,
    ) -> None:
        self.database = Path(database)
        self.config = config or SOPBacktestConfig()

    def run(
        self, start_date: date, end_date: date
    ) -> tuple[SOPBacktestReport, list[SOPSelection], list[SOPSelection]]:
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
                raise ValueError("指定区间内没有可用行情")
            date_index = {value: index for index, value in enumerate(trading_dates)}
            rows = connection.execute(
                f"""
                WITH ordered AS (
                    SELECT b.*, s.name, s.industry,
                        LEAD(b.trade_date) OVER (
                            PARTITION BY b.code ORDER BY b.trade_date
                        ) AS next_trade_date,
                        LEAD(b.open) OVER (
                            PARTITION BY b.code ORDER BY b.trade_date
                        ) AS next_open,
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

        all_selections: list[SOPSelection] = []
        ranked_selections: list[SOPSelection] = []
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

            eligible: list[tuple[sqlite3.Row, int, float]] = []
            for row in day_rows:
                code = row["code"]
                if last_limit_index.get(code) == current_index - 1:
                    board_count = board_count_by_code.get(code, 1) + 1
                else:
                    board_count = 1
                last_limit_index[code] = current_index
                board_count_by_code[code] = board_count

                float_cap = _estimated_float_market_cap(row)
                sector_count = sector_counts[row["industry"] or "未分类"]
                if self._eligible(row, board_count, float_cap, sector_count):
                    eligible.append((row, board_count, float_cap))

            scored = []
            amounts = sorted(row["amount"] for row, _, _ in eligible)
            for row, board_count, float_cap in eligible:
                score = self._ranking_strength(
                    row,
                    board_count,
                    float_cap,
                    sector_counts[row["industry"]],
                    amounts,
                )
                selection = self._make_selection(
                    row,
                    board_count,
                    float_cap,
                    sector_counts[row["industry"]],
                    score,
                )
                if selection:
                    all_selections.append(selection)
                    scored.append(selection)
            scored.sort(
                key=lambda item: (
                    item.ranking_strength,
                    item.board_count,
                    -item.float_market_cap_yi,
                ),
                reverse=True,
            )
            ranked_selections.extend(
                scored[: self.config.max_ranked_candidates]
            )

        strict_metrics = _metrics(all_selections, self.config.one_way_cost_bps)
        ranked_metrics = _metrics(
            ranked_selections, self.config.one_way_cost_bps
        )
        report = SOPBacktestReport(
            generated_at=datetime.now(SHANGHAI).isoformat(timespec="seconds"),
            data_start=trading_dates[0],
            data_end=trading_dates[-1],
            model="sharon_sop_v31_observable_rules",
            strict_pool=strict_metrics,
            ranked_top3=ranked_metrics,
            ranked_top3_annual=_annual_metrics(ranked_selections),
            applied_rules=(
                "非ST股票",
                "2至4连板",
                "估算流通市值不超过100亿元",
                "换手率不低于5%",
                "所属行业当日至少3只涨停",
                "流通市值不超过30亿元且换手率超过30%时剔除",
                "5连板及以上强制剔除",
            ),
            unavailable_rules=(
                "首次封板时间早于14:00（日线无封板时刻）",
                "七星总分不低于65分（手册无逐项客观打分公式）",
                "天枢主力净流入（BaoStock日线无资金流字段）",
                "精确情绪周期和游资席位匹配",
            ),
            limitations=(
                "这是SOP可观测硬规则回测，不是完整七星SOP的精确复现。",
                "流通市值由成交量、换手率和收盘价估算，可能与真实自由流通市值有偏差。",
                "行业采用下载时的证监会分类，存在历史分类偏差。",
                "BaoStock不覆盖北交所。",
                "排序强度仅用于每日合格池选前三，不等同于七星评分。",
                f"收益按次日开盘买入、收盘卖出并扣除单边{self.config.one_way_cost_bps:.1f}基点；开盘涨停视为不可成交。",
            ),
        )
        return report, all_selections, ranked_selections

    def _eligible(
        self,
        row: sqlite3.Row,
        board_count: int,
        float_cap: float,
        sector_count: int,
    ) -> bool:
        return (
            self.config.min_board_count
            <= board_count
            <= self.config.max_board_count
            and 0 < float_cap <= self.config.max_float_market_cap
            and row["turnover_rate"] >= self.config.min_turnover_rate
            and sector_count >= self.config.min_sector_limit_ups
            and row["industry"]
            and row["industry"] != "未分类"
            and not (
                float_cap <= self.config.small_cap_threshold
                and row["turnover_rate"] > self.config.small_cap_max_turnover
            )
        )

    @staticmethod
    def _ranking_strength(
        row: sqlite3.Row,
        board_count: int,
        float_cap: float,
        sector_count: int,
        amounts: list[float],
    ) -> float:
        sector_score = min(30.0, 15.0 + (sector_count - 3) * 3.0)
        board_score = {2: 20.0, 3: 25.0, 4: 15.0}[board_count]
        cap_score = 5.0 + 15.0 * max(
            0.0, min(1.0, (10_000_000_000 - float_cap) / 7_000_000_000)
        )
        turnover = row["turnover_rate"]
        turnover_score = (
            15.0
            if 5 <= turnover <= 20
            else max(0.0, 15.0 * (30 - turnover) / 10)
        )
        amount_rank = amounts.index(row["amount"]) + 1
        liquidity_score = 10.0 * amount_rank / max(1, len(amounts))
        return round(
            sector_score
            + board_score
            + cap_score
            + turnover_score
            + liquidity_score,
            2,
        )

    @staticmethod
    def _make_selection(
        row: sqlite3.Row,
        board_count: int,
        float_cap: float,
        sector_count: int,
        score: float,
    ) -> SOPSelection | None:
        if not row["next_open"] or not row["next_trade_date"]:
            return None
        next_preclose = row["next_preclose"] or row["close"]
        open_gap = (row["next_open"] / next_preclose - 1) * 100
        buyable = open_gap < _limit_threshold(row["code"])
        open_to_close = (
            (row["next_close"] / row["next_open"] - 1) * 100
            if buyable and row["next_close"]
            else None
        )
        return SOPSelection(
            trade_date=row["trade_date"],
            code=row["code"].split(".")[-1],
            name=row["name"],
            industry=row["industry"],
            board_count=board_count,
            sector_limit_up_count=sector_count,
            float_market_cap_yi=round(float_cap / 100_000_000, 4),
            turnover_rate=round(row["turnover_rate"], 4),
            ranking_strength=score,
            next_trade_date=row["next_trade_date"],
            next_limit_up=_is_limit_up(
                row["code"], row["next_pct_change"]
            ),
            next_open_buyable=buyable,
            next_open_to_close_pct=(
                round(open_to_close, 4) if open_to_close is not None else None
            ),
        )


def _estimated_float_market_cap(row: sqlite3.Row) -> float:
    if row["turnover_rate"] <= 0 or row["close"] <= 0:
        return 0.0
    circulating_shares = row["volume"] / (row["turnover_rate"] / 100)
    return circulating_shares * row["close"]


def _metrics(
    selections: list[SOPSelection], one_way_cost_bps: float
) -> ResultMetrics:
    executable = [
        item
        for item in selections
        if item.next_open_buyable and item.next_open_to_close_pct is not None
    ]
    daily: dict[str, list[float]] = defaultdict(list)
    round_trip_cost_pct = one_way_cost_bps * 2 / 100
    for item in executable:
        daily[item.next_trade_date].append(
            item.next_open_to_close_pct - round_trip_cost_pct
        )
    cumulative = 1.0
    peak = 1.0
    max_drawdown = 0.0
    for _, returns in sorted(daily.items()):
        cumulative *= 1 + mean(returns) / 100
        peak = max(peak, cumulative)
        max_drawdown = min(max_drawdown, cumulative / peak - 1)
    raw_returns = [item.next_open_to_close_pct for item in executable]
    return ResultMetrics(
        candidate_count=len(selections),
        signal_days=len({item.trade_date for item in selections}),
        continuation_hits=sum(item.next_limit_up for item in selections),
        continuation_hit_rate=_pct(
            sum(item.next_limit_up for item in selections), len(selections)
        ),
        executable_count=len(executable),
        unbuyable_count=len(selections) - len(executable),
        avg_open_to_close_pct=round(mean(raw_returns), 4)
        if raw_returns
        else 0.0,
        profitable_rate=_pct(
            sum(value > 0 for value in raw_returns), len(raw_returns)
        ),
        cumulative_net_return_pct=round((cumulative - 1) * 100, 4),
        max_drawdown_pct=round(max_drawdown * 100, 4),
    )


def _annual_metrics(
    selections: list[SOPSelection],
) -> dict[str, dict[str, float | int]]:
    grouped: dict[str, list[SOPSelection]] = defaultdict(list)
    for item in selections:
        grouped[item.trade_date[:4]].append(item)
    result = {}
    for year, items in sorted(grouped.items()):
        executable = [
            item
            for item in items
            if item.next_open_buyable
            and item.next_open_to_close_pct is not None
        ]
        returns = [item.next_open_to_close_pct for item in executable]
        result[year] = {
            "candidates": len(items),
            "continuation_hit_rate": _pct(
                sum(item.next_limit_up for item in items), len(items)
            ),
            "executable": len(executable),
            "avg_open_to_close_pct": round(mean(returns), 4)
            if returns
            else 0.0,
        }
    return result


def _pct(numerator: int, denominator: int) -> float:
    return round(100 * numerator / denominator, 4) if denominator else 0.0


def write_sop_results(
    report: SOPBacktestReport,
    selections: list[SOPSelection],
    output_dir: str | Path,
) -> tuple[Path, Path]:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = f"sop_v31_backtest_{report.data_start}_{report.data_end}"
    report_path = output_dir / f"{stem}.json"
    csv_path = output_dir / f"{stem}_ranked_top3.csv"
    report_path.write_text(
        json.dumps(report.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    with csv_path.open("w", encoding="utf-8-sig", newline="") as file:
        fieldnames = list(SOPSelection.__dataclass_fields__)
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(asdict(item) for item in selections)
    return report_path, csv_path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="回测 Sharon SOP v3.1 可观测规则")
    parser.add_argument("--database", required=True, type=Path)
    parser.add_argument("--start", required=True, type=date.fromisoformat)
    parser.add_argument("--end", required=True, type=date.fromisoformat)
    parser.add_argument(
        "--output-dir", default=Path("data/backtest/results"), type=Path
    )
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    report, _, ranked = SOPV31Backtester(args.database).run(
        args.start, args.end
    )
    report_path, csv_path = write_sop_results(
        report, ranked, args.output_dir
    )
    print(json.dumps(report.to_dict(), ensure_ascii=False, indent=2))
    print(f"报告: {report_path}")
    print(f"每日前三: {csv_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
