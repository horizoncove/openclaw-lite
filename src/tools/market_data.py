"""A-share market data used by the limit-up continuation strategy."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any
from zoneinfo import ZoneInfo

import requests


SHANGHAI = ZoneInfo("Asia/Shanghai")


class MarketDataError(RuntimeError):
    """Raised when the upstream market-data response is unusable."""


@dataclass(frozen=True)
class LimitUpStock:
    code: str
    name: str
    sector: str
    change_pct: float
    latest_price: float
    turnover_rate: float
    seal_amount: float
    circulating_market_cap: float
    first_seal_time: str
    last_seal_time: str
    open_count: int
    board_count: int


@dataclass(frozen=True)
class HotSector:
    name: str
    change_pct: float
    main_net_inflow: float
    rank: int


class EastmoneyMarketData:
    """Fetch the daily limit-up pool and industry-board ranking from Eastmoney.

    Eastmoney is a public, unauthenticated upstream and may change its response
    format.  Keeping it behind this adapter lets tests and alternative licensed
    data providers use the same strategy interface.
    """

    LIMIT_UP_URL = "https://push2ex.eastmoney.com/getTopicZTPool"
    SECTOR_URL = "https://push2.eastmoney.com/api/qt/clist/get"
    TOKEN = "7eea3edcaed734bea9cbfc24409ed989"

    def __init__(
        self,
        *,
        timeout: float = 10.0,
        session: requests.Session | None = None,
    ) -> None:
        self.timeout = timeout
        self.session = session or requests.Session()
        self.session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 Chrome/124.0 Safari/537.36"
                ),
                "Referer": "https://quote.eastmoney.com/",
            }
        )

    def fetch_limit_up_stocks(
        self, trading_date: date | None = None
    ) -> list[LimitUpStock]:
        trading_date = trading_date or datetime.now(SHANGHAI).date()
        payload = self._get_json(
            self.LIMIT_UP_URL,
            {
                "ut": self.TOKEN,
                "dpt": "wz.ztzt",
                "Pageindex": 0,
                "pagesize": 1000,
                "sort": "fbt:asc",
                "date": trading_date.strftime("%Y%m%d"),
            },
        )
        pool = (payload.get("data") or {}).get("pool")
        if pool is None:
            raise MarketDataError("东方财富涨停池响应缺少 data.pool")

        stocks: list[LimitUpStock] = []
        for item in pool:
            code = str(item.get("c") or "").zfill(6)
            name = str(item.get("n") or "").strip()
            if not (code.isdigit() and len(code) == 6 and name):
                continue
            stocks.append(
                LimitUpStock(
                    code=code,
                    name=name,
                    sector=str(item.get("hybk") or "未分类").strip(),
                    change_pct=_number(item.get("zdp")),
                    latest_price=_number(item.get("p")) / 1000,
                    turnover_rate=_number(item.get("hs")),
                    seal_amount=_number(item.get("fund")),
                    circulating_market_cap=_number(item.get("ltsz")),
                    first_seal_time=_clock(item.get("fbt")),
                    last_seal_time=_clock(item.get("lbt")),
                    open_count=int(_number(item.get("zbc"))),
                    board_count=max(1, int(_number(item.get("lbc"), 1))),
                )
            )
        return stocks

    def fetch_hot_sectors(self, limit: int = 20) -> list[HotSector]:
        payload = self._get_json(
            self.SECTOR_URL,
            {
                "pn": 1,
                "pz": max(1, limit),
                "po": 1,
                "np": 1,
                "fltt": 2,
                "invt": 2,
                "fid": "f3",
                "fs": "m:90+t:2",
                "fields": "f14,f3,f62",
            },
        )
        rows = ((payload.get("data") or {}).get("diff")) or []
        sectors: list[HotSector] = []
        for index, item in enumerate(rows, start=1):
            name = str(item.get("f14") or "").strip()
            if name:
                sectors.append(
                    HotSector(
                        name=name,
                        change_pct=_number(item.get("f3")),
                        main_net_inflow=_number(item.get("f62")),
                        rank=index,
                    )
                )
        return sectors

    def _get_json(self, url: str, params: dict[str, Any]) -> dict[str, Any]:
        try:
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            payload = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise MarketDataError(f"行情请求失败: {exc}") from exc
        if not isinstance(payload, dict):
            raise MarketDataError("行情响应不是 JSON 对象")
        return payload


def _number(value: Any, default: float = 0.0) -> float:
    try:
        if value in (None, "", "-"):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _clock(value: Any) -> str:
    digits = "".join(character for character in str(value or "") if character.isdigit())
    if not digits or len(digits) > 6:
        return ""
    digits = digits.zfill(6)
    try:
        return datetime.strptime(digits, "%H%M%S").strftime("%H:%M:%S")
    except ValueError:
        return ""
