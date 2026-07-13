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

    def test_candidate_pool_records_two_or_three_external_ai_stocks(self) -> None:
        first = self.system.add_candidate(
            "002371",
            "北方华创",
            "半导体",
            source_ai="选股 AI",
            external_score=93,
            selection_reason="外部 SOP 已通过",
        )
        self.system.add_candidate(
            "688012", "中微公司", "半导体", source_ai="选股 AI"
        )
        self.system.add_candidate(
            "688072", "拓荆科技", "半导体", source_ai="选股 AI"
        )
        with self.assertRaises(ValueError):
            self.system.add_candidate(
                "603986", "兆易创新", "半导体", source_ai="选股 AI"
            )
        self.assertEqual(len(self.system.list_candidates()), 3)

        updated = self.system.add_candidate(
            "002371",
            "北方华创",
            "半导体设备",
            source_ai="新版选股 AI",
            external_score=95,
        )
        self.assertEqual(updated["id"], first["id"])
        self.assertEqual(len(self.system.list_candidates()), 3)
        self.system.archive_candidate(first["id"])
        self.assertEqual(len(self.system.list_candidates()), 2)

    def test_preflight_requires_external_candidate_and_checks_time(self) -> None:
        no_candidate = self.system.validate_trade_intent(
            self.account,
            "买入 002371 100 1000",
            sector="半导体",
            at=datetime(2026, 7, 13, 10, 0, tzinfo=SHANGHAI),
        )
        self.assertEqual(no_candidate.light, "red")

        candidate = self.system.add_candidate(
            "002371", "北方华创", "半导体", source_ai="外部 AI"
        )
        allowed = self.system.validate_trade_intent(
            self.account,
            "买入 002371 100 1000",
            sector="半导体",
            candidate_id=candidate["id"],
            at=datetime(2026, 7, 13, 10, 0, tzinfo=SHANGHAI),
        )
        blocked_time = self.system.validate_trade_intent(
            self.account,
            "买入 002371 100 1000",
            sector="半导体",
            candidate_id=candidate["id"],
            at=datetime(2026, 7, 13, 9, 35, tzinfo=SHANGHAI),
        )
        self.assertEqual(allowed.light, "green")
        self.assertEqual(blocked_time.light, "red")

    def test_yellow_and_red_single_stock_bands(self) -> None:
        candidate = self.system.add_candidate(
            "002371", "北方华创", "半导体", source_ai="外部 AI"
        )
        at = datetime(2026, 7, 13, 10, 0, tzinfo=SHANGHAI)
        yellow = self.system.validate_trade_intent(
            self.account,
            "买入 002371 100 13000",
            sector="半导体",
            candidate_id=candidate["id"],
            at=at,
        )
        red = self.system.validate_trade_intent(
            self.account,
            "买入 002371 100 16000",
            sector="半导体",
            candidate_id=candidate["id"],
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
        candidate = self.system.add_candidate(
            "002371", "北方华创", "半导体", source_ai="外部 AI"
        )
        self.system.set_cash_condition("cash_1", True, "市场异常")
        result = self.system.validate_trade_intent(
            self.account,
            "买入 002371 100 100",
            sector="半导体",
            candidate_id=candidate["id"],
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
            self.assertEqual(labels[0], "驾驶舱")
            self.assertIs(window.tabs.currentWidget(), window.cockpit_page)
            self.assertTrue(window.trade_frame.isHidden())
            self.assertIn("#dc2626", window.cockpit_kpis["pnl"].styleSheet())
            original_theme = window.dark_mode
            window.theme_button.click()
            self.assertNotEqual(window.dark_mode, original_theme)
            self.assertEqual(window.position_gauge.dark_mode, window.dark_mode)
            window.theme_button.click()
            self.assertEqual(window.dark_mode, original_theme)
            self.assertIn("候选股票", labels)
            self.assertIn("交易计划", labels)
            self.assertIn("AI 监督", labels)
            self.assertIn("每日复盘", labels)
            self.assertIn("任务与资料", labels)
            window.tabs.setCurrentWidget(window.candidate_page)
            self.assertTrue(window.trade_frame.isHidden())
            self.assertTrue(window.metric_cards[0].isHidden())
            window.candidate_code.setText("002371")
            window.candidate_name.setText("北方华创")
            window.candidate_sector.setText("半导体")
            window._save_candidate()
            self.assertEqual(window.candidate_table.rowCount(), 1)
            self.assertEqual(window.cockpit_candidates.rowCount(), 1)
            self.assertIn("建议", window.cockpit_candidate_badge.text())
            window.system.add_candidate(
                "688012", "中微公司", "半导体", source_ai="外部 AI"
            )
            window._refresh_extended()
            self.assertIn("候选池就绪", window.cockpit_candidate_badge.text())
            self.assertEqual(window.candidate_slots[0].name.text(), "中微公司")
            self.assertEqual(window.candidate_slots[1].name.text(), "北方华创")
            self.assertEqual(
                window.supervision_radar.axes[0][0], "L1"
            )

            window.command_input.setText("买入 002371 10 100")
            window._enqueue_trade()
            self.assertEqual(len(window.system.pending_trades()), 1)
            window._synchronize_pending()
            self.assertEqual(window.positions_table.rowCount(), 1)
            self.assertEqual(window.findings_table.rowCount(), 0)
            self.assertGreater(window.position_gauge.ratio, 0)
            self.assertLess(window.cash_gauge.ratio, 1)
            self.assertEqual(window.cockpit_sync.text(), "同步队列 0")
            self.assertEqual(
                window.position_viz_kpis["count"].text(), "1 只"
            )
            self.assertEqual(len(window.position_donut.segments), 1)
            self.assertEqual(window.supervision_score_gauge.score, 100)
            self.assertEqual(len(window.supervision_donut.segments), 3)
            holding_card = window.holdings_cards.itemAt(0).widget()
            self.assertIn("002371", holding_card.code_name.text())
            self.assertIn("#ef4444", holding_card.pnl.styleSheet())
            window.engine.sync_trade("卖出 002371 9 1", sector="半导体")
            window._refresh_cockpit()
            holding_card = window.holdings_cards.itemAt(0).widget()
            self.assertIn("#22c55e", holding_card.pnl.styleSheet())
            window.engine.update_current_capital("4900000")
            window._refresh_cockpit()
            self.assertIn("#16a34a", window.cockpit_kpis["pnl"].styleSheet())
            window.close()


if __name__ == "__main__":
    unittest.main()
