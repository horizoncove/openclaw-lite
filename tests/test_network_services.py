from __future__ import annotations

import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from PyQt6.QtCore import QSettings

from sharon_trading_system_v1_0.account_engine import AccountEngine
from sharon_trading_system_v1_0.market_data import (
    Quote,
    StaticQuoteProvider,
    eastmoney_secid,
    normalize_stock_code,
)
from sharon_trading_system_v1_0.network_settings import (
    NetworkSettings,
    load_network_settings,
    save_network_settings,
)


class MarketDataTests(unittest.TestCase):
    def test_normalize_and_secid(self) -> None:
        self.assertEqual(normalize_stock_code("sz002371"), "002371")
        self.assertEqual(eastmoney_secid("002371"), "0.002371")
        self.assertEqual(eastmoney_secid("600519"), "1.600519")

    def test_static_provider_and_price_update(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            engine = AccountEngine(Path(directory) / "acct.db")
            engine.sync_trade("买入 002371 100 1000", sector="电子")
            before = engine.calculate_positions()["positions"][0]["last_price"]
            self.assertEqual(before, Decimal("100"))
            provider = StaticQuoteProvider(
                {
                    "002371": Quote(
                        "002371", "北方华创", Decimal("108.50"), Decimal("2.5")
                    )
                }
            )
            quotes = provider.fetch_quotes(["002371", "688012"])
            updated = engine.update_last_prices(
                {code: quote.last_price for code, quote in quotes.items()}
            )
            self.assertEqual(updated, 1)
            after = engine.calculate_positions()["positions"][0]["last_price"]
            self.assertEqual(after, Decimal("108.50"))
            engine.close()


class NetworkSettingsTests(unittest.TestCase):
    def test_round_trip(self) -> None:
        settings = QSettings("SharonTest", "NetworkSettingsCase")
        settings.clear()
        config = NetworkSettings(
            market_enabled=True,
            market_interval_sec=20,
            agent_enabled=True,
            agent_base_url="https://api.example.com/v1",
            agent_api_key="sk-test-key-123456",
            agent_model="demo-model",
        )
        save_network_settings(config, settings)
        loaded = load_network_settings(settings)
        self.assertTrue(loaded.agent_enabled)
        self.assertEqual(loaded.market_interval_sec, 20)
        self.assertEqual(loaded.agent_model, "demo-model")
        self.assertIn("…", loaded.masked_api_key())
        settings.clear()


if __name__ == "__main__":
    unittest.main()
