from __future__ import annotations

import os
import tempfile
import unittest
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo

from sharon_trading_system_v1_0.account_engine import AccountEngine
from sharon_trading_system_v1_0.system_engine import SystemEngine


SHANGHAI = ZoneInfo("Asia/Shanghai")


class SystemEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "system.db"
        self.account = AccountEngine(self.db_path)
        self.system = SystemEngine(self.db_path)

    def tearDown(self) -> None:
        self.system.close()
        self.account.close()
        self.temp_dir.cleanup()

    def test_pdf_account_defaults(self) -> None:
        account = self.account.load_account()
        self.assertEqual(account.initial_capital, Decimal("5000000.0"))
        self.assertEqual(account.current_capital, Decimal("5037175.21"))
        self.assertEqual(account.total_pnl, Decimal("37175.21"))

    def test_sop_classification_boundaries(self) -> None:
        strict = self.system.save_sop_evaluation(
            "002371",
            "北方华创",
            "半导体",
            [14, 14, 9, 14, 19, 14, 9],
            api_verified=True,
            data_source="东方财富 API",
        )
        loose = self.system.save_sop_evaluation(
            "000001",
            "平安银行",
            "银行",
            [8, 8, 5, 8, 10, 6, 5],
            api_verified=True,
        )
        reject = self.system.save_sop_evaluation(
            "600519",
            "贵州茅台",
            "食品饮料",
            [7, 7, 5, 7, 9, 7, 7],
            api_verified=True,
        )
        self.assertEqual(strict["classification"], "STRICT")
        self.assertEqual(strict["total_score"], 93)
        self.assertEqual(loose["classification"], "LOOSE")
        self.assertEqual(reject["classification"], "REJECT")

    def test_unverified_data_cannot_become_trade_candidate(self) -> None:
        evaluation = self.system.save_sop_evaluation(
            "688012", "中微公司", "半导体", [15, 15, 10, 15, 20, 15, 10]
        )
        self.assertEqual(evaluation["total_score"], 100)
        self.assertEqual(evaluation["classification"], "UNVERIFIED")
        with self.assertRaises(ValueError):
            self.system.save_sop_evaluation(
                "688072",
                "拓荆科技",
                "半导体",
                [16, 15, 10, 15, 20, 15, 10],
                api_verified=True,
            )

    def test_continuous_limit_up_five_step_filter(self) -> None:
        passed = self.system.screen_continuous_limit_up(
            consecutive_boards=2,
            market_cap_yi=100,
            turnover_rate=5,
            seal_time="13:59",
            sector_limit_up_count=3,
        )
        failed = self.system.screen_continuous_limit_up(
            consecutive_boards=4,
            market_cap_yi=101,
            turnover_rate=4.99,
            seal_time="14:00",
            sector_limit_up_count=2,
        )
        self.assertTrue(passed["passed"])
        self.assertFalse(failed["passed"])
        self.assertTrue(failed["warnings"])

    def test_market_environment_dispatches_theory_and_masters(self) -> None:
        style = self.system.recommend_market_style("板块轮动")
        self.assertEqual(style["theory"], "协同论")
        self.assertIn("瑞鹤仙", style["masters"])

    def test_preflight_requires_strict_sop_and_checks_time(self) -> None:
        no_sop = self.system.validate_trade_intent(
            self.account,
            "买入 002371 100 1000",
            sector="半导体",
            at=datetime(2026, 7, 13, 10, 0, tzinfo=SHANGHAI),
        )
        self.assertEqual(no_sop.light, "red")

        sop = self.system.save_sop_evaluation(
            "002371", "北方华创", "半导体", [10] * 7, api_verified=True
        )
        allowed = self.system.validate_trade_intent(
            self.account,
            "买入 002371 100 1000",
            sector="半导体",
            sop_evaluation_id=sop["id"],
            at=datetime(2026, 7, 13, 10, 0, tzinfo=SHANGHAI),
        )
        blocked_time = self.system.validate_trade_intent(
            self.account,
            "买入 002371 100 1000",
            sector="半导体",
            sop_evaluation_id=sop["id"],
            at=datetime(2026, 7, 13, 9, 35, tzinfo=SHANGHAI),
        )
        self.assertEqual(allowed.light, "green")
        self.assertEqual(blocked_time.light, "red")

    def test_yellow_and_red_single_stock_bands(self) -> None:
        sop = self.system.save_sop_evaluation(
            "002371", "北方华创", "半导体", [10] * 7, api_verified=True
        )
        at = datetime(2026, 7, 13, 10, 0, tzinfo=SHANGHAI)
        yellow = self.system.validate_trade_intent(
            self.account,
            "买入 002371 100 13000",
            sector="半导体",
            sop_evaluation_id=sop["id"],
            at=at,
        )
        red = self.system.validate_trade_intent(
            self.account,
            "买入 002371 100 16000",
            sector="半导体",
            sop_evaluation_id=sop["id"],
            at=at,
        )
        self.assertEqual(yellow.light, "yellow")
        self.assertEqual(red.light, "red")

    def test_queue_survives_restart(self) -> None:
        queue_id = self.system.enqueue_trade("买入 002371 10 100", "电子")
        self.system.close()
        self.system = SystemEngine(self.db_path)
        pending = self.system.pending_trades()
        self.assertEqual(pending[0]["id"], queue_id)
        self.system.complete_queued_trade(queue_id)
        self.assertEqual(self.system.pending_trades(), [])

    def test_findings_escalate_penalty_and_grade(self) -> None:
        self.system.record_finding("L1", "red", "stop_loss", "未执行 -7% 止损")
        self.system.record_finding("L1", "red", "position", "总仓位超限")
        grade = self.system.monthly_grade()
        self.assertEqual(grade["grade"], "D")
        self.assertIsNotNone(self.system.active_suspension())

    def test_daily_review_and_tasks(self) -> None:
        review = self.system.create_daily_review(
            review_date="2026-07-13",
            mindset="稳定合规",
            summary="主动空仓",
            lessons="继续观察",
        )
        self.assertEqual(review["grade"], "A")
        tasks = self.system.list_tasks()
        self.assertEqual(len(tasks), 10)
        disabled = next(item for item in tasks if item["task_key"] == "daily_update")
        self.assertFalse(disabled["enabled"])

    def test_cash_condition_blocks_buy_and_exit_signals_follow_rules(self) -> None:
        sop = self.system.save_sop_evaluation(
            "002371", "北方华创", "半导体", [10] * 7, api_verified=True
        )
        self.system.set_cash_condition("cash_1", True, "市场异常")
        result = self.system.validate_trade_intent(
            self.account,
            "买入 002371 100 100",
            sector="半导体",
            sop_evaluation_id=sop["id"],
            at=datetime(2026, 7, 13, 10, 0, tzinfo=SHANGHAI),
        )
        self.assertEqual(result.light, "red")

        self.account.sync_trade("买入 002371 100 100", sector="半导体")
        self.account.sync_trade("卖出 002371 90 1", sector="半导体")
        signals = self.system.position_discipline_signals(self.account)
        self.assertEqual(signals[0]["rule"], "stop_loss")


