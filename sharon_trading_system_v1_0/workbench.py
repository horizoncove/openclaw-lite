"""覆盖 PDF 工作流的完整 Sharon 桌面工作台。"""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path

from PyQt6.QtCore import QDate, QDateTime, QTimer
from PyQt6.QtGui import QColor
from PyQt6.QtWidgets import (
    QComboBox,
    QDateEdit,
    QDoubleSpinBox,
    QFileDialog,
    QFormLayout,
    QFrame,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QProgressBar,
    QScrollArea,
    QTableWidget,
    QTableWidgetItem,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from .account_engine import InvalidTradeError
from .cockpit import CockpitCard, HoldingCard, RingGauge, StatusBadge
from .main_window import MainWindow, default_database_path
from .system_engine import SystemEngine


LIGHT_NAMES = {"green": "🟢 绿灯", "yellow": "🟡 黄灯", "red": "🔴 红灯"}


def _wan(value: Decimal) -> str:
    return f"{value / Decimal('10000'):,.2f} 万"


class WorkbenchWindow(MainWindow):
    """External-candidate, trade, supervision, review, and task workbench."""

    def __init__(self, db_path: str | Path | None = None) -> None:
        resolved_path = Path(db_path) if db_path else default_database_path()
        self.system = SystemEngine(resolved_path)
        super().__init__(resolved_path)
        self.setWindowTitle("Sharon 交易系统 v1.0 · 交易纪律 + AI 监督")
        self.resize(1440, 900)
        self.setMinimumSize(1120, 720)
        self._build_candidates_tab()
        self._build_intent_tab()
        self._build_supervision_tab()
        self._build_review_tab()
        self._build_tasks_tab()
        self._build_cockpit_tab()
        self.cockpit_timer = QTimer(self)
        self.cockpit_timer.setInterval(1000)
        self.cockpit_timer.timeout.connect(
            lambda: self.cockpit_time.setText(
                QDateTime.currentDateTime().toString("yyyy-MM-dd  HH:mm:ss")
            )
        )
        self.cockpit_timer.start()
        self._refresh_extended()

    def _build_cockpit_tab(self) -> None:
        scroll = QScrollArea()
        scroll.setObjectName("cockpitScroll")
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        page = QWidget()
        page.setObjectName("cockpitPage")
        layout = QVBoxLayout(page)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(14)

        hero = QFrame()
        hero.setObjectName("dashboardHero")
        hero_layout = QHBoxLayout(hero)
        hero_layout.setContentsMargins(24, 18, 24, 18)
        hero_copy = QVBoxLayout()
        hero_title = QLabel("交易驾驶舱")
        hero_title.setObjectName("heroTitle")
        hero_subtitle = QLabel("账户态势 · 风险纪律 · 候选池 · 执行状态")
        hero_subtitle.setObjectName("heroSubtitle")
        self.cockpit_time = QLabel()
        self.cockpit_time.setObjectName("heroTime")
        hero_copy.addWidget(hero_title)
        hero_copy.addWidget(hero_subtitle)
        hero_layout.addLayout(hero_copy)
        hero_layout.addStretch()
        self.cockpit_compliance = StatusBadge("系统正常", "green")
        self.cockpit_sync = StatusBadge("同步队列 0", "blue")
        self.cockpit_compliance.set_dark_mode(self.dark_mode)
        self.cockpit_sync.set_dark_mode(self.dark_mode)
        hero_layout.addWidget(self.cockpit_compliance)
        hero_layout.addWidget(self.cockpit_sync)
        hero_layout.addWidget(self.cockpit_time)
        layout.addWidget(hero)

        kpis = QGridLayout()
        kpis.setHorizontalSpacing(12)
        self.cockpit_kpis: dict[str, QLabel] = {}
        for column, (key, title, accent) in enumerate(
            [
                ("equity", "账户净值", "#2563eb"),
                ("pnl", "累计盈亏", "#dc2626"),
                ("market", "持仓市值", "#7c3aed"),
                ("cash", "可用现金", "#0891b2"),
            ]
        ):
            card = QFrame()
            card.setObjectName("cockpitKpi")
            card.setProperty("accent", accent)
            card_layout = QVBoxLayout(card)
            card_layout.setContentsMargins(18, 13, 18, 13)
            label = QLabel(title)
            label.setObjectName("kpiTitle")
            value = QLabel("--")
            value.setObjectName("kpiValue")
            value.setStyleSheet(f"color:{accent};")
            card_layout.addWidget(label)
            card_layout.addWidget(value)
            self.cockpit_kpis[key] = value
            kpis.addWidget(card, 0, column)
        layout.addLayout(kpis)

        grid = QGridLayout()
        grid.setHorizontalSpacing(14)
        grid.setVerticalSpacing(14)
        allocation = CockpitCard("资金仪表", "红线：总仓位 ≤60%，现金 ≥40%")
        gauges = QHBoxLayout()
        self.position_gauge = RingGauge("总仓位", threshold=0.60)
        self.cash_gauge = RingGauge(
            "现金比例", good_when_high=True, threshold=0.40
        )
        self.position_gauge.set_dark_mode(self.dark_mode)
        self.cash_gauge.set_dark_mode(self.dark_mode)
        gauges.addWidget(self.position_gauge)
        gauges.addWidget(self.cash_gauge)
        allocation.body.addLayout(gauges)
        grid.addWidget(allocation, 0, 0)

        candidate_card = CockpitCard(
            "外部 AI 候选池", "只记录最终 2–3 只，不在本软件选股"
        )
        self.cockpit_candidate_badge = StatusBadge("0 / 3", "yellow")
        self.cockpit_candidate_badge.set_dark_mode(self.dark_mode)
        candidate_card.body.addWidget(self.cockpit_candidate_badge)
        self.cockpit_candidates = self._table(["代码", "名称", "板块", "来源"])
        self.cockpit_candidates.setMaximumHeight(155)
        candidate_card.body.addWidget(self.cockpit_candidates)
        grid.addWidget(candidate_card, 0, 1)

        discipline = CockpitCard("纪律与监督", "L1 硬规则优先")
        self.cockpit_risk_badge = StatusBadge("🟢 全部合规", "green")
        self.cockpit_risk_badge.set_dark_mode(self.dark_mode)
        self.cockpit_grade = QLabel("月度评分 A · 100 分")
        self.cockpit_grade.setObjectName("cockpitBigText")
        self.cockpit_penalty = QLabel("处罚状态：正常")
        self.cockpit_findings = QLabel("未解决告警：0")
        discipline.body.addWidget(self.cockpit_risk_badge)
        discipline.body.addWidget(self.cockpit_grade)
        discipline.body.addWidget(self.cockpit_penalty)
        discipline.body.addWidget(self.cockpit_findings)
        discipline.body.addStretch()
        grid.addWidget(discipline, 0, 2)

        sector_card = CockpitCard("板块资金分布", "按当前总资产计算")
        self.sector_bars = QVBoxLayout()
        self.sector_bars.setSpacing(8)
        sector_card.body.addLayout(self.sector_bars)
        sector_card.body.addStretch()
        grid.addWidget(sector_card, 2, 0, 1, 3)

        actions = CockpitCard("快捷操作", "从驾驶舱直接进入核心流程")
        add_candidate = QPushButton("＋ 登记候选股票")
        add_candidate.clicked.connect(
            lambda: self.tabs.setCurrentWidget(self.candidate_page)
        )
        plan_trade = QPushButton("◎ 交易前纪律测算")
        plan_trade.clicked.connect(
            lambda: self.tabs.setCurrentWidget(self.intent_page)
        )
        review = QPushButton("✓ 完成每日复盘")
        review.setObjectName("secondaryButton")
        review.clicked.connect(
            lambda: self.tabs.setCurrentWidget(self.review_page)
        )
        refresh = QPushButton("↻ 刷新驾驶舱")
        refresh.setObjectName("secondaryButton")
        refresh.clicked.connect(self._refresh_cockpit)
        actions.body.addWidget(add_candidate)
        actions.body.addWidget(plan_trade)
        actions.body.addWidget(review)
        actions.body.addWidget(refresh)
        actions.body.addStretch()
        grid.addWidget(actions, 1, 2)

        holdings = CockpitCard(
            "当前持仓股票数据仪表盘",
            "红涨绿跌 · 最新成交价估值 · 单票仓位红线 25%",
        )
        self.holdings_cards = QHBoxLayout()
        self.holdings_cards.setSpacing(12)
        holdings.body.addLayout(self.holdings_cards)
        grid.addWidget(holdings, 1, 0, 1, 2)
        grid.setColumnStretch(0, 4)
        grid.setColumnStretch(1, 4)
        grid.setColumnStretch(2, 3)
        layout.addLayout(grid)
        layout.addStretch()
        scroll.setWidget(page)
        self.cockpit_page = scroll
        self.tabs.insertTab(0, scroll, "驾驶舱")
        self.tabs.setCurrentWidget(scroll)

    def _build_candidates_tab(self) -> None:
        page = QWidget()
        self.candidate_page = page
        layout = QVBoxLayout(page)
        note = QLabel(
            "SOP 选股由外部 AI 完成。本软件不评分、不推荐股票，"
            "仅记录最终选出的 2–3 只股票并用于交易准入检查。"
        )
        note.setWordWrap(True)
        note.setObjectName("hint")
        layout.addWidget(note)
        editor = QGroupBox("登记外部 AI 已选股票")
        editor_layout = QFormLayout(editor)
        self.candidate_code = QLineEdit()
        self.candidate_code.setPlaceholderText("6 位股票代码")
        self.candidate_name = QLineEdit()
        self.candidate_name.setPlaceholderText("股票名称")
        self.candidate_sector = QLineEdit()
        self.candidate_sector.setPlaceholderText("所属板块")
        self.candidate_source = QLineEdit("外部 AI")
        self.candidate_score = QDoubleSpinBox()
        self.candidate_score.setRange(0, 100)
        self.candidate_score.setSpecialValueText("未提供")
        self.candidate_reason = QTextEdit()
        self.candidate_reason.setMaximumHeight(70)
        self.candidate_reason.setPlaceholderText("粘贴外部 AI 的入选理由或摘要")
        save = QPushButton("加入/更新候选池")
        save.clicked.connect(self._save_candidate)
        editor_layout.addRow("股票代码", self.candidate_code)
        editor_layout.addRow("股票名称", self.candidate_name)
        editor_layout.addRow("所属板块", self.candidate_sector)
        editor_layout.addRow("选股来源", self.candidate_source)
        editor_layout.addRow("外部评分（可选）", self.candidate_score)
        editor_layout.addRow("入选理由", self.candidate_reason)
        editor_layout.addRow(save)
        layout.addWidget(editor)
        self.candidate_count_label = QLabel("当前候选池：0/3")
        self.candidate_count_label.setStyleSheet("font-weight: 700;")
        layout.addWidget(self.candidate_count_label)
        self.candidate_table = self._table(
            ["入选时间", "代码", "名称", "板块", "来源 AI", "外部评分", "理由"]
        )
        layout.addWidget(self.candidate_table)
        archive = QPushButton("移出选中的候选股票")
        archive.setObjectName("secondaryButton")
        archive.clicked.connect(self._archive_candidate)
        layout.addWidget(archive)
        self.tabs.addTab(page, "候选股票")

    def _build_intent_tab(self) -> None:
        page = QWidget()
        self.intent_page = page
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
            "自动检查：外部 AI 候选池、单票/板块/总仓位/现金、禁买时段、"
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
            "L1 硬规则：候选池准入、仓位、加仓、止损止盈、时间和处罚；"
            "L2 软规则：证据与数据一致性；L3 心理规则：亏损日不报复、盈利日不贪。"
        )
        rules.setWordWrap(True)
        layout.addWidget(rules)
        self.tabs.addTab(page, "AI 监督")

    def _build_review_tab(self) -> None:
        page = QWidget()
        self.review_page = page
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
            "职责边界：外部 AI 负责 SOP 分析和选股；本软件只记录 2–3 只"
            "最终候选股票，并负责交易计划、持仓纪律、风险监督和复盘。"
        )
        references.setWordWrap(True)
        layout.addWidget(references)
        self.tabs.addTab(page, "任务与资料")

    def _save_candidate(self) -> None:
        score = self.candidate_score.value()
        try:
            candidate = self.system.add_candidate(
                self.candidate_code.text().strip(),
                self.candidate_name.text().strip(),
                self.candidate_sector.text().strip(),
                source_ai=self.candidate_source.text(),
                external_score=score if score else None,
                selection_reason=self.candidate_reason.toPlainText(),
            )
        except ValueError as exc:
            QMessageBox.warning(self, "无法保存候选股票", str(exc))
            return
        self.statusBar().showMessage(
            f"候选股票已记录：{candidate['stock_code']} "
            f"{candidate['stock_name']}",
            5000
        )
        self._refresh_candidates()
        self._refresh_cockpit()

    def _archive_candidate(self) -> None:
        row = self.candidate_table.currentRow()
        if row < 0:
            QMessageBox.information(self, "选择股票", "请先选择一只候选股票")
            return
        candidate_id = self.candidate_table.item(row, 0).data(256)
        try:
            self.system.archive_candidate(candidate_id)
        except ValueError as exc:
            QMessageBox.warning(self, "无法移出", str(exc))
            return
        self._refresh_candidates()
        self._refresh_cockpit()

    def _validate_intent(self) -> None:
        command = self.intent_command.text().strip()
        entered_sector = self.intent_sector.text().strip()
        try:
            trade = self.engine.parse_trade(command, entered_sector or "未分类")
            candidate = self.system.active_candidate(trade.stock_code)
            sector = (
                entered_sector
                or (candidate["sector"] if candidate else None)
                or "未分类"
            )
            result = self.system.validate_trade_intent(
                self.engine,
                command,
                sector=sector,
                candidate_id=candidate["id"] if candidate else None,
                build_stage=self.intent_stage.currentText(),
            )
            self.system.save_trade_intent(
                command,
                trade.stock_code,
                sector,
                result,
                candidate_id=candidate["id"] if candidate else None,
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
        self.cockpit_sync.set_status(f"同步队列 {count}", "yellow")

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

    def _save_capital(self) -> None:
        super()._save_capital()
        if hasattr(self, "cockpit_page"):
            self._refresh_cockpit()

    def _toggle_theme(self) -> None:
        super()._toggle_theme()
        if hasattr(self, "position_gauge"):
            self.position_gauge.set_dark_mode(self.dark_mode)
            self.cash_gauge.set_dark_mode(self.dark_mode)
            for badge in (
                self.cockpit_compliance,
                self.cockpit_sync,
                self.cockpit_candidate_badge,
                self.cockpit_risk_badge,
            ):
                badge.set_dark_mode(self.dark_mode)

    @staticmethod
    def _clear_layout(layout: QVBoxLayout) -> None:
        while layout.count():
            item = layout.takeAt(0)
            widget = item.widget()
            child_layout = item.layout()
            if widget:
                widget.deleteLater()
            elif child_layout:
                WorkbenchWindow._clear_layout(child_layout)

    def _refresh_cockpit(self) -> None:
        account = self.engine.load_account()
        snapshot = self.engine.calculate_positions()
        candidates = self.system.list_candidates()
        findings = self.system.list_findings()
        grade = self.system.monthly_grade()
        violations = self.engine.check_risk_limits()
        live_signals = self.system.position_discipline_signals(self.engine)
        pending_count = len(self.system.pending_trades())

        self.cockpit_time.setText(
            QDateTime.currentDateTime().toString("yyyy-MM-dd  HH:mm:ss")
        )
        self.cockpit_kpis["equity"].setText(_wan(account.current_capital))
        self.cockpit_kpis["pnl"].setText(
            f"{'+' if account.total_pnl >= 0 else ''}{_wan(account.total_pnl)}"
        )
        self.cockpit_kpis["pnl"].setStyleSheet(
            f"color:{'#dc2626' if account.total_pnl >= 0 else '#16a34a'};"
        )
        self.cockpit_kpis["market"].setText(
            _wan(snapshot["total_market_value"])
        )
        self.cockpit_kpis["cash"].setText(_wan(snapshot["cash"]))
        self.position_gauge.set_ratio(float(snapshot["total_position_ratio"]))
        self.cash_gauge.set_ratio(float(snapshot["cash_ratio"]))

        candidate_tone = "green" if 2 <= len(candidates) <= 3 else "yellow"
        self.cockpit_candidate_badge.set_status(
            f"{len(candidates)} / 3"
            + (" · 候选池就绪" if candidate_tone == "green" else " · 建议 2–3 只"),
            candidate_tone,
        )
        self.cockpit_candidates.setRowCount(len(candidates))
        for row, candidate in enumerate(candidates):
            values = [
                candidate["stock_code"],
                candidate["stock_name"] or "-",
                candidate["sector"],
                candidate["source_ai"],
            ]
            for column, value in enumerate(values):
                self.cockpit_candidates.setItem(
                    row, column, QTableWidgetItem(value)
                )

        red_messages = {
            item["message"]
            for item in findings
            if item["severity"] == "red" and item["status"] == "open"
        }
        red_messages.update(item["message"] for item in violations)
        red_messages.update(
            signal["message"]
            for signal in live_signals
            if signal["severity"] == "red"
        )
        yellow_messages = {
            item["message"]
            for item in findings
            if item["severity"] == "yellow" and item["status"] == "open"
        }
        yellow_messages.update(
            signal["message"]
            for signal in live_signals
            if signal["severity"] == "yellow"
        )
        red_count = len(red_messages)
        yellow_count = len(yellow_messages)
        if red_count:
            self.cockpit_risk_badge.set_status(
                f"🔴 {red_count} 项硬规则风险", "red"
            )
            self.cockpit_compliance.set_status("风险待处理", "red")
        elif yellow_count:
            self.cockpit_risk_badge.set_status(
                f"🟡 {yellow_count} 项待改进", "yellow"
            )
            self.cockpit_compliance.set_status("存在提醒", "yellow")
        else:
            self.cockpit_risk_badge.set_status("🟢 全部合规", "green")
            self.cockpit_compliance.set_status("系统正常", "green")
        self.cockpit_grade.setText(
            f"月度评分 {grade['grade']} · {grade['score']} 分"
        )
        self.cockpit_penalty.setText(
            f"处罚状态：{self.system.active_suspension() or '正常'}"
        )
        self.cockpit_findings.setText(
            f"未解决告警：{red_count + yellow_count}"
        )
        self.cockpit_sync.set_status(
            f"同步队列 {pending_count}",
            "yellow" if pending_count else "blue",
        )

        self._clear_layout(self.sector_bars)
        sectors = sorted(
            snapshot["sector_values"].items(),
            key=lambda item: item[1],
            reverse=True,
        )
        if not sectors:
            empty = QLabel("暂无持仓，资金分布将在成交后显示")
            empty.setObjectName("cockpitHint")
            self.sector_bars.addWidget(empty)
        for sector, value in sectors:
            row = QHBoxLayout()
            name = QLabel(sector)
            name.setMinimumWidth(90)
            bar = QProgressBar()
            bar.setRange(0, 1000)
            ratio = value / snapshot["current_capital"]
            bar.setValue(min(1000, int(ratio * 1000)))
            bar.setFormat(f"{ratio:.1%}  ·  {_wan(value)}")
            row.addWidget(name)
            row.addWidget(bar, 1)
            self.sector_bars.addLayout(row)

        self._clear_layout(self.holdings_cards)
        if not snapshot["positions"]:
            empty = QLabel("当前空仓 · 成交同步后将在这里展示每只持仓股票")
            empty.setObjectName("cockpitHint")
            self.holdings_cards.addWidget(empty)
        candidate_names: dict[str, str] = {}
        for candidate in self.system.list_candidates(include_archived=True):
            candidate_names.setdefault(
                candidate["stock_code"], candidate["stock_name"]
            )
        for position in snapshot["positions"]:
            card = HoldingCard()
            card.set_data(
                position,
                candidate_names.get(position["stock_code"], ""),
            )
            self.holdings_cards.addWidget(card, 1)

    def _refresh_extended(self) -> None:
        self._refresh_cockpit()
        self._refresh_candidates()
        self._refresh_supervision()
        self._refresh_reviews()
        self._refresh_tasks()

    def _refresh_candidates(self) -> None:
        rows = self.system.list_candidates()
        self.candidate_count_label.setText(
            f"当前候选池：{len(rows)}/3"
            + ("（建议保持 2–3 只）" if len(rows) < 2 else "")
        )
        self.candidate_table.setRowCount(len(rows))
        for row, item in enumerate(rows):
            values = [
                item["selected_at"],
                item["stock_code"],
                item["stock_name"],
                item["sector"],
                item["source_ai"],
                (
                    f"{item['external_score']:g}"
                    if item["external_score"] is not None
                    else "-"
                ),
                item["selection_reason"],
            ]
            for column, value in enumerate(values):
                cell = QTableWidgetItem(value)
                if column == 0:
                    cell.setData(256, item["id"])
                self.candidate_table.setItem(row, column, cell)

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
        self.cockpit_timer.stop()
        self.sync_timer.stop()
        self.engine.close()
        self.system.close()
        event.accept()


__all__ = ["WorkbenchWindow"]
