"""Public market-data verification used by the SOP truthfulness rule."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class MarketDataError(RuntimeError):
    """Raised when a quote cannot be verified from the configured provider."""


@dataclass(frozen=True)
class MarketQuote:
    stock_code: str
    stock_name: str
    price: Decimal
    change_pct: Decimal
    market_cap_yi: Decimal
    turnover_rate: Decimal
    source: str
    fetched_at: str


class EastmoneyClient:
    """Minimal Eastmoney quote client; no API key or third-party package needed."""

    endpoint = "https://push2.eastmoney.com/api/qt/stock/get"

    @staticmethod
    def _security_id(stock_code: str) -> str:
        if not stock_code.isdigit() or len(stock_code) != 6:
            raise MarketDataError("股票代码必须是 6 位数字")
        market = "1" if stock_code.startswith(("6", "9")) else "0"
        return f"{market}.{stock_code}"

    @classmethod
    def build_url(cls, stock_code: str) -> str:
        fields = "f57,f58,f43,f170,f116,f168"
        return f"{cls.endpoint}?secid={cls._security_id(stock_code)}&fields={fields}"

    @staticmethod
    def parse_response(payload: bytes | str) -> MarketQuote:
        try:
            if isinstance(payload, bytes):
                payload = payload.decode("utf-8")
            data: dict[str, Any] = json.loads(payload)["data"]
            if not data:
                raise KeyError("data")
            code = str(data["f57"])
            name = str(data["f58"])
            price = Decimal(str(data["f43"])) / 100
            change_pct = Decimal(str(data["f170"])) / 100
            market_cap_yi = Decimal(str(data["f116"])) / Decimal("100000000")
            turnover_rate = Decimal(str(data["f168"])) / 100
        except (
            InvalidOperation,
            KeyError,
            TypeError,
            ValueError,
            json.JSONDecodeError,
        ) as exc:
            raise MarketDataError("行情 API 返回格式异常") from exc
        if price <= 0 or not code or not name:
            raise MarketDataError("行情 API 未返回有效股票数据")
        return MarketQuote(
            stock_code=code,
            stock_name=name,
            price=price,
            change_pct=change_pct,
            market_cap_yi=market_cap_yi,
            turnover_rate=turnover_rate,
            source="东方财富实时行情 API",
            fetched_at=datetime.now().astimezone().isoformat(timespec="seconds"),
        )

    def fetch_quote(self, stock_code: str, timeout: float = 8) -> MarketQuote:
        request = Request(
            self.build_url(stock_code),
            headers={"User-Agent": "SharonTradingSystem/1.0"},
        )
        try:
            with urlopen(request, timeout=timeout) as response:
                return self.parse_response(response.read())
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            raise MarketDataError(f"行情 API 连接失败：{exc}") from exc


__all__ = ["EastmoneyClient", "MarketDataError", "MarketQuote"]
