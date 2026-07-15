"""Score today's limit-up stocks for possible next-session continuation.

The model is intentionally deterministic and explainable.  It ranks candidates;
it does not claim that a limit-up event will occur or issue an order.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import asdict, dataclass
from datetime import date, datetime, time
from typing import Protocol
from zoneinfo import ZoneInfo

from tools.market_data import HotSector, LimitUpStock


SHANGHAI = ZoneInfo("Asia/Shanghai")


class LimitUpDataProvider(Protocol):
    def fetch_limit_up_stocks(
        self, trading_date: date | None = None
    ) -> list[LimitUpStock]: ...

    def fetch_hot_sectors(self, limit: int = 20) -> list[HotSector]: ...


@dataclass(frozen=True)
class StrategyConfig:
    max_candidates: int = 3
    min_score: float = 55.0
    hot_sector_top_n: int = 20
    min_turnover_rate: float = 1.0
    max_turnover_rate: float = 35.0
    max_open_count: int = 3
    min_seal_ratio: float = 0.001
    exclude_name_markers: tuple[str, ...] = ("ST", "退")

    def __post_init__(self) -> None:
        if not 1 <= self.max_candidates <= 20:
            raise ValueError("max_candidates 必须在 1 到 20 之间")
        if not 0 <= self.min_score <= 100:
            raise ValueError("min_score 必须在 0 到 100 之间")
        if self.min_turnover_rate > self.max_turnover_rate:
            raise ValueError("最小换手率不能大于最大换手率")


@dataclass(frozen=True)
class Candidate:
    code: str
    name: str
    sector: str
    score: float
    board_count: int
    seal_ratio: float
    first_seal_time: str
    turnover_rate: float
    open_count: int
    breakdown: dict[str, float]
    reasons: tuple[str, ...]
    risks: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        payload = asdict(self)
        payload["seal_ratio_pct"] = round(self.seal_ratio * 100, 3)
        return payload


@dataclass(frozen=True)
class ScreeningResult:
    trading_date: date
    generated_at: datetime
    limit_up_count: int
    eligible_count: int
    sector_limit_up_counts: dict[str, int]
    candidates: tuple[Candidate, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "trading_date": self.trading_date.isoformat(),
            "generated_at": self.generated_at.isoformat(timespec="seconds"),
            "limit_up_count": self.limit_up_count,
            "eligible_count": self.eligible_count,
            "sector_limit_up_counts": self.sector_limit_up_counts,
            "candidates": [candidate.to_dict() for candidate in self.candidates],
            "disclaimer": "评分仅用于研究和次日观察，不构成投资建议或收益保证。",
        }


class LimitUpContinuationStrategy:
    """Combine limit-up breadth and sector momentum into a 0-100 score."""

    def __init__(self, config: StrategyConfig | None = None) -> None:
        self.config = config or StrategyConfig()

    def run(
        self, provider: LimitUpDataProvider, trading_date: date | None = None
    ) -> ScreeningResult:
        trading_date = trading_date or datetime.now(SHANGHAI).date()
        stocks = provider.fetch_limit_up_stocks(trading_date)
        sectors = provider.fetch_hot_sectors(self.config.hot_sector_top_n)
        return self.screen(stocks, sectors, trading_date)

    def screen(
        self,
        stocks: list[LimitUpStock],
        hot_sectors: list[HotSector],
        trading_date: date | None = None,
    ) -> ScreeningResult:
        trading_date = trading_date or datetime.now(SHANGHAI).date()
        sector_counts = Counter(stock.sector or "未分类" for stock in stocks)
        max_sector_count = max(sector_counts.values(), default=1)
        sector_by_name = {sector.name: sector for sector in hot_sectors}

        ranked: list[Candidate] = []
        eligible_count = 0
        for stock in stocks:
            seal_ratio = (
                stock.seal_amount / stock.circulating_market_cap
                if stock.circulating_market_cap > 0
                else 0.0
            )
            if not self._eligible(stock, seal_ratio):
                continue
            eligible_count += 1
            hot_sector = _match_sector(stock.sector, sector_by_name)
            candidate = self._score(
                stock,
                seal_ratio,
                sector_counts[stock.sector],
                max_sector_count,
                hot_sector,
            )
            if candidate.score >= self.config.min_score:
                ranked.append(candidate)

        ranked.sort(
            key=lambda item: (item.score, item.seal_ratio, -item.open_count),
            reverse=True,
        )
        return ScreeningResult(
            trading_date=trading_date,
            generated_at=datetime.now(SHANGHAI),
            limit_up_count=len(stocks),
            eligible_count=eligible_count,
            sector_limit_up_counts=dict(sector_counts.most_common()),
            candidates=tuple(ranked[: self.config.max_candidates]),
        )

    def _eligible(self, stock: LimitUpStock, seal_ratio: float) -> bool:
        upper_name = stock.name.upper()
        return (
            not any(marker.upper() in upper_name for marker in self.config.exclude_name_markers)
            and stock.sector != "未分类"
            and self.config.min_turnover_rate
            <= stock.turnover_rate
            <= self.config.max_turnover_rate
            and stock.open_count <= self.config.max_open_count
            and seal_ratio >= self.config.min_seal_ratio
        )

    def _score(
        self,
        stock: LimitUpStock,
        seal_ratio: float,
        sector_count: int,
        max_sector_count: int,
        hot_sector: HotSector | None,
    ) -> Candidate:
        breadth_score = 15.0 * sector_count / max_sector_count
        board_momentum_score = 0.0
        if hot_sector:
            rank_factor = max(
                0.0,
                (self.config.hot_sector_top_n - hot_sector.rank + 1)
                / self.config.hot_sector_top_n,
            )
            board_momentum_score = 10.0 * rank_factor + min(
                5.0, max(0.0, hot_sector.change_pct)
            )
        sector_score = min(30.0, breadth_score + board_momentum_score)
        seal_score = min(25.0, 25.0 * seal_ratio / 0.02)
        time_score = _first_seal_score(stock.first_seal_time)
        turnover_score = _turnover_score(stock.turnover_rate)
        stability_score = max(0.0, 10.0 - stock.open_count * 2.5)
        board_score = _board_height_score(stock.board_count)
        breakdown = {
            "sector_heat": round(sector_score, 2),
            "seal_strength": round(seal_score, 2),
            "first_seal": round(time_score, 2),
            "turnover": round(turnover_score, 2),
            "seal_stability": round(stability_score, 2),
            "board_height": round(board_score, 2),
        }
        score = round(min(100.0, sum(breakdown.values())), 2)

        reasons = [
            f"{stock.sector}板块当日有{sector_count}只涨停",
            f"封单/流通市值{seal_ratio * 100:.2f}%",
            f"{stock.first_seal_time or '未知时间'}首次封板",
            f"{stock.board_count}连板、换手率{stock.turnover_rate:.1f}%",
        ]
        if hot_sector:
            reasons.insert(
                1,
                f"行业涨幅榜第{hot_sector.rank}名（{hot_sector.change_pct:+.2f}%）",
            )
        risks = []
        if stock.board_count >= 4:
            risks.append("高位连板，分歧与回撤风险较高")
        if stock.open_count:
            risks.append(f"盘中开板{stock.open_count}次，封板稳定性下降")
        if stock.turnover_rate >= 25:
            risks.append("换手率偏高，资金分歧明显")
        if not hot_sector:
            risks.append("未进入行业板块涨幅榜前列")

        return Candidate(
            code=stock.code,
            name=stock.name,
            sector=stock.sector,
            score=score,
            board_count=stock.board_count,
            seal_ratio=seal_ratio,
            first_seal_time=stock.first_seal_time,
            turnover_rate=stock.turnover_rate,
            open_count=stock.open_count,
            breakdown=breakdown,
            reasons=tuple(reasons),
            risks=tuple(risks),
        )


def _match_sector(
    stock_sector: str, sectors: dict[str, HotSector]
) -> HotSector | None:
    if stock_sector in sectors:
        return sectors[stock_sector]
    for name, sector in sectors.items():
        if stock_sector in name or name in stock_sector:
            return sector
    return None


def _first_seal_score(clock: str) -> float:
    try:
        value = time.fromisoformat(clock)
    except ValueError:
        return 0.0
    minutes = value.hour * 60 + value.minute + value.second / 60
    market_close = 15 * 60
    if minutes <= 10 * 60:
        return 15.0
    return max(0.0, 15.0 * (market_close - minutes) / (market_close - 10 * 60))


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
        return 3.0
    if board_count == 2:
        return 7.0
    if board_count == 3:
        return 10.0
    if board_count == 4:
        return 8.0
    return 6.0
