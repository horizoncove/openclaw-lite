from __future__ import annotations

import unittest
from datetime import date
from decimal import Decimal

from sharon_trading_system_v1_0.limit_up_strategy import (
    build_hot_sectors,
    default_trade_date,
    parse_limit_up_pool,
    score_limit_up_continuation,
)


SAMPLE_PAYLOAD = {
    "data": {
        "tc": 3,
        "pool": [
            {
                "c": "002382",
                "n": "蓝帆医疗",
                "p": 5960,
                "zdp": 9.96,
                "amount": 187469750,
                "hs": 3.16,
                "lbc": 1,
                "fbt": 92500,
                "lbt": 93357,
                "fund": 211548352,
                "zbc": 0,
                "hybk": "医疗器械",
            },
            {
                "c": "300001",
                "n": "特锐德",
                "p": 22000,
                "zdp": 20.01,
                "amount": 500000000,
                "hs": 12.0,
                "lbc": 2,
                "fbt": 103000,
                "lbt": 110000,
                "fund": 80000000,
                "zbc": 2,
                "hybk": "电力设备",
            },
            {
                "c": "600000",
                "n": "浦发银行",
                "p": 11000,
                "zdp": 10.0,
                "amount": 300000000,
                "hs": 1.2,
                "lbc": 1,
                "fbt": 140000,
                "lbt": 145000,
                "fund": 20000000,
                "zbc": 0,
                "hybk": "银行",
            },
            {
                "c": "000001",
                "n": "ST示例",
                "p": 5000,
                "zdp": 5.0,
                "amount": 1000,
                "lbc": 1,
                "fbt": 93000,
                "lbt": 93000,
                "fund": 1000,
                "zbc": 0,
                "hybk": "银行",
            },
            {
                "c": "002001",
                "n": "医疗甲",
                "p": 15000,
                "zdp": 10.0,
                "amount": 200000000,
                "hs": 6.0,
                "lbc": 2,
                "fbt": 93000,
                "lbt": 100000,
                "fund": 180000000,
                "zbc": 0,
                "hybk": "医疗器械",
            },
            {
                "c": "002002",
                "n": "医疗乙",
                "p": 18000,
                "zdp": 10.0,
                "amount": 220000000,
                "hs": 7.0,
                "lbc": 1,
                "fbt": 93500,
                "lbt": 100100,
                "fund": 150000000,
                "zbc": 0,
                "hybk": "医疗器械",
            },
        ]
    }
}


class LimitUpStrategyTests(unittest.TestCase):
    def test_default_trade_date_skips_weekend(self) -> None:
        # 2026-07-12 was Sunday.
        self.assertEqual(default_trade_date(date(2026, 7, 12)), "20260710")

    def test_parse_skips_st_and_scores_hot_sector_early_boards(self) -> None:
        stocks = parse_limit_up_pool(SAMPLE_PAYLOAD, trade_date="20260715")
        codes = {item.stock_code for item in stocks}
        self.assertNotIn("000001", codes)
        self.assertEqual(len(stocks), 5)
        self.assertEqual(stocks[0].last_price, Decimal("5.96"))

        hot = build_hot_sectors(stocks, top_n=3)
        self.assertEqual(hot[0].name, "医疗器械")
        self.assertEqual(hot[0].limit_up_count, 3)

        picks = [
            score_limit_up_continuation(stock, hot_sectors=hot) for stock in stocks
        ]
        picks.sort(key=lambda item: -item.score)
        top_codes = [item.stock.stock_code for item in picks[:2]]
        # Early sealed medical names should beat late-board bank / exploded ChiNext.
        self.assertTrue(
            any(code in {"002382", "002001", "002002"} for code in top_codes)
        )
        self.assertNotEqual(picks[0].stock.stock_code, "600000")
        payload = picks[0].to_candidate_payload()
        self.assertEqual(payload["source_ai"], "涨停接力策略")
        self.assertIn("涨停接力评分", payload["selection_reason"])


if __name__ == "__main__":
    unittest.main()
