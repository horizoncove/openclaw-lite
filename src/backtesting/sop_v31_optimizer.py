"""Guardrail and walk-forward optimization for SOP v3.1 entry decisions."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from datetime import date, datetime
from itertools import product
from pathlib import Path
from statistics import mean
from typing import Iterable
from zoneinfo import ZoneInfo

import pandas as pd

from .sop_v31_backtest import (
    SOPSelection,
    SOPV31Backtester,
)


SHANGHAI = ZoneInfo("Asia/Shanghai")


@dataclass(frozen=True)
class GuardrailParameters:
    board_counts: tuple[int, ...] = (3,)
    max_float_market_cap_yi: int = 70
    min_turnover_rate: int = 5
    max_turnover_rate: int = 30
    min_sector_limit_ups: int = 3
    max_market_limit_ups: int = 80
    max_next_open_gap_pct: int = 4


@dataclass(frozen=True)
class OptimizedMetrics:
    trades: int
    signal_days: int
    win_probability_after_cost: float
    loss_probability_after_cost: float
    average_net_return_pct: float
    cumulative_net_return_pct: float
    max_drawdown_pct: float
    annual: dict[str, dict[str, float | int]]


@dataclass(frozen=True)
class WalkForwardPeriod:
    test_year: int
    training_years: tuple[int, ...]
    parameters: GuardrailParameters
    training_samples: int
    test_metrics: OptimizedMetrics


@dataclass(frozen=True)
class DeploymentDecision:
    approved: bool
    minimum_out_of_sample_trades: int
    minimum_win_probability_after_cost: float
    minimum_average_net_return_pct: float
    maximum_drawdown_pct: float
    reasons: tuple[str, ...]
    next_step: str


@dataclass(frozen=True)
class OptimizationReport:
    generated_at: str
    model: str
    one_way_cost_bps: float
    static_parameters: GuardrailParameters
    static_in_sample: OptimizedMetrics
    walk_forward_out_of_sample: OptimizedMetrics
    walk_forward_periods: tuple[WalkForwardPeriod, ...]
    deployment_decision: DeploymentDecision
    deployment_rules: tuple[str, ...]
    warnings: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


class SOPV31Optimizer:
    """Optimize only on past years and apply parameters to the next year."""

    def __init__(
        self,
        *,
        one_way_cost_bps: float = 10.0,
        max_daily_candidates: int = 3,
        minimum_training_samples: int = 150,
        minimum_samples_per_year: int = 20,
    ) -> None:
        self.one_way_cost_bps = one_way_cost_bps
        self.max_daily_candidates = max_daily_candidates
        self.minimum_training_samples = minimum_training_samples
        self.minimum_samples_per_year = minimum_samples_per_year

    def run(
        self, strict_pool: list[SOPSelection]
    ) -> tuple[OptimizationReport, list[SOPSelection], list[SOPSelection]]:
        frame = _to_frame(strict_pool, self.one_way_cost_bps)
        static_parameters = GuardrailParameters()
        static = self._select(frame, static_parameters)
        static_metrics = _optimized_metrics(static, self.one_way_cost_bps)

        years = sorted(int(value) for value in frame["year"].unique())
        periods: list[WalkForwardPeriod] = []
        out_of_sample_frames = []
        out_of_sample_selections: list[SOPSelection] = []
        for test_year in years:
            training_years = tuple(year for year in years if year < test_year)
            if len(training_years) < 2:
                continue
            training = frame[frame["year"].isin(training_years)]
            testing = frame[frame["year"] == test_year]
            parameters, training_samples = self._fit(training)
            selected_test = self._select(testing, parameters)
            selections = list(selected_test["selection"])
            metrics = _optimized_metrics(
                selected_test, self.one_way_cost_bps
            )
            periods.append(
                WalkForwardPeriod(
                    test_year=int(test_year),
                    training_years=training_years,
                    parameters=parameters,
                    training_samples=training_samples,
                    test_metrics=metrics,
                )
            )
            out_of_sample_frames.append(selected_test)
            out_of_sample_selections.extend(selections)

        combined = (
            pd.concat(out_of_sample_frames, ignore_index=True)
            if out_of_sample_frames
            else frame.iloc[0:0].copy()
        )
        out_of_sample_metrics = _optimized_metrics(
            combined, self.one_way_cost_bps
        )
        report = OptimizationReport(
            generated_at=datetime.now(SHANGHAI).isoformat(timespec="seconds"),
            model="sharon_sop_v31_walk_forward_guardrails",
            one_way_cost_bps=self.one_way_cost_bps,
            static_parameters=static_parameters,
            static_in_sample=static_metrics,
            walk_forward_out_of_sample=out_of_sample_metrics,
            walk_forward_periods=tuple(periods),
            deployment_decision=_deployment_decision(
                out_of_sample_metrics
            ),
            deployment_rules=(
                "收盘候选优先三连板，流通市值不超过70亿元",
                "换手率5%至30%，板块至少3只涨停",
                "全市场涨停超过80只时停止次日买入",
                "次日集合竞价高开超过4%时取消买入",
                "任何年度只允许使用此前年度数据调参",
                "每日最多3只，开盘涨停或数据缺失不交易",
            ),
            warnings=(
                "静态参数来自全样本探索，只能作为研究结果，不能视为样本外证明。",
                "滚动样本外仍可能出现亏损年份，无法保证单笔或年度盈利。",
                "优化数据缺少封板时间、封单金额和完整七星客观评分。",
                "参数搜索会产生数据窥探风险，实盘前需要新增时间段纸面交易验证。",
            ),
        )
        return report, list(static["selection"]), out_of_sample_selections

    def _fit(
        self, training: pd.DataFrame
    ) -> tuple[GuardrailParameters, int]:
        best: tuple[tuple[float, ...], GuardrailParameters, int] | None = None
        training_years = sorted(training["year"].unique())
        for parameters in _parameter_grid():
            selected = _filter_frame(training, parameters)
            if len(selected) < self.minimum_training_samples:
                continue
            annual = selected.groupby("year").agg(
                samples=("net_return", "size"),
                average=("net_return", "mean"),
                win=("net_win", "mean"),
            )
            if (
                any(year not in annual.index for year in training_years)
                or (annual["samples"] < self.minimum_samples_per_year).any()
                or annual["average"].min() <= 0
            ):
                continue
            objective = (
                float(annual["win"].min()),
                float(selected["net_win"].mean()),
                float(annual["average"].min()),
                float(selected["net_return"].mean()),
            )
            if best is None or objective > best[0]:
                best = (objective, parameters, len(selected))
        if best:
            return best[1], best[2]
        fallback = GuardrailParameters()
        return fallback, len(_filter_frame(training, fallback))

    def _select(
        self, frame: pd.DataFrame, parameters: GuardrailParameters
    ) -> pd.DataFrame:
        selected = _filter_frame(frame, parameters)
        return (
            selected.sort_values(
                ["trade_date", "ranking_strength"],
                ascending=[True, False],
            )
            .groupby("trade_date", as_index=False, sort=False)
            .head(self.max_daily_candidates)
            .copy()
        )


def _parameter_grid() -> Iterable[GuardrailParameters]:
    for values in product(
        ((2,), (3,), (4,), (2, 3)),
        (30, 50, 70, 100),
        (5, 10, 15),
        (20, 25, 30),
        (3, 4, 6),
        (60, 80, 100),
        (0, 1, 2, 3, 4, 5),
    ):
        boards, cap, minimum_turnover, maximum_turnover, sector, market, gap = values
        if minimum_turnover >= maximum_turnover:
            continue
        yield GuardrailParameters(
            board_counts=boards,
            max_float_market_cap_yi=cap,
            min_turnover_rate=minimum_turnover,
            max_turnover_rate=maximum_turnover,
            min_sector_limit_ups=sector,
            max_market_limit_ups=market,
            max_next_open_gap_pct=gap,
        )


def _to_frame(
    selections: list[SOPSelection], one_way_cost_bps: float
) -> pd.DataFrame:
    rows = []
    round_trip_cost_pct = one_way_cost_bps * 2 / 100
    for selection in selections:
        if (
            not selection.next_open_buyable
            or selection.next_open_to_close_pct is None
        ):
            continue
        net_return = (
            selection.next_open_to_close_pct - round_trip_cost_pct
        )
        row = asdict(selection)
        row.update(
            {
                "year": int(selection.trade_date[:4]),
                "net_return": net_return,
                "net_win": net_return > 0,
                "selection": selection,
            }
        )
        rows.append(row)
    if not rows:
        return pd.DataFrame(
            columns=[
                "trade_date",
                "year",
                "net_return",
                "net_win",
                "selection",
            ]
        )
    return pd.DataFrame(rows)


def _filter_frame(
    frame: pd.DataFrame, parameters: GuardrailParameters
) -> pd.DataFrame:
    if frame.empty:
        return frame.copy()
    return frame[
        frame["board_count"].isin(parameters.board_counts)
        & (
            frame["float_market_cap_yi"]
            <= parameters.max_float_market_cap_yi
        )
        & (
            frame["turnover_rate"]
            >= parameters.min_turnover_rate
        )
        & (
            frame["turnover_rate"]
            <= parameters.max_turnover_rate
        )
        & (
            frame["sector_limit_up_count"]
            >= parameters.min_sector_limit_ups
        )
        & (
            frame["market_limit_up_count"]
            <= parameters.max_market_limit_ups
        )
        & (
            frame["next_open_gap_pct"]
            <= parameters.max_next_open_gap_pct
        )
    ].copy()


def _optimized_metrics(
    frame: pd.DataFrame, one_way_cost_bps: float
) -> OptimizedMetrics:
    if frame.empty:
        return OptimizedMetrics(
            trades=0,
            signal_days=0,
            win_probability_after_cost=0.0,
            loss_probability_after_cost=0.0,
            average_net_return_pct=0.0,
            cumulative_net_return_pct=0.0,
            max_drawdown_pct=0.0,
            annual={},
        )
    daily = frame.groupby("next_trade_date")["net_return"].mean().sort_index()
    cumulative = 1.0
    peak = 1.0
    max_drawdown = 0.0
    for value in daily:
        cumulative *= 1 + value / 100
        peak = max(peak, cumulative)
        max_drawdown = min(max_drawdown, cumulative / peak - 1)
    annual = {}
    for year, values in frame.groupby("year"):
        annual[str(year)] = {
            "trades": len(values),
            "win_probability_after_cost": round(
                100 * values["net_win"].mean(), 4
            ),
            "average_net_return_pct": round(
                values["net_return"].mean(), 4
            ),
        }
    win_probability = 100 * frame["net_win"].mean()
    return OptimizedMetrics(
        trades=len(frame),
        signal_days=frame["trade_date"].nunique(),
        win_probability_after_cost=round(win_probability, 4),
        loss_probability_after_cost=round(100 - win_probability, 4),
        average_net_return_pct=round(frame["net_return"].mean(), 4),
        cumulative_net_return_pct=round((cumulative - 1) * 100, 4),
        max_drawdown_pct=round(max_drawdown * 100, 4),
        annual=annual,
    )


def _deployment_decision(
    metrics: OptimizedMetrics,
    *,
    minimum_trades: int = 200,
    minimum_win_probability: float = 55.0,
    minimum_average_return: float = 0.3,
    maximum_drawdown: float = -20.0,
) -> DeploymentDecision:
    reasons = []
    if metrics.trades < minimum_trades:
        reasons.append(
            f"样本外交易仅{metrics.trades}笔，低于{minimum_trades}笔门槛"
        )
    if metrics.win_probability_after_cost < minimum_win_probability:
        reasons.append(
            f"扣费后胜率{metrics.win_probability_after_cost:.2f}%，"
            f"低于{minimum_win_probability:.2f}%门槛"
        )
    if metrics.average_net_return_pct < minimum_average_return:
        reasons.append(
            f"平均净收益{metrics.average_net_return_pct:.2f}%，"
            f"低于{minimum_average_return:.2f}%门槛"
        )
    if metrics.max_drawdown_pct < maximum_drawdown:
        reasons.append(
            f"最大回撤{metrics.max_drawdown_pct:.2f}%，"
            f"超过{abs(maximum_drawdown):.2f}%限制"
        )
    negative_years = [
        year
        for year, values in metrics.annual.items()
        if values["average_net_return_pct"] <= 0
    ]
    if negative_years:
        reasons.append(
            f"存在平均净收益不为正的样本外年度: {', '.join(negative_years)}"
        )
    approved = not reasons
    return DeploymentDecision(
        approved=approved,
        minimum_out_of_sample_trades=minimum_trades,
        minimum_win_probability_after_cost=minimum_win_probability,
        minimum_average_net_return_pct=minimum_average_return,
        maximum_drawdown_pct=maximum_drawdown,
        reasons=tuple(reasons),
        next_step=(
            "可以进入小仓位人工确认阶段，仍不得自动下单"
            if approved
            else "禁止实盘；补充封板、竞价和资金流数据后，用全新连续样本纸面验证"
        ),
    )


def write_optimization_report(
    report: OptimizationReport, output_dir: str | Path
) -> Path:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / "sop_v31_optimization_report.json"
    path.write_text(
        json.dumps(report.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="滚动优化 Sharon SOP v3.1")
    parser.add_argument("--database", required=True, type=Path)
    parser.add_argument("--start", required=True, type=date.fromisoformat)
    parser.add_argument("--end", required=True, type=date.fromisoformat)
    parser.add_argument(
        "--output-dir", default=Path("data/backtest/results"), type=Path
    )
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    _, strict_pool, _ = SOPV31Backtester(args.database).run(
        args.start, args.end
    )
    report, _, _ = SOPV31Optimizer().run(strict_pool)
    report_path = write_optimization_report(report, args.output_dir)
    print(json.dumps(report.to_dict(), ensure_ascii=False, indent=2))
    print(f"优化报告: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
