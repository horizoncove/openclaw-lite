"""A-share quote providers for live valuation (not broker fills)."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Protocol


USER_AGENT = (
    "Mozilla/5.0 (compatible; SharonTradingSystem/1.0; +local-desktop)"
)


@dataclass(frozen=True)
class Quote:
    stock_code: str
    stock_name: str
    last_price: Decimal
    change_pct: Decimal | None = None
    source: str = ""


class MarketDataProvider(Protocol):
    def fetch_quotes(self, stock_codes: list[str]) -> dict[str, Quote]:
        """Return last prices keyed by 6-digit A-share code."""


def normalize_stock_code(code: str) -> str:
    digits = re.sub(r"\D", "", str(code or ""))
    if len(digits) >= 6:
        return digits[-6:]
    raise ValueError(f"无效股票代码：{code}")


def eastmoney_secid(code: str) -> str:
    code = normalize_stock_code(code)
    # 1 = SH, 0 = SZ (incl. ChiNext / STAR common prefixes).
    if code.startswith(("5", "6", "9")):
        return f"1.{code}"
    return f"0.{code}"


class EastMoneyQuoteProvider:
    """Public East Money push API — no API key required."""

    ENDPOINT = "https://push2.eastmoney.com/api/qt/ulist.np/get"

    def __init__(self, *, timeout: float = 8.0) -> None:
        self.timeout = timeout

    def fetch_quotes(self, stock_codes: list[str]) -> dict[str, Quote]:
        codes = [normalize_stock_code(code) for code in stock_codes]
        codes = list(dict.fromkeys(codes))
        if not codes:
            return {}
        params = urllib.parse.urlencode(
            {
                "fltt": "2",
                "np": "1",
                "fields": "f2,f3,f12,f14",
                "secids": ",".join(eastmoney_secid(code) for code in codes),
            }
        )
        request = urllib.request.Request(
            f"{self.ENDPOINT}?{params}",
            headers={
                "User-Agent": USER_AGENT,
                "Referer": "https://quote.eastmoney.com/",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"行情请求失败：{exc}") from exc
        rows = ((payload or {}).get("data") or {}).get("diff") or []
        quotes: dict[str, Quote] = {}
        for row in rows:
            code = str(row.get("f12") or "").zfill(6)
            name = str(row.get("f14") or code)
            raw_price = row.get("f2")
            if raw_price in (None, "-", ""):
                continue
            try:
                price = Decimal(str(raw_price))
            except (InvalidOperation, ValueError):
                continue
            if price <= 0:
                continue
            change = None
            raw_change = row.get("f3")
            if raw_change not in (None, "-", ""):
                try:
                    change = Decimal(str(raw_change))
                except (InvalidOperation, ValueError):
                    change = None
            quotes[code] = Quote(
                stock_code=code,
                stock_name=name,
                last_price=price,
                change_pct=change,
                source="eastmoney",
            )
        return quotes


class StaticQuoteProvider:
    """Test double / offline fallback."""

    def __init__(self, quotes: dict[str, Quote] | None = None) -> None:
        self._quotes = quotes or {}

    def fetch_quotes(self, stock_codes: list[str]) -> dict[str, Quote]:
        result: dict[str, Quote] = {}
        for code in stock_codes:
            normalized = normalize_stock_code(code)
            quote = self._quotes.get(normalized)
            if quote:
                result[normalized] = quote
        return result


__all__ = [
    "EastMoneyQuoteProvider",
    "MarketDataProvider",
    "Quote",
    "StaticQuoteProvider",
    "eastmoney_secid",
    "normalize_stock_code",
]
