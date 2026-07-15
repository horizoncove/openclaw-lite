from __future__ import annotations

import sqlite3
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from backtesting.market_database import AShareHistoryDownloader  # noqa: E402
from backtesting.sop_v31_backtest import SOPV31Backtester  # noqa: E402


class SOPV31BacktesterTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database = Path(self.temp_dir.name) / "market.sqlite"
        connection = sqlite3.connect(self.database)
        AShareHistoryDownloader._create_schema(connection)
        connection.executemany(
            """
            INSERT INTO stocks(
                code, name, ipo_date, out_date, listing_status, industry
            ) VALUES (?, ?, '2020-01-01', '', '1', '半导体')
            """,
            [
                ("sz.000001", "甲公司"),
                ("sz.000002", "乙公司"),
                ("sh.600001", "丙公司"),
            ],
        )
        bars = []
        for code in ("sz.000001", "sz.000002", "sh.600001"):
            bars.append(self._bar("2024-01-02", code, 10, 11, 10, 10))
            bars.append(self._bar("2024-01-03", code, 11, 12.1, 11, 10))
        bars.extend(
            [
                self._bar("2024-01-04", "sz.000001", 12.1, 13.31, 12.1, 10),
                self._bar("2024-01-04", "sz.000002", 12.1, 11.8, 12.1, -2.48),
                self._bar("2024-01-04", "sh.600001", 12.1, 12.2, 12.1, 0.83),
            ]
        )
        connection.executemany(
            """
            INSERT INTO daily_bars(
                trade_date, code, open, high, low, close, preclose,
                volume, amount, turnover_rate, trade_status, pct_change, is_st
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 70000000, 200000000, 10, 1, ?, 0)
            """,
            bars,
        )
        connection.commit()
        connection.close()

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    @staticmethod
    def _bar(trade_date, code, preclose, close, open_price, pct_change):
        return (
            trade_date,
            code,
            open_price,
            max(open_price, close),
            min(open_price, close),
            close,
            preclose,
            pct_change,
        )

    def test_applies_observable_sop_hard_filters(self) -> None:
        report, strict_pool, ranked = SOPV31Backtester(self.database).run(
            date(2024, 1, 2), date(2024, 1, 4)
        )

        self.assertEqual(report.strict_pool.candidate_count, 3)
        self.assertEqual(report.ranked_top3.candidate_count, 3)
        self.assertEqual(report.ranked_top3.continuation_hits, 1)
        self.assertEqual({item.board_count for item in strict_pool}, {2})
        self.assertTrue(
            all(item.sector_limit_up_count == 3 for item in ranked)
        )
        self.assertIn("首次封板时间", report.unavailable_rules[0])


if __name__ == "__main__":
    unittest.main()
