from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from backtesting.sop_v31_backtest import SOPSelection  # noqa: E402
from backtesting.sop_v31_optimizer import SOPV31Optimizer  # noqa: E402


def selection(
    trade_date: str,
    code: str,
    *,
    board_count: int = 3,
    cap: float = 50,
    turnover: float = 15,
    sector_count: int = 4,
    market_count: int = 60,
    gap: float = 2,
    return_pct: float = 1.5,
) -> SOPSelection:
    return SOPSelection(
        trade_date=trade_date,
        code=code,
        name=f"股票{code}",
        industry="半导体",
        board_count=board_count,
        sector_limit_up_count=sector_count,
        market_limit_up_count=market_count,
        float_market_cap_yi=cap,
        turnover_rate=turnover,
        ranking_strength=80,
        next_trade_date=trade_date,
        next_limit_up=return_pct > 5,
        next_open_buyable=True,
        next_open_gap_pct=gap,
        next_open_to_close_pct=return_pct,
    )


class SOPV31OptimizerTests(unittest.TestCase):
    def test_walk_forward_uses_only_prior_years(self) -> None:
        samples = []
        for year in (2021, 2022, 2023):
            samples.extend(
                [
                    selection(f"{year}-01-02", f"{year}01", return_pct=2),
                    selection(f"{year}-02-02", f"{year}02", return_pct=1),
                    selection(
                        f"{year}-03-02",
                        f"{year}03",
                        board_count=2,
                        cap=90,
                        gap=5,
                        return_pct=-2,
                    ),
                ]
            )
        optimizer = SOPV31Optimizer(
            minimum_training_samples=2,
            minimum_samples_per_year=1,
        )

        report, static, out_of_sample = optimizer.run(samples)

        self.assertTrue(static)
        self.assertEqual(len(report.walk_forward_periods), 1)
        period = report.walk_forward_periods[0]
        self.assertEqual(period.test_year, 2023)
        self.assertEqual(period.training_years, (2021, 2022))
        self.assertTrue(out_of_sample)
        self.assertGreater(
            report.walk_forward_out_of_sample.average_net_return_pct, 0
        )


if __name__ == "__main__":
    unittest.main()
