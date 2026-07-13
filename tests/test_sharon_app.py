from __future__ import annotations

import os
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from sharon_trading_system_v1_0.account_engine import (
    AccountEngine,
    InvalidTradeError,
)


class IndependentAccountEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "sharon.db"
        self.engine = AccountEngine(
            self.db_path, sector_mapping={"002371": "电子"}
        )

    def tearDown(self) -> None:
        self.engine.close()
        self.temp_dir.cleanup()

    def test_example_trade_and_red_line(self) -> None:
        result = self.engine.sync_trade("买入 002371 350.00 3600")

        self.assertEqual(result["trade"]["amount"], Decimal("1260000.00"))
        self.assertEqual(
            result["positions"]["total_market_value"], Decimal("1260000.0")
        )
        self.assertEqual(
            [item["rule"] for item in result["violations"]],
            ["single_stock"],
        )

    def test_account_and_oversell_are_persistent_and_atomic(self) -> None:
        account = self.engine.update_current_capital("5100000")
        self.assertEqual(account.total_pnl, Decimal("62800.0"))
        self.engine.sync_trade("买入 002371 10 100")
        with self.assertRaises(InvalidTradeError):
            self.engine.sync_trade("卖出 002371 10 101")
        self.assertEqual(len(self.engine.list_trades()), 1)


@unittest.skipUnless(
    os.environ.get("QT_QPA_PLATFORM") == "offscreen",
    "仅在 QT_QPA_PLATFORM=offscreen 时运行界面测试",
)
class MainWindowSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from PyQt6.QtWidgets import QApplication

        cls.app = QApplication.instance() or QApplication([])

    def test_trade_queue_updates_dashboard(self) -> None:
        from sharon_trading_system_v1_0.main_window import MainWindow

        with tempfile.TemporaryDirectory() as directory:
            window = MainWindow(Path(directory) / "ui.db")
            window.command_input.setText("买入 002371 10 100")
            window.sector_input.setText("电子")
            window._enqueue_trade()
            self.assertEqual(len(window.pending_commands), 1)

            window._synchronize_pending()
            self.assertEqual(window.positions_table.rowCount(), 1)
            self.assertEqual(window.trades_table.rowCount(), 1)
            window.close()


if __name__ == "__main__":
    unittest.main()