@unittest.skipUnless(
    os.environ.get("QT_QPA_PLATFORM") == "offscreen",
    "仅在 Qt 离屏模式运行完整工作台测试",
)
class WorkbenchSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from PyQt6.QtWidgets import QApplication

        cls.app = QApplication.instance() or QApplication([])

    def test_full_workbench_tabs_and_persistent_queue(self) -> None:
        from sharon_trading_system_v1_0.workbench import WorkbenchWindow

        with tempfile.TemporaryDirectory() as directory:
            window = WorkbenchWindow(Path(directory) / "workbench.db")
            labels = [window.tabs.tabText(i) for i in range(window.tabs.count())]
            self.assertIn("SOP 选股", labels)
            self.assertIn("交易计划", labels)
            self.assertIn("AI 监督", labels)
            self.assertIn("每日复盘", labels)
            self.assertIn("任务与资料", labels)
            self.assertEqual(
                [score.maximum() for score in window.sop_scores],
                [15, 15, 10, 15, 20, 15, 10],
            )

            window.command_input.setText("买入 002371 10 100")
            window._enqueue_trade()
            self.assertEqual(len(window.system.pending_trades()), 1)
            window._synchronize_pending()
            self.assertEqual(window.positions_table.rowCount(), 1)
            self.assertGreaterEqual(window.findings_table.rowCount(), 1)
            window.close()


if __name__ == "__main__":
    unittest.main()
