from __future__ import annotations

import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import patch

from sharon_trading_system_v1_0.limit_up_strategy import (
    DEFAULT_V31_PARAMS,
    LimitUpScreener,
    LimitUpStock,
    V31ReverseParams,
    build_hot_sectors,
    default_trade_date,
    parse_limit_up_pool,
    score_limit_up_continuation,
    score_v31_reverse,
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


def _stock(**overrides: object) -> LimitUpStock:
    base = dict(
        stock_code="002001",
        stock_name="医疗甲",
        sector="医疗器械",
        last_price=Decimal("15"),
        change_pct=Decimal("10"),
        amount=Decimal("200000000"),
        seal_fund=Decimal("180000000"),
        board_count=2,
        first_limit_time="09:30:00",
        last_limit_time="10:00:00",
        open_count=0,
        turnover_pct=Decimal("12.0"),
        trade_date="20260715",
    )
    base.update(overrides)
    return LimitUpStock(**base)  # type: ignore[arg-type]


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
        self.assertIn("涨停接力策略评分", payload["selection_reason"])

    def test_v31_reverse_rewards_volume_and_hot_sector(self) -> None:
        stocks = parse_limit_up_pool(SAMPLE_PAYLOAD, trade_date="20260715")
        hot = build_hot_sectors(stocks, top_n=3)
        strong = score_v31_reverse(
            _stock(
                stock_code="002001",
                sector="医疗器械",
                turnover_pct=Decimal("16"),
                seal_fund=Decimal("180000000"),
                amount=Decimal("200000000"),
                board_count=2,
                open_count=0,
                first_limit_time="09:30:00",
            ),
            hot_sectors=hot,
        )
        weak = score_v31_reverse(
            _stock(
                stock_code="600000",
                stock_name="浦发银行",
                sector="银行",
                turnover_pct=Decimal("1.2"),
                seal_fund=Decimal("20000000"),
                amount=Decimal("300000000"),
                board_count=1,
                open_count=0,
                first_limit_time="14:00:00",
            ),
            hot_sectors=hot,
        )
        self.assertGreaterEqual(strong.score, DEFAULT_V31_PARAMS.score_threshold)
        self.assertGreater(strong.score, weak.score)
        self.assertEqual(strong.strategy_mode, "v31_reverse")
        self.assertEqual(strong.strategy_label, "V31反向版")
        self.assertTrue(any("止损" in tip for tip in strong.plan_hints))
        payload = strong.to_candidate_payload()
        self.assertEqual(payload["source_ai"], "V31反向版")
        self.assertIn("计划：", payload["selection_reason"])

    def test_v31_screen_weak_market_returns_empty(self) -> None:
        stocks = parse_limit_up_pool(SAMPLE_PAYLOAD, trade_date="20260715")
        screener = LimitUpScreener()
        with patch.object(screener, "fetch_limit_up_pool", return_value=stocks):
            result = screener.screen(
                trade_date="20260715",
                top_n=3,
                mode="v31_reverse",
                v31_params=V31ReverseParams(weak_zt_threshold=30, score_threshold=75),
            )
        self.assertEqual(result["market_state"], "weak")
        self.assertEqual(result["picks"], [])
        self.assertIn("弱市空仓", result["message"])

    def test_v31_screen_filters_high_boards_and_threshold(self) -> None:
        hot_pool = [
            _stock(
                stock_code=f"{i:06d}",
                stock_name=f"样例{i}",
                sector="医疗器械" if i < 25 else "银行",
                board_count=2 if i != 0 else 9,
                turnover_pct=Decimal("14"),
                seal_fund=Decimal("200000000"),
                amount=Decimal("250000000"),
                open_count=0,
                first_limit_time="09:32:00",
            )
            for i in range(35)
        ]
        screener = LimitUpScreener()
        with patch.object(screener, "fetch_limit_up_pool", return_value=hot_pool):
            result = screener.screen(
                trade_date="20260715",
                top_n=3,
                mode="v31_reverse",
            )
        self.assertEqual(result["market_state"], "normal")
        self.assertGreaterEqual(len(result["picks"]), 1)
        codes = {item["stock_code"] for item in result["picks"]}
        self.assertNotIn("000000", codes)  # 9-board excluded
        for item in result["picks"]:
            self.assertGreaterEqual(item["score"], 75)
            self.assertEqual(item["strategy_mode"], "v31_reverse")


if __name__ == "__main__":
    unittest.main()
