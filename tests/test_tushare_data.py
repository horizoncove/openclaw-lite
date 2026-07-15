from __future__ import annotations

import os
import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from tools.tushare_data import (  # noqa: E402
    TushareConfigurationError,
    create_tushare_client,
    diagnose_permissions,
)


class FakeTushareClient:
    def trade_cal(self, **kwargs):
        return pd.DataFrame(
            [{"cal_date": "20260713", "is_open": 1}]
        )

    def limit_list_d(self, **kwargs):
        return pd.DataFrame([{"trade_date": "20260713", "ts_code": "000001.SZ"}])

    def moneyflow(self, **kwargs):
        return pd.DataFrame([{"trade_date": "20260713", "ts_code": "000001.SZ"}])

    def stk_auction(self, **kwargs):
        return pd.DataFrame([{"trade_date": "20260713", "ts_code": "000001.SZ"}])


class TushareDataTests(unittest.TestCase):
    def test_missing_token_fails_without_exposing_secret(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(
                TushareConfigurationError, "TUSHARE_TOKEN"
            ):
                create_tushare_client(load_dotenv_file=False)

    def test_permission_diagnostic_reports_required_endpoints(self) -> None:
        diagnostic = diagnose_permissions(
            FakeTushareClient(),
            today=date(2026, 7, 15),
        )

        self.assertTrue(diagnostic.ready)
        self.assertEqual(diagnostic.reference_trade_date, "20260713")
        self.assertEqual(
            {item.endpoint for item in diagnostic.endpoints},
            {"limit_list_d", "moneyflow", "stk_auction"},
        )
        self.assertTrue(all(item.rows == 1 for item in diagnostic.endpoints))


if __name__ == "__main__":
    unittest.main()
