"""After-close limit-up continuation screener (涨停接力选股).

Supports two score modes:
1. ``relay`` — original hot-sector / seal-quality continuation ranker
2. ``v31_reverse`` — JoinQuant V31 reverse multi-factor scorer adapted to the
   East Money limit-up pool (no external XGBoost / money-flow APIs)

Sharon never auto-orders; V31 exit/position rules are emitted as plan hints.
When they conflict with Sharon L1 hard rules (单票≤25%、总仓≤60%、-7%止损),
execution pre-checks still use the stricter L1 limits.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Literal
from zoneinfo import ZoneInfo

from .market_data import USER_AGENT, normalize_stock_code


SHANGHAI = ZoneInfo("Asia/Shanghai")
ScoreMode = Literal["relay", "v31_reverse"]


@dataclass(frozen=True)
class V31ReverseParams:
    """JoinQuant V31 reverse parameters used for screening + plan hints."""

    score_threshold: float = 75.0
    weak_zt_threshold: int = 30
    max_board_count: int = 7
    stop_loss: float = -0.028
    take_profit_half: float = 0.06
    take_profit_full: float = 0.18
    max_hold_trading_days: int = 5
    single_position: float = 0.30
    max_positions: int = 3
    total_position_cap: float = 0.80
    open_buy_upper: float = 0.05
    open_buy_lower: float = -0.03
    loss_streak_trigger: int = 3
    cooldown_days: int = 3

    def plan_hints(self) -> tuple[str, ...]:
        return (
            f"止损 {self.stop_loss:.1%} / +{self.take_profit_half:.0%}卖半 / "
            f"+{self.take_profit_full:.0%}清仓",
            f"单票≤{self.single_position:.0%} · 最多{self.max_positions}只 · "
            f"总仓≤{self.total_position_cap:.0%}",
            "周一至周四建仓、每日最多买1只；周五清仓",
            f"最大持有 {self.max_hold_trading_days} 个交易日",
            f"开盘涨幅区间 [{self.open_buy_lower:.0%}, {self.open_buy_upper:.0%}]",
            f"连亏{self.loss_streak_trigger}次冷却{self.cooldown_days}天",
            "落单时仍以 Sharon L1 更严红线为准（单票≤25%/总仓≤60%/-7%止损）",
        )


DEFAULT_V31_PARAMS = V31ReverseParams()


@dataclass(frozen=True)
class LimitUpStock:
    stock_code: str
    stock_name: str
    sector: str
    last_price: Decimal
    change_pct: Decimal
    amount: Decimal
    seal_fund: Decimal
    board_count: int
    first_limit_time: str
    last_limit_time: str
    open_count: int
    turnover_pct: Decimal | None
    trade_date: str


@dataclass(frozen=True)
class HotSector:
    name: str
    limit_up_count: int
    rank: int


@dataclass(frozen=True)
class LimitUpPick:
    stock: LimitUpStock
    score: float
    reasons: tuple[str, ...]
    sector_rank: int
    sector_limit_up_count: int
    strategy_mode: ScoreMode = "relay"
    strategy_label: str = "涨停接力策略"
    plan_hints: tuple[str, ...] = field(default_factory=tuple)

    def to_candidate_payload(self) -> dict[str, Any]:
        reason = "；".join(self.reasons)
        plan = ("｜".join(self.plan_hints) + "。") if self.plan_hints else ""
        return {
            "stock_code": self.stock.stock_code,
            "stock_name": self.stock.stock_name,
            "sector": self.stock.sector or "涨停题材",
            "external_score": round(min(99.0, max(1.0, self.score)), 1),
            "selection_reason": (
                f"[{self.stock.trade_date}] {self.strategy_label}评分 "
                f"{self.score:.1f}。{reason}"
                + (f" 计划：{plan}" if plan else "")
            ),
            "source_ai": self.strategy_label,
        }

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self.stock)
        payload.update(
            {
                "score": self.score,
                "reasons": list(self.reasons),
                "sector_rank": self.sector_rank,
                "sector_limit_up_count": self.sector_limit_up_count,
                "strategy_mode": self.strategy_mode,
                "strategy_label": self.strategy_label,
                "plan_hints": list(self.plan_hints),
            }
        )
        return payload


def default_trade_date(today: date | None = None) -> str:
    """Return YYYYMMDD; on weekends roll back to Friday."""
    day = today or datetime.now(SHANGHAI).date()
    while day.weekday() >= 5:  # Sat/Sun
        day -= timedelta(days=1)
    return day.strftime("%Y%m%d")


def _hhmmss_from_eastmoney(value: Any) -> str:
    raw = str(value or "0").zfill(6)
    if len(raw) > 6:
        raw = raw[-6:]
    return f"{raw[0:2]}:{raw[2:4]}:{raw[4:6]}"


def _minutes_from_open(hhmmss: str) -> int:
    try:
        hour, minute, _second = (int(part) for part in hhmmss.split(":"))
    except ValueError:
        return 24 * 60
    return hour * 60 + minute


def parse_limit_up_pool(
    payload: dict[str, Any], *, trade_date: str
) -> list[LimitUpStock]:
    rows = ((payload or {}).get("data") or {}).get("pool") or []
    stocks: list[LimitUpStock] = []
    for row in rows:
        code = str(row.get("c") or "").zfill(6)
        name = str(row.get("n") or code)
        if not code.isdigit():
            continue
        if "ST" in name.upper():
            continue
        price_raw = Decimal(str(row.get("p") or 0))
        # East Money zt pool price is usually yuan * 1000.
        price = price_raw / Decimal("1000") if price_raw > 100 else price_raw
        if price <= 0:
            continue
        change = Decimal(str(row.get("zdp") or 0))
        amount = Decimal(str(row.get("amount") or 0))
        fund = Decimal(str(row.get("fund") or 0))
        board = int(row.get("lbc") or 1)
        open_count = int(row.get("zbc") or 0)
        turnover = row.get("hs")
        stocks.append(
            LimitUpStock(
                stock_code=normalize_stock_code(code),
                stock_name=name,
                sector=str(row.get("hybk") or "未分类"),
                last_price=price,
                change_pct=change,
                amount=amount,
                seal_fund=fund,
                board_count=max(1, board),
                first_limit_time=_hhmmss_from_eastmoney(row.get("fbt")),
                last_limit_time=_hhmmss_from_eastmoney(row.get("lbt")),
                open_count=max(0, open_count),
                turnover_pct=(
                    Decimal(str(turnover)) if turnover not in (None, "") else None
                ),
                trade_date=trade_date,
            )
        )
    return stocks


def build_hot_sectors(stocks: list[LimitUpStock], *, top_n: int = 8) -> list[HotSector]:
    counter = Counter(item.sector for item in stocks if item.sector)
    ranked = counter.most_common(top_n)
    return [
        HotSector(name=name, limit_up_count=count, rank=index + 1)
        for index, (name, count) in enumerate(ranked)
    ]


def score_limit_up_continuation(
    stock: LimitUpStock,
    *,
    hot_sectors: list[HotSector],
) -> LimitUpPick:
    sector_map = {item.name: item for item in hot_sectors}
    hot = sector_map.get(stock.sector)
    sector_rank = hot.rank if hot else 99
    sector_count = hot.limit_up_count if hot else 0
    score = 40.0
    reasons: list[str] = []

    if hot and sector_count >= 3:
        bonus = max(0.0, 22.0 - (sector_rank - 1) * 2.5)
        score += bonus
        reasons.append(f"热门板块「{stock.sector}」涨停 {sector_count} 家(第{sector_rank})")
    elif hot:
        score += 8.0
        reasons.append(f"板块「{stock.sector}」有 {sector_count} 家涨停")
    else:
        score -= 6.0
        reasons.append("板块热度一般")

    first_min = _minutes_from_open(stock.first_limit_time)
    # 09:25=565, 10:00=600, 11:00=660, 13:00=780, 14:30=870
    if first_min <= 600:
        score += 18.0
        reasons.append(f"早盘封板 {stock.first_limit_time}")
    elif first_min <= 660:
        score += 12.0
        reasons.append(f"上午封板 {stock.first_limit_time}")
    elif first_min <= 810:
        score += 5.0
        reasons.append(f"午后偏早封板 {stock.first_limit_time}")
    else:
        score -= 8.0
        reasons.append(f"尾盘封板 {stock.first_limit_time}，接力风险高")

    if stock.open_count == 0:
        score += 12.0
        reasons.append("未炸板，封单质量较好")
    elif stock.open_count == 1:
        score += 2.0
        reasons.append("炸板 1 次，需谨慎")
    else:
        score -= 10.0 * min(stock.open_count, 3)
        reasons.append(f"炸板 {stock.open_count} 次，次日分歧大")

    if stock.board_count == 1:
        score += 10.0
        reasons.append("首板，空间板潜力")
    elif stock.board_count == 2:
        score += 14.0
        reasons.append("2 连板，情绪接力常见区")
    elif stock.board_count == 3:
        score += 8.0
        reasons.append("3 连板，关注高潮分歧")
    elif stock.board_count == 4:
        score += 2.0
        reasons.append("4 连板，高位博弈")
    else:
        score -= 8.0
        reasons.append(f"{stock.board_count} 连板，退潮风险偏高")

    if stock.amount > 0:
        seal_ratio = float(stock.seal_fund / stock.amount)
        if seal_ratio >= 0.8:
            score += 10.0
            reasons.append(f"封单/成交额比 {seal_ratio:.0%} 强")
        elif seal_ratio >= 0.35:
            score += 5.0
            reasons.append(f"封单力度中等 {seal_ratio:.0%}")
        else:
            score -= 4.0
            reasons.append(f"封单偏弱 {seal_ratio:.0%}")

    if stock.turnover_pct is not None:
        turn = float(stock.turnover_pct)
        if 3.0 <= turn <= 18.0:
            score += 4.0
        elif turn > 30.0:
            score -= 5.0
            reasons.append(f"换手过高 {turn:.1f}%")

    # ChiNext / STAR 20% boards still eligible but slightly lower continuity base.
    if stock.stock_code.startswith(("300", "301", "688")):
        score -= 3.0
        reasons.append("创业板/科创板波动更大")

    score = max(1.0, min(99.0, score))
    return LimitUpPick(
        stock=stock,
        score=score,
        reasons=tuple(reasons),
        sector_rank=sector_rank,
        sector_limit_up_count=sector_count,
        strategy_mode="relay",
        strategy_label="涨停接力策略",
    )


def score_v31_reverse(
    stock: LimitUpStock,
    *,
    hot_sectors: list[HotSector],
    params: V31ReverseParams | None = None,
) -> LimitUpPick:
    """Multi-factor V31 reverse score adapted from the JoinQuant strategy.

    Weight target (≈100): 资金30 + 量能20 + 波动率15 + 形态15 + 位置10 + 行业10.
    Reverse tilt: high activity / unbroken momentum / hot sector get more points.
    """
    cfg = params or DEFAULT_V31_PARAMS
    sector_map = {item.name: item for item in hot_sectors}
    hot = sector_map.get(stock.sector)
    sector_rank = hot.rank if hot else 99
    sector_count = hot.limit_up_count if hot else 0
    score = 0.0
    reasons: list[str] = []

    # ---- 资金因子 (30) · 封单/成交额 proxy for money-flow ----
    money_score = 12.0
    if stock.amount > 0:
        seal_ratio = float(stock.seal_fund / stock.amount)
        if seal_ratio >= 0.8:
            money_score = 28.0
            reasons.append(f"封单强 {seal_ratio:.0%}")
        elif seal_ratio >= 0.35:
            money_score = 22.0
            reasons.append(f"封单中等 {seal_ratio:.0%}")
        elif seal_ratio >= 0.1:
            money_score = 16.0
        else:
            money_score = 10.0
            reasons.append(f"封单偏弱 {seal_ratio:.0%}")
    amount = float(stock.amount)
    if amount >= 800_000_000:
        money_score = min(30.0, money_score + 2.0)
    score += money_score

    # ---- 量能因子 (20) · reverse: sudden high turnover scores up ----
    volume_score = 8.0
    if stock.turnover_pct is not None:
        turn = float(stock.turnover_pct)
        if turn > 18:
            volume_score = 20.0
            reasons.append(f"突然放量换手 {turn:.1f}%")
        elif turn > 10:
            volume_score = 16.0
            reasons.append(f"放量换手 {turn:.1f}%")
        elif turn > 5:
            volume_score = 12.0
        elif turn > 2:
            volume_score = 8.0
        else:
            volume_score = 4.0
    score += volume_score

    # ---- 波动率因子 (15) · reverse: higher volatility preferred ----
    vol_score = 5.0
    change = abs(float(stock.change_pct))
    if stock.stock_code.startswith(("300", "301", "688")):
        vol_score += 6.0
        reasons.append("高波动板块(创业/科创)")
    if change >= 19.5:
        vol_score += 4.0
    elif change >= 9.5:
        vol_score += 3.0
    else:
        vol_score += 1.0
    if stock.open_count >= 1:
        # Intraday fight raises realized amplitude — reverse bonus, capped.
        vol_score += min(3.0, float(stock.open_count))
    score += min(15.0, vol_score)

    # ---- 形态因子 (15) · boards / unbroken seal / early seal ----
    shape_score = 0.0
    boards = stock.board_count
    if boards >= 3:
        shape_score += 8.0
        reasons.append(f"{boards}连板")
    elif boards >= 2:
        shape_score += 5.0
        reasons.append("2连板")
    else:
        shape_score += 3.0
        reasons.append("首板")
    if stock.open_count == 0:
        shape_score += 5.0
        reasons.append("未炸板")
    else:
        shape_score += 2.0
        reasons.append(f"炸板{stock.open_count}次")
    first_min = _minutes_from_open(stock.first_limit_time)
    # Early/open-board ≈ 一字/强势加速
    if first_min <= 575:  # ~09:35
        shape_score += 2.0
        reasons.append(f"早盘强封 {stock.first_limit_time}")
    score += min(15.0, shape_score)

    # ---- 估值/位置因子 (10) · reverse: near highs / positive bias ----
    position_score = 0.0
    # Unbroken early seal ≈ breakout above upper band.
    if stock.open_count == 0 and first_min <= 660:
        position_score += 5.0
        reasons.append("突破强封位置")
    elif stock.open_count == 0:
        position_score += 4.0
    else:
        position_score += 2.0
    # Higher boards ≈ positive bias vs short MA cluster.
    if boards >= 3:
        position_score += 5.0
        reasons.append("正乖离/高位加速")
    elif boards >= 2:
        position_score += 4.0
    else:
        position_score += 3.0
    score += min(10.0, position_score)

    # ---- 行业因子 (10) ----
    if hot and sector_count >= 3:
        industry_score = max(4.0, 10.0 - (sector_rank - 1) * 1.5)
        reasons.append(
            f"热门板块「{stock.sector}」涨停{sector_count}家(第{sector_rank})"
        )
    elif hot:
        industry_score = 6.0
        reasons.append(f"板块「{stock.sector}」有{sector_count}家涨停")
    else:
        industry_score = 3.0
        reasons.append("板块热度一般")
    score += industry_score

    score = max(1.0, min(100.0, score))
    return LimitUpPick(
        stock=stock,
        score=score,
        reasons=tuple(reasons),
        sector_rank=sector_rank,
        sector_limit_up_count=sector_count,
        strategy_mode="v31_reverse",
        strategy_label="V31反向版",
        plan_hints=cfg.plan_hints(),
    )


class LimitUpScreener:
    """Fetch East Money limit-up pool and rank next-day continuation candidates."""

    ZT_ENDPOINT = "https://push2ex.eastmoney.com/getTopicZTPool"

    def __init__(self, *, timeout: float = 15.0) -> None:
        self.timeout = timeout

    def fetch_limit_up_pool(self, trade_date: str | None = None) -> list[LimitUpStock]:
        day = trade_date or default_trade_date()
        # Try requested day then previous sessions if empty (holiday / before publish).
        for offset in range(0, 5):
            candidate_day = (
                datetime.strptime(day, "%Y%m%d").date() - timedelta(days=offset)
            )
            while candidate_day.weekday() >= 5:
                candidate_day -= timedelta(days=1)
            stamp = candidate_day.strftime("%Y%m%d")
            payload = self._get_json(
                self.ZT_ENDPOINT,
                {
                    "ut": "7eea3edcaed734bea9cbfc24409ed989",
                    "dpt": "wz.ztzt",
                    "Pageindex": "0",
                    "pagesize": "500",
                    "sort": "fbt:asc",
                    "date": stamp,
                },
            )
            stocks = parse_limit_up_pool(payload, trade_date=stamp)
            if stocks:
                return stocks
        return []

    def screen(
        self,
        *,
        trade_date: str | None = None,
        top_n: int = 3,
        hot_sector_n: int = 8,
        mode: ScoreMode = "relay",
        v31_params: V31ReverseParams | None = None,
    ) -> dict[str, Any]:
        cfg = v31_params or DEFAULT_V31_PARAMS
        stocks = self.fetch_limit_up_pool(trade_date)
        used_date = (
            stocks[0].trade_date if stocks else (trade_date or default_trade_date())
        )
        if not stocks:
            return {
                "trade_date": used_date,
                "pool_size": 0,
                "hot_sectors": [],
                "picks": [],
                "strategy_mode": mode,
                "market_state": "unknown",
                "message": "未获取到涨停池数据（可能非交易日或接口暂不可用）",
            }

        # V31 reverse: weak-market empty when limit-up breadth is too thin.
        if mode == "v31_reverse" and len(stocks) < cfg.weak_zt_threshold:
            hot_sectors = build_hot_sectors(stocks, top_n=hot_sector_n)
            return {
                "trade_date": used_date,
                "pool_size": len(stocks),
                "hot_sectors": [asdict(item) for item in hot_sectors],
                "picks": [],
                "pick_objects": [],
                "strategy_mode": mode,
                "market_state": "weak",
                "plan_hints": list(cfg.plan_hints()),
                "message": (
                    f"弱市空仓：涨停 {len(stocks)} 家 < 阈值 "
                    f"{cfg.weak_zt_threshold} 家（V31反向版）"
                ),
            }

        hot_sectors = build_hot_sectors(stocks, top_n=hot_sector_n)
        if mode == "v31_reverse":
            eligible = [
                stock
                for stock in stocks
                if stock.board_count <= cfg.max_board_count
            ]
            scored = [
                score_v31_reverse(stock, hot_sectors=hot_sectors, params=cfg)
                for stock in eligible
            ]
            scored = [item for item in scored if item.score >= cfg.score_threshold]
            label = "V31反向版"
        else:
            scored = [
                score_limit_up_continuation(stock, hot_sectors=hot_sectors)
                for stock in stocks
            ]
            label = "涨停接力"

        scored.sort(key=lambda item: (-item.score, item.stock.first_limit_time))
        top = scored[: max(1, top_n)]
        return {
            "trade_date": used_date,
            "pool_size": len(stocks),
            "hot_sectors": [asdict(item) for item in hot_sectors],
            "picks": [item.to_dict() for item in top],
            "pick_objects": top,
            "strategy_mode": mode,
            "market_state": "normal",
            "plan_hints": list(cfg.plan_hints()) if mode == "v31_reverse" else [],
            "message": (
                f"{used_date} 涨停 {len(stocks)} 只 · {label}入选 {len(top)}；"
                + (
                    f"热门板块 Top1「{hot_sectors[0].name}」"
                    f"（{hot_sectors[0].limit_up_count} 家）"
                    if hot_sectors
                    else "无热门板块"
                )
            ),
        }

    def _get_json(self, endpoint: str, params: dict[str, str]) -> dict[str, Any]:
        query = urllib.parse.urlencode(params)
        request = urllib.request.Request(
            f"{endpoint}?{query}",
            headers={
                "User-Agent": USER_AGENT,
                "Referer": "https://quote.eastmoney.com/ztb/detail#type=ztgc",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"涨停池请求失败：{exc}") from exc


__all__ = [
    "DEFAULT_V31_PARAMS",
    "HotSector",
    "LimitUpPick",
    "LimitUpScreener",
    "LimitUpStock",
    "ScoreMode",
    "V31ReverseParams",
    "build_hot_sectors",
    "default_trade_date",
    "parse_limit_up_pool",
    "score_limit_up_continuation",
    "score_v31_reverse",
]
