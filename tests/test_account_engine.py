from __future__ import annotations

import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from account_engine import AccountEngine, InvalidTradeError


class AccountEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "account.db"
        self.engine = AccountEngine(
            self.db_path,
            sector_mapping={"002371": "电子", "000001": "银行"},
        )

    def tearDown(self) -> None:
        self.engine.close()
        self.temp_dir.cleanup()

    def test_initializes_and_saves_account(self) -> None:
        account = self.engine.load_account()
        self.assertEqual(account.current_capital, Decimal("5037200.0"))

        updated = self.engine.update_current_capital("5100000")
        self.assertEqual(updated.current_capital, Decimal("5100000.0"))
        self.assertEqual(updated.total_pnl, Decimal("62800.0"))

    def test_example_trade_is_synced_and_reports_single_stock_breach(self) -> None:
        result = self.engine.sync_trade("买入 002371 350.00 3600")

        self.assertEqual(result["trade"]["amount"], Decimal("1260000.00"))
        self.assertEqual(result["positions"]["total_market_value"], Decimal("1260000.0"))
        self.assertFalse(result["passed"])
        self.assertEqual(
            [item["rule"] for item in result["violations"]],
            ["single_stock"],
        )
        self.assertEqual(
            result["violations"][0]["limit"],
            Decimal("1259300.000"),
        )

    def test_weighted_cost_sell_and_persistence(self) -> None:
        self.engine.sync_trade("买入 000001 10 1000")
        self.engine.sync_trade("买入 000001 20 1000")
        sell = self.engine.sync_trade("卖出 000001 18 500")

        position = sell["positions"]["positions"][0]
        self.assertEqual(position["quantity"], 1500)
        self.assertEqual(position["avg_cost"], Decimal("15.0"))
        self.assertEqual(position["last_price"], Decimal("18.0"))
        self.assertEqual(len(self.engine.list_trades()), 3)

        self.engine.close()
        self.engine = AccountEngine(self.db_path)
        self.assertEqual(
            self.engine.calculate_positions()["positions"][0]["quantity"],
            1500,
        )

    def test_rejects_invalid_or_oversold_trade_atomically(self) -> None:
        with self.assertRaises(InvalidTradeError):
            self.engine.sync_trade("买进 002371 350 100")
        with self.assertRaises(InvalidTradeError):
            self.engine.sync_trade("卖出 002371 350 100")

        self.assertEqual(self.engine.list_trades(), [])
        self.assertEqual(self.engine.calculate_positions()["positions"], [])

    def test_total_sector_and_cash_limits(self) -> None:
        self.engine.sync_trade("买入 002371 400 4000")
        result = self.engine.sync_trade("买入 000001 400 4000")

        rules = {item["rule"] for item in result["violations"]}
        self.assertIn("single_stock", rules)
        self.assertIn("sector", rules)
        self.assertIn("total_position", rules)
        self.assertIn("cash_floor", rules)
        self.assertFalse(self.engine.check_total_position_limit())
        self.assertFalse(self.engine.check_cash_floor())


if __name__ == "__main__":
    unittest.main()
