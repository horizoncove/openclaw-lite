from __future__ import annotations

import sqlite3
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from backtesting.limit_up_backtest import (  # noqa: E402
    BacktestConfig,
    DailyBarLimitUpBacktester,
    write_results,
)
from backtesting.market_database import (  # noqa: E402
    AShareHistoryDownloader,
    _is_a_share,
    _parse_bar,
)


class DailyBarLimitUpBacktesterTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database = Path(self.temp_dir.name) / "market.sqlite"
        connection = sqlite3.connect(self.database)
        AShareHistoryDownloader._create_schema(connection)
        connection.executemany(
            """
            INSERT INTO stocks(
                code, name, ipo_date, out_date, listing_status, industry
            ) VALUES (?, ?, '2020-01-01', '', '1', ?)
            """,
            [
                ("sz.000001", "甲公司", "半导体"),
                ("sz.000002", "乙公司", "半导体"),
                ("sh.600001", "丙公司", "煤炭"),
            ],
        )
        bars = [
            self._bar("2024-01-02", "sz.000001", 10, 11, 10, 11, 10, 2e8, 10),
            self._bar("2024-01-03", "sz.000001", 11.5, 12.1, 11.4, 12.1, 11, 3e8, 10),
            self._bar("2024-01-02", "sz.000002", 9.5, 11, 9.4, 11, 10, 1.5e8, 10),
            self._bar("2024-01-03", "sz.000002", 10.8, 10.9, 10.5, 10.78, 11, 1e8, -2),
            self._bar("2024-01-02", "sh.600001", 10, 11, 9.8, 11, 10, 1e8, 10),
            self._bar("2024-01-03", "sh.600001", 11.1, 11.5, 11, 11.33, 11, 1e8, 3),
        ]
        connection.executemany(
            """
            INSERT INTO daily_bars(
                trade_date, code, open, high, low, close, preclose,
                volume, amount, turnover_rate, trade_status, pct_change, is_st
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1000000, ?, ?, 1, ?, 0)
            """,
            bars,
        )
        connection.commit()
        connection.close()

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    @staticmethod
    def _bar(
        trade_date,
        code,
        open_price,
        high,
        low,
        close,
        preclose,
        amount,
        pct_change,
    ):
        return (
            trade_date,
            code,
            open_price,
            high,
            low,
            close,
            preclose,
            amount,
            10,
            pct_change,
        )

    def test_runs_proxy_backtest_without_future_sector_data(self) -> None:
        backtester = DailyBarLimitUpBacktester(
            self.database,
            BacktestConfig(max_candidates=2, min_score=0),
        )

        report, selections = backtester.run(
            date(2024, 1, 2), date(2024, 1, 3)
        )

        self.assertEqual(report.candidate_count, 2)
        self.assertEqual(report.continuation_hits, 1)
        self.assertEqual(report.continuation_hit_rate, 50)
        self.assertEqual({item.industry for item in selections}, {"半导体"})
        self.assertTrue(all(item.next_open_buyable for item in selections))
        self.assertIn("代理模型", report.limitations[0])

    def test_writes_report_and_selection_files(self) -> None:
        report, selections = DailyBarLimitUpBacktester(
            self.database,
            BacktestConfig(max_candidates=1, min_score=0),
        ).run(date(2024, 1, 2), date(2024, 1, 3))

        report_path, selections_path = write_results(
            report, selections, Path(self.temp_dir.name) / "results"
        )

        self.assertTrue(report_path.exists())
        self.assertTrue(selections_path.exists())
        self.assertIn("daily_bar_proxy_v1", report_path.read_text("utf-8"))


class MarketDatabaseHelpersTests(unittest.TestCase):
    def test_a_share_filter_excludes_funds_and_b_shares(self) -> None:
        self.assertTrue(_is_a_share("sh.600000"))
        self.assertTrue(_is_a_share("sh.688001"))
        self.assertTrue(_is_a_share("sz.300001"))
        self.assertFalse(_is_a_share("sh.510300"))
        self.assertFalse(_is_a_share("sh.900901"))

    def test_parses_baostock_daily_row(self) -> None:
        row = _parse_bar(
            [
                "2024-01-02",
                "sh.600000",
                "10",
                "11",
                "9.8",
                "11",
                "10",
                "1000",
                "10000",
                "8.5",
                "1",
                "10",
                "0",
            ]
        )
        self.assertEqual(row[0], "2024-01-02")
        self.assertEqual(row[5], 11)
        self.assertEqual(row[-1], 0)


if __name__ == "__main__":
    unittest.main()
