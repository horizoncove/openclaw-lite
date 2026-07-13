"""覆盖 PDF 工作流的完整 Sharon 桌面工作台。"""

from __future__ import annotations

from datetime import date
from pathlib import Path

from PyQt6.QtCore import QDate
from PyQt6.QtGui import QColor
from PyQt6.QtWidgets import (
    QComboBox,
    QDateEdit,
    QFileDialog,
    QFormLayout,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QSpinBox,
    QTableWidget,
    QTableWidgetItem,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from .account_engine import InvalidTradeError
from .main_window import MainWindow, default_database_path
from .system_engine import DEFAULT_CRITERIA, SystemEngine


LIGHT_NAMES = {"green": "🟢 绿灯", "yellow": "🟡 黄灯", "red": "🔴 红灯"}


class WorkbenchWindow(MainWindow):
    """完整 SOP、交易、监督、复盘和任务工作台。"""

    def __init__(self, db_path: str | Path | None = None) -> None:
        resolved_path = Path(db_path) if db_path else default_database_path()
        self.system = SystemEngine(resolved_path)
        super().__init__(resolved_path)
        self.setWindowTitle("Sharon 交易系统 v1.0 · SOP + 纪律 + AI 监督")
        self._build_sop_tab()
        self._build_intent_tab()
        self._build_supervision_tab()
        self._build_review_tab()
        self._build_tasks_tab()
        self._refresh_extended()

    def _build_sop_tab(self) -> None:
        page = QWidget()
        layout = QVBoxLayout(page)
        editor = QGroupBox("七星 SOP 评估（每项 0-10，≥65 才可开仓）")
        editor_layout = QGridLayout(editor)
        self.sop_code = QLineEdit()
        self.sop_code.setPlaceholderText("6 位股票代码")
        self.sop_name = QLineEdit()
        self.sop_name.setPlaceholderText("股票名称")
        self.sop_sector = QLineEdit()
        self.sop_sector.setPlaceholderText("所属板块")
        editor_layout.addWidget(QLabel("代码"), 0, 0)
        editor_layout.addWidget(self.sop_code, 0, 1)
        editor_layout.addWidget(QLabel("名称"), 0, 2)
        editor_layout.addWidget(self.sop_name, 0, 3)
        editor_layout.addWidget(QLabel("板块"), 0, 4)
        editor_layout.addWidget(self.sop_sector, 0, 5)
        self.sop_scores: list[QSpinBox] = []
        for index, criterion in enumerate(DEFAULT_CRITERIA):
            score = QSpinBox()
            score.setRange(0, 10)
            score.setValue(0)
            self.sop_scores.append(score)
            editor_layout.addWidget(QLabel(criterion), 1, index)
            editor_layout.addWidget(score, 2, index)
        self.sop_evidence = QTextEdit()
        self.sop_evidence.setPlaceholderText("填写判断依据、数据来源或文档链接")
        self.sop_evidence.setMaximumHeight(70)
        save = QPushButton("保存 SOP 评估")
        save.clicked.connect(self._save_sop)
        editor_layout.addWidget(self.sop_evidence, 3, 0, 1, 6)
        editor_layout.addWidget(save, 3, 6)
        layout.addWidget(editor)
        self.sop_table = self._table(
            ["时间", "代码", "名称", "板块", "总分", "分类", "依据"]
        )
        layout.addWidget(self.sop_table)
        self.tabs.addTab(page, "SOP 选股")

    def _build_intent_tab(self) -> None:
        page = QWidget()
        layout = QVBoxLayout(page)
        form_box = QGroupBox("交易前纪律检查")
        form = QFormLayout(form_box)
        self.intent_command = QLineEdit()
        self.intent_command.setPlaceholderText("买入 002371 350.00 3000")
        self.intent_sector = QLineEdit()
        self.intent_sector.setPlaceholderText("板块")
        self.intent_stage = QComboBox()
        self.intent_stage.addItems(["首次25%", "第二次25%", "第三次50%", "加仓"])
        self.intent_override = QLineEdit()
        self.intent_override.setPlaceholderText("黄灯继续时必须填写理由")
        validate = QPushButton("测算并保存计划")
        validate.clicked.connect(self._validate_intent)
        form.addRow("交易指令", self.intent_command)
        form.addRow("板块", self.intent_sector)
        form.addRow("建仓阶段", self.intent_stage)
        form.addRow("黄灯说明", self.intent_override)
        form.addRow(validate)
        layout.addWidget(form_box)
        self.intent_light = QLabel("等待测算")
        self.intent_light.setStyleSheet(
            "font-size: 22px; font-weight: 700; padding: 12px;"
        )
        self.intent_details = QTextEdit()
        self.intent_details.setReadOnly(True)
        layout.addWidget(self.intent_light)
        layout.addWidget(self.intent_details, 1)
        discipline = QLabel(
            "自动检查：SOP ≥65、单票/板块/总仓位/现金、禁买时段、"
            "浮盈 ≥10% 才加仓且仅一次。卖出始终允许用于止损止盈。"
        )
        discipline.setWordWrap(True)
        discipline.setObjectName("hint")
        layout.addWidget(discipline)
        self.tabs.addTab(page, "交易计划")

    def _build_supervision_tab(self) -> None:
        page = QWidget()
        layout = QVBoxLayout(page)
        top = QHBoxLayout()
        self.grade_label = QLabel("月度评分：--")
        self.grade_label.setStyleSheet("font-size: 20px; font-weight: 700;")
        self.penalty_label = QLabel("处罚状态：正常")
        refresh = QPushButton("刷新监督结果")
        refresh.clicked.connect(self._refresh_supervision)
        top.addWidget(self.grade_label)
        top.addWidget(self.penalty_label)
        top.addStretch()
        top.addWidget(refresh)
        layout.addLayout(top)
        self.findings_table = self._table(
            ["时间", "层级", "灯号", "规则", "说明", "状态"]
        )
        layout.addWidget(self.findings_table)
        rules = QLabel(
            "L1 硬规则：SOP、仓位、加仓、止损止盈、时间和处罚；"
            "L2 软规则：证据与数据一致性；L3 心理规则：亏损日不报复、盈利日不贪。"
        )
        rules.setWordWrap(True)
        layout.addWidget(rules)
        self.tabs.addTab(page, "AI 监督")

    def _build_review_tab(self) -> None:
        page = QWidget()
        layout = QHBoxLayout(page)
        editor = QGroupBox("15:30 每日纪律复盘")
        form = QFormLayout(editor)
        self.review_date = QDateEdit(QDate.currentDate())
        self.review_date.setCalendarPopup(True)
        self.review_mindset = QComboBox()
        self.review_mindset.addItems(
            ["稳定合规", "亏损但无报复交易", "盈利但无贪婪加仓", "需要改进"]
        )
        self.review_summary = QTextEdit()
        self.review_summary.setPlaceholderText("今日计划、执行和市场判断")
        self.review_lessons = QTextEdit()
        self.review_lessons.setPlaceholderText("问题、经验和下个交易日行动")
        save = QPushButton("生成/更新复盘")
        save.clicked.connect(self._save_review)
        no_trade = QPushButton("记录主动空仓")
        no_trade.setObjectName("secondaryButton")
        no_trade.clicked.connect(self._record_no_trade)
        actions = QHBoxLayout()
        actions.addWidget(save)
        actions.addWidget(no_trade)
        form.addRow("日期", self.review_date)
        form.addRow("心理纪律", self.review_mindset)
        form.addRow("执行总结", self.review_summary)
        form.addRow("经验与行动", self.review_lessons)
        form.addRow(actions)
        layout.addWidget(editor, 1)
        self.reviews_table = self._table(
            ["日期", "交易数", "红灯", "黄灯", "心理状态", "评分"]
        )
        layout.addWidget(self.reviews_table, 1)
        self.tabs.addTab(page, "每日复盘")

    def _build_tasks_tab(self) -> None:
        page = QWidget()
        layout = QVBoxLayout(page)
        note = QLabel(
            "桌面端仅在软件运行时执行提醒；以下时间均按 Asia/Shanghai。"
            "“每日自动更新”按 PDF 要求保持禁用。"
        )
        note.setWordWrap(True)
        layout.addWidget(note)
        cash_row = QHBoxLayout()
        cash_row.addWidget(QLabel("五种强制空仓条件"))
        self.cash_condition_combo = QComboBox()
        toggle_cash = QPushButton("切换激活状态")
        toggle_cash.setObjectName("secondaryButton")
        toggle_cash.clicked.connect(self._toggle_cash_condition)
        cash_row.addWidget(self.cash_condition_combo, 1)
        cash_row.addWidget(toggle_cash)
        layout.addLayout(cash_row)
        self.tasks_table = self._table(
            ["任务", "计划", "启用", "上次运行", "状态", "说明"]
        )
        controls = QHBoxLayout()
        run = QPushButton("手动运行选中任务")
        run.clicked.connect(self._run_selected_task)
        export = QPushButton("导出账户及交易 CSV")
        export.setObjectName("secondaryButton")
        export.clicked.connect(self._export_csv)
        controls.addWidget(run)
        controls.addWidget(export)
        controls.addStretch()
        layout.addWidget(self.tasks_table)
        layout.addLayout(controls)
        references = QLabel(
            "文档索引：SOP v3.1 验证报告 · SOP 实战经验 · 7-1 涨停板分析 · "
            "半导体板块监控 · 严格交易纪律手册 · AI 纪律监督员方案"
        )
        references.setWordWrap(True)
        layout.addWidget(references)
        self.tabs.addTab(page, "任务与资料")

    def _save_sop(self) -> None:
        try:
            evaluation = self.system.save_sop_evaluation(
                self.sop_code.text().strip(),
                self.sop_name.text().strip(),
                self.sop_sector.text().strip(),
                [score.value() for score in self.sop_scores],
                evidence=self.sop_evidence.toPlainText(),
            )
        except ValueError as exc:
            QMessageBox.warning(self, "无法保存 SOP", str(exc))
            return
        self.statusBar().showMessage(
            f"SOP 已保存：{evaluation['total_score']} 分 "
            f"{evaluation['classification']}",
            5000,
        )
        self._refresh_sop()

    def _validate_intent(self) -> None:
        command = self.intent_command.text().strip()
        sector = self.intent_sector.text().strip() or "未分类"
        try:
            trade = self.engine.parse_trade(command, sector)
            sop = self.system.latest_sop(trade.stock_code)
            result = self.system.validate_trade_intent(
                self.engine,
                command,
                sector=sector,
                sop_evaluation_id=sop["id"] if sop else None,
                build_stage=self.intent_stage.currentText(),
            )
            self.system.save_trade_intent(
                command,
                trade.stock_code,
                sector,
                result,
                sop_evaluation_id=sop["id"] if sop else None,
                build_stage=self.intent_stage.currentText(),
                override_reason=self.intent_override.text(),
            )
        except (ValueError, InvalidTradeError) as exc:
            QMessageBox.warning(self, "计划无效", str(exc))
            return
        self.intent_light.setText(LIGHT_NAMES[result.light])
        color = {"green": "#059669", "yellow": "#d97706", "red": "#dc2626"}[
            result.light
        ]
        self.intent_light.setStyleSheet(
            f"font-size: 22px; font-weight: 700; padding: 12px; color: {color};"
        )
        self.intent_details.setPlainText(
            "\n".join(
                [
                    *[f"• {reason}" for reason in result.reasons],
                    "",
                    f"预计单票仓位：{result.projected_stock_ratio:.2%}",
                    f"预计板块仓位：{result.projected_sector_ratio:.2%}",
                    f"预计总仓位：{result.projected_total_ratio:.2%}",
                    f"预计现金比例：{result.projected_cash_ratio:.2%}",
                ]
            )
        )
        self._refresh_supervision()

    def _enqueue_trade(self) -> None:
        command = self.command_input.text().strip()
        sector = self.sector_input.text().strip() or None
        try:
            self.engine.parse_trade(command, sector or "未分类")
        except InvalidTradeError as exc:
            QMessageBox.warning(self, "交易指令无效", str(exc))
            return
        self.system.enqueue_trade(command, sector)
        self.command_input.clear()
        self.sector_input.clear()
        count = len(self.system.pending_trades())
        self.queue_label.setText(f"待同步 {count} 笔；将在下一个 5 秒周期处理")

    def _synchronize_pending(self) -> None:
        pending = self.system.pending_trades()
        if not pending:
            self.queue_label.setText("同步正常 · 当前队列为空")
            return
        success = 0
        messages: list[str] = []
        for item in pending:
            try:
                result = self.engine.sync_trade(
                    item["command"], sector=item["sector"]
                )
                self.system.record_execution_result(result)
                self.system.complete_queued_trade(item["id"])
                success += 1
                messages.extend(v["message"] for v in result["violations"])
            except (InvalidTradeError, ValueError) as exc:
                self.system.complete_queued_trade(item["id"], error=str(exc))
                messages.append(str(exc))
        self.refresh()
        self._refresh_extended()
        self.queue_label.setText(
            f"本周期同步 {success}/{len(pending)} 笔"
            + (f" · {'；'.join(messages)}" if messages else " · 风控正常")
        )

    def _save_review(self) -> None:
        review = self.system.create_daily_review(
            review_date=self.review_date.date().toString("yyyy-MM-dd"),
            mindset=self.review_mindset.currentText(),
            summary=self.review_summary.toPlainText(),
            lessons=self.review_lessons.toPlainText(),
        )
        self.statusBar().showMessage(f"复盘已保存，评分 {review['grade']}", 5000)
        self._refresh_reviews()

    def _record_no_trade(self) -> None:
        self.system.record_decision("主动空仓", "遵守空仓纪律，以分析为主")
        self.statusBar().showMessage("已记录主动空仓决策", 5000)

    def _run_selected_task(self) -> None:
        row = self.tasks_table.currentRow()
        if row < 0:
            QMessageBox.information(self, "选择任务", "请先选择一项任务")
            return
        task_key = self.tasks_table.item(row, 0).data(256)
        try:
            self.system.run_task(task_key)
        except ValueError as exc:
            QMessageBox.warning(self, "无法运行", str(exc))
            return
        self._refresh_tasks()

    def _toggle_cash_condition(self) -> None:
        key = self.cash_condition_combo.currentData()
        if not key:
            return
        condition = next(
            item
            for item in self.system.list_cash_conditions()
            if item["condition_key"] == key
        )
        self.system.set_cash_condition(key, not bool(condition["active"]))
        self._refresh_tasks()

    def _export_csv(self) -> None:
        directory = QFileDialog.getExistingDirectory(self, "选择导出目录")
        if not directory:
            return
        paths = self.system.export_csv(directory, self.engine)
        QMessageBox.information(
            self, "导出完成", "\n".join(str(path) for path in paths)
        )

    def _refresh_extended(self) -> None:
        self._refresh_sop()
        self._refresh_supervision()
        self._refresh_reviews()
        self._refresh_tasks()

    def _refresh_sop(self) -> None:
        rows = self.system.list_sop_evaluations()
        self.sop_table.setRowCount(len(rows))
        for row, item in enumerate(rows):
            values = [
                item["created_at"],
                item["stock_code"],
                item["stock_name"],
                item["sector"],
                str(item["total_score"]),
                item["classification"],
                item["evidence"],
            ]
            for column, value in enumerate(values):
                cell = QTableWidgetItem(value)
                if column == 5:
                    cell.setForeground(
                        QColor(
                            "#059669"
                            if value == "STRICT"
                            else "#d97706"
                            if value == "NOISE"
                            else "#dc2626"
                        )
                    )
                self.sop_table.setItem(row, column, cell)

    def _refresh_supervision(self) -> None:
        grade = self.system.monthly_grade()
        self.grade_label.setText(
            f"月度评分：{grade['grade']}（{grade['score']} 分） · "
            f"红 {grade['red']} / 黄 {grade['yellow']}"
        )
        penalty = self.system.active_suspension()
        self.penalty_label.setText(f"处罚状态：{penalty or '正常'}")
        rows = self.system.list_findings()
        live_signals = self.system.position_discipline_signals(self.engine)
        rows = [
            {
                "created_at": "实时",
                "level": "L1",
                "severity": signal["severity"],
                "rule_code": signal["rule"],
                "message": signal["message"],
                "status": "待执行",
            }
            for signal in live_signals
        ] + rows
        self.findings_table.setRowCount(len(rows))
        for row, item in enumerate(rows):
            values = [
                item["created_at"],
                item["level"],
                LIGHT_NAMES[item["severity"]],
                item["rule_code"],
                item["message"],
                item["status"],
            ]
            for column, value in enumerate(values):
                cell = QTableWidgetItem(value)
                if item["severity"] == "red":
                    cell.setForeground(QColor("#dc2626"))
                elif item["severity"] == "yellow":
                    cell.setForeground(QColor("#d97706"))
                self.findings_table.setItem(row, column, cell)

    def _refresh_reviews(self) -> None:
        rows = self.system.list_reviews()
        self.reviews_table.setRowCount(len(rows))
        for row, item in enumerate(rows):
            values = [
                item["review_date"],
                str(item["trade_count"]),
                str(item["red_count"]),
                str(item["yellow_count"]),
                item["mindset"],
                item["grade"],
            ]
            for column, value in enumerate(values):
                self.reviews_table.setItem(row, column, QTableWidgetItem(value))

    def _refresh_tasks(self) -> None:
        selected = self.cash_condition_combo.currentData()
        self.cash_condition_combo.clear()
        for condition in self.system.list_cash_conditions():
            state = "🔴 已激活" if condition["active"] else "⚪ 未激活"
            self.cash_condition_combo.addItem(
                f"{state} · {condition['name']}", condition["condition_key"]
            )
        if selected:
            index = self.cash_condition_combo.findData(selected)
            if index >= 0:
                self.cash_condition_combo.setCurrentIndex(index)
        rows = self.system.list_tasks()
        self.tasks_table.setRowCount(len(rows))
        for row, item in enumerate(rows):
            values = [
                item["name"],
                item["schedule"],
                "是" if item["enabled"] else "否",
                item["last_run"] or "-",
                item["last_status"] or "等待",
                item["last_message"] or "-",
            ]
            for column, value in enumerate(values):
                cell = QTableWidgetItem(value)
                if column == 0:
                    cell.setData(256, item["task_key"])
                if not item["enabled"]:
                    cell.setForeground(QColor("#9ca3af"))
                self.tasks_table.setItem(row, column, cell)

    def closeEvent(self, event) -> None:  # noqa: N802
        self.sync_timer.stop()
        self.engine.close()
        self.system.close()
        event.accept()


__all__ = ["WorkbenchWindow"]
