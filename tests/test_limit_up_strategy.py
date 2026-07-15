from __future__ import annotations

import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from strategies.limit_up_continuation import (  # noqa: E402
    LimitUpContinuationStrategy,
    StrategyConfig,
)
from tools.market_data import (  # noqa: E402
    EastmoneyMarketData,
    HotSector,
    LimitUpStock,
)


def stock(
    code: str,
    *,
    name: str = "测试股份",
    sector: str = "半导体",
    turnover: float = 10,
    seal_amount: float = 20_000_000,
    market_cap: float = 1_000_000_000,
    first_seal: str = "09:40:00",
    open_count: int = 0,
    board_count: int = 2,
) -> LimitUpStock:
    return LimitUpStock(
        code=code,
        name=name,
        sector=sector,
        change_pct=10.0,
        latest_price=12.34,
        turnover_rate=turnover,
        seal_amount=seal_amount,
        circulating_market_cap=market_cap,
        first_seal_time=first_seal,
        last_seal_time=first_seal,
        open_count=open_count,
        board_count=board_count,
    )


class LimitUpContinuationStrategyTests(unittest.TestCase):
    def test_ranks_sector_resonance_and_seal_strength(self) -> None:
        strategy = LimitUpContinuationStrategy(
            StrategyConfig(max_candidates=2, min_score=0)
        )
        stocks = [
            stock("000001"),
            stock(
                "000002",
                seal_amount=5_000_000,
                first_seal="13:30:00",
                open_count=2,
                board_count=1,
            ),
            stock("600001", sector="煤炭", seal_amount=8_000_000),
        ]
        sectors = [
            HotSector("半导体", change_pct=4.2, main_net_inflow=1e9, rank=1),
            HotSector("煤炭", change_pct=1.0, main_net_inflow=2e8, rank=8),
        ]

        result = strategy.screen(stocks, sectors, date(2026, 7, 14))

        self.assertEqual(result.limit_up_count, 3)
        self.assertEqual(len(result.candidates), 2)
        self.assertEqual(result.candidates[0].code, "000001")
        self.assertGreater(
            result.candidates[0].breakdown["sector_heat"],
            result.candidates[1].breakdown["sector_heat"],
        )
        self.assertIn("行业涨幅榜第1名", " ".join(result.candidates[0].reasons))

    def test_filters_st_untradeable_and_weak_seals(self) -> None:
        strategy = LimitUpContinuationStrategy(StrategyConfig(min_score=0))
        stocks = [
            stock("000001", name="ST风险"),
            stock("000002", turnover=0),
            stock("000003", seal_amount=100_000),
            stock("000004"),
        ]

        result = strategy.screen(
            stocks,
            [HotSector("半导体", 3.0, 1e8, 1)],
            date(2026, 7, 14),
        )

        self.assertEqual(result.eligible_count, 1)
        self.assertEqual([item.code for item in result.candidates], ["000004"])

    def test_adds_high_board_and_open_board_risk_notes(self) -> None:
        strategy = LimitUpContinuationStrategy(StrategyConfig(min_score=0))
        result = strategy.screen(
            [stock("000001", board_count=5, open_count=1)],
            [HotSector("半导体", 3.0, 1e8, 1)],
        )

        risks = " ".join(result.candidates[0].risks)
        self.assertIn("高位连板", risks)
        self.assertIn("开板1次", risks)


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self):
        return self.payload


class FakeSession:
    def __init__(self, payloads):
        self.payloads = iter(payloads)
        self.headers = {}

    def get(self, url, params, timeout):
        return FakeResponse(next(self.payloads))


class EastmoneyMarketDataTests(unittest.TestCase):
    def test_parses_limit_up_and_sector_responses(self) -> None:
        session = FakeSession(
            [
                {
                    "data": {
                        "pool": [
                            {
                                "c": "1",
                                "n": "平安银行",
                                "hybk": "银行",
                                "zdp": 10.02,
                                "p": 12340,
                                "hs": 8.5,
                                "fund": 2e7,
                                "ltsz": 1e9,
                                "fbt": 93000,
                                "lbt": 145500,
                                "zbc": 1,
                                "lbc": 2,
                            }
                        ]
                    }
                },
                {"data": {"diff": [{"f14": "银行", "f3": 2.1, "f62": 8e8}]}},
            ]
        )
        provider = EastmoneyMarketData(session=session)

        stocks = provider.fetch_limit_up_stocks(date(2026, 7, 14))
        sectors = provider.fetch_hot_sectors(20)

        self.assertEqual(stocks[0].code, "000001")
        self.assertEqual(stocks[0].latest_price, 12.34)
        self.assertEqual(stocks[0].first_seal_time, "09:30:00")
        self.assertEqual(stocks[0].board_count, 2)
        self.assertEqual(sectors[0].name, "银行")
        self.assertEqual(sectors[0].rank, 1)


if __name__ == "__main__":
    unittest.main()
