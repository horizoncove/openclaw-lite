"""Render all Sharon desktop pages for visual review without publishing."""

from __future__ import annotations

import argparse
import sys
import tempfile
from datetime import date
from pathlib import Path

from PyQt6.QtCore import QSettings
from PyQt6.QtWidgets import QApplication, QScrollArea

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sharon_trading_system_v1_0.workbench import WorkbenchWindow


PAGE_FILES = {
    "驾驶舱": "01-cockpit.png",
    "实时持仓": "02-positions.png",
    "交易流水": "03-trades.png",
    "风险中心": "04-risk.png",
    "候选股票": "05-candidates.png",
    "交易计划": "06-trade-plan.png",
    "AI 监督": "07-supervision.png",
    "每日复盘": "08-daily-review.png",
    "任务与资料": "09-tasks.png",
}


def seed_preview(window: WorkbenchWindow) -> None:
    window.system.add_candidate(
        "002371",
        "北方华创",
        "半导体设备",
        source_ai="Sharon 选股 AI",
        external_score=93,
        selection_reason="资金流、板块共振和龙头地位均通过外部 SOP。",
    )
    window.system.add_candidate(
        "688012",
        "中微公司",
        "半导体设备",
        source_ai="Sharon 选股 AI",
        external_score=91,
        selection_reason="外部 AI 选入的第二优先级候选。",
    )
    for command, sector in [
        ("买入 002371 100 5000", "半导体设备"),
        ("买入 002371 110 1000", "半导体设备"),
        ("买入 688012 200 2500", "半导体设备"),
        ("卖出 688012 190 100", "半导体设备"),
    ]:
        result = window.engine.sync_trade(command, sector=sector)
        window.system.record_execution_result(result)
    window.system.record_finding(
        "L2",
        "yellow",
        "review_evidence",
        "候选股票的外部 AI 原始报告建议补充归档。",
    )
    window.system.create_daily_review(
        review_date=date.today().isoformat(),
        mindset="稳定合规",
        summary="按候选池分批建仓，未触发硬规则。",
        lessons="继续观察半导体板块联动并严格执行止损。",
    )
    window.system.run_task("position_reminder")
    window.intent_command.setText("买入 002371 108.50 6000")
    window.intent_sector.setText("半导体设备")
    window.intent_stage.setCurrentText("第二次25%")
    window.intent_override.setText("等待回调确认后执行")
    window._validate_intent()
    window.review_summary.setPlainText("按计划完成候选股票建仓。")
    window.review_lessons.setPlainText("控制节奏，不在禁买时段追涨。")
    window.refresh()
    window._refresh_extended()


def render(output: Path) -> list[Path]:
    output.mkdir(parents=True, exist_ok=True)
    QSettings("Sharon", "TradingSystem").setValue("dark_mode", True)
    app = QApplication.instance() or QApplication([])
    rendered: list[Path] = []
    with tempfile.TemporaryDirectory() as directory:
        window = WorkbenchWindow(Path(directory) / "preview.db")
        seed_preview(window)
        window.resize(1440, 960)
        window.show()
        app.processEvents()
        for index in range(window.tabs.count()):
            title = window.tabs.tabText(index)
            filename = PAGE_FILES.get(title)
            if not filename:
                continue
            window.tabs.setCurrentIndex(index)
            widget = window.tabs.currentWidget()
            if isinstance(widget, QScrollArea):
                widget.verticalScrollBar().setValue(0)
            app.processEvents()
            app.processEvents()
            path = output / filename
            if not window.grab().save(str(path)):
                raise RuntimeError(f"Failed to render {title}")
            rendered.append(path)
        window.close()
    return rendered


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    for path in render(args.output):
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
