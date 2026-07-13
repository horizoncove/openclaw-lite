"""Sharon Trading System 的 PyQt6 主窗口。"""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path

from PyQt6.QtCore import QSettings, QStandardPaths, QTimer
from PyQt6.QtGui import QColor, QFont
from PyQt6.QtWidgets import (
    QAbstractItemView,
    QApplication,
    QDoubleSpinBox,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QStatusBar,
    QTabWidget,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from .account_engine import AccountEngine, InvalidTradeError


def default_database_path() -> Path:
    """Return a writable per-user location for source and installed builds."""
    data_directory = QStandardPaths.writableLocation(
        QStandardPaths.StandardLocation.AppLocalDataLocation
    )
    if not data_directory:
        data_directory = str(Path.home() / ".sharon_trading_system")
    return Path(data_directory) / "data" / "sharon_trading.db"


def _wan(value: Decimal) -> str:
    return f"{value / Decimal('10000'):,.2f} 万"


def _percent(value: Decimal) -> str:
    return f"{value * 100:.2f}%"


class MetricCard(QFrame):
    def __init__(self, title: str, color: str = "#2563eb") -> None:
        super().__init__()
        self.setObjectName("metricCard")
        layout = QVBoxLayout(self)
        layout.setContentsMargins(18, 14, 18, 14)
        title_label = QLabel(title)
        title_label.setObjectName("metricTitle")
        self.value_label = QLabel("--")
        self.value_label.setFont(QFont("", 18, QFont.Weight.DemiBold))
        self.value_label.setStyleSheet(f"color: {color};")
        layout.addWidget(title_label)
        layout.addWidget(self.value_label)

    def set_value(self, value: str, color: str | None = None) -> None:
        self.value_label.setText(value)
        if color:
            self.value_label.setStyleSheet(f"color: {color};")


class MainWindow(QMainWindow):
    """账户总览、交易同步、持仓和风险告警工作台。"""

    def __init__(self, db_path: str | Path | None = None) -> None:
        super().__init__()
        self.settings = QSettings("Sharon", "TradingSystem")
        self.dark_mode = self.settings.value("dark_mode", False, type=bool)
        data_path = db_path or default_database_path()
        self.engine = AccountEngine(
            data_path,
            sector_mapping={
                "002371": "电子",
                "000001": "银行",
                "600519": "食品饮料",
            },
        )
        self.pending_commands: list[tuple[str, str | None]] = []
        self.setWindowTitle("Sharon Trading System v1.0")
        self.resize(1180, 760)
        self.setMinimumSize(980, 640)
        self._build_ui()
        self._apply_style()

        self.sync_timer = QTimer(self)
        self.sync_timer.setInterval(5000)
        self.sync_timer.timeout.connect(self._synchronize_pending)
        self.sync_timer.start()
        self.refresh()

    def _build_ui(self) -> None:
        central = QWidget()
        root = QVBoxLayout(central)
        root.setContentsMargins(24, 20, 24, 20)
        root.setSpacing(16)

        heading = QHBoxLayout()
        titles = QVBoxLayout()
        title = QLabel("Sharon 交易控制台")
        title.setObjectName("pageTitle")
        subtitle = QLabel("个人量化执行驾驶舱 · 本地 SQLite · 5 秒同步")
        subtitle.setObjectName("subtitle")
        titles.addWidget(title)
        titles.addWidget(subtitle)
        heading.addLayout(titles)
        heading.addStretch()

        self.theme_button = QPushButton()
        self.theme_button.setObjectName("themeButton")
        self.theme_button.clicked.connect(self._toggle_theme)
        self._update_theme_button()
        capital_label = QLabel("当前总额")
        self.capital_input = QDoubleSpinBox()
        self.capital_input.setRange(0, 999_999_999)
        self.capital_input.setDecimals(2)
        self.capital_input.setSingleStep(10_000)
        self.capital_input.setSuffix(" 元")
        self.capital_input.setMinimumWidth(180)
        save_capital = QPushButton("更新净值")
        save_capital.setObjectName("secondaryButton")
        save_capital.clicked.connect(self._save_capital)
        heading.addWidget(self.theme_button)
        heading.addWidget(capital_label)
        heading.addWidget(self.capital_input)
        heading.addWidget(save_capital)
        root.addLayout(heading)

        cards = QGridLayout()
        cards.setHorizontalSpacing(12)
        self.capital_card = MetricCard("当前总额")
        self.pnl_card = MetricCard("累计盈亏", "#dc2626")
        self.position_card = MetricCard("总仓位", "#7c3aed")
        self.cash_card = MetricCard("可用现金", "#0891b2")
        self.metric_cards = [
            self.capital_card,
            self.pnl_card,
            self.position_card,
            self.cash_card,
        ]
        for column, card in enumerate(self.metric_cards):
            cards.addWidget(card, 0, column)
        root.addLayout(cards)

        trade_frame = QFrame()
        self.trade_frame = trade_frame
        trade_frame.setObjectName("panel")
        trade_layout = QVBoxLayout(trade_frame)
        trade_title = QLabel("交易同步")
        trade_title.setObjectName("sectionTitle")
        trade_layout.addWidget(trade_title)
        trade_row = QHBoxLayout()
        self.command_input = QLineEdit()
        self.command_input.setPlaceholderText("例如：买入 002371 350.00 3600")
        self.command_input.returnPressed.connect(self._enqueue_trade)
        self.sector_input = QLineEdit()
        self.sector_input.setPlaceholderText("板块（可选）")
        self.sector_input.setMaximumWidth(180)
        enqueue_button = QPushButton("加入同步队列")
        enqueue_button.clicked.connect(self._enqueue_trade)
        trade_row.addWidget(self.command_input, 1)
        trade_row.addWidget(self.sector_input)
        trade_row.addWidget(enqueue_button)
        trade_layout.addLayout(trade_row)
        self.queue_label = QLabel("等待输入交易指令；队列每 5 秒同步一次")
        self.queue_label.setObjectName("hint")
        trade_layout.addWidget(self.queue_label)
        root.addWidget(trade_frame)

        self.tabs = QTabWidget()
        self.positions_table = self._table(
            ["股票代码", "板块", "数量", "平均成本", "最新价", "市值", "仓位"]
        )
        self.trades_table = self._table(
            ["时间", "方向", "股票代码", "板块", "价格", "数量", "成交额"]
        )
        self.risk_table = self._table(
            ["状态", "规则", "对象", "当前值", "红线", "说明"]
        )
        self.tabs.addTab(self.positions_table, "实时持仓")
        self.tabs.addTab(self.trades_table, "交易流水")
        self.tabs.addTab(self.risk_table, "风险中心")
        self.tabs.currentChanged.connect(self._toggle_context_panels)
        root.addWidget(self.tabs, 1)

        self.setCentralWidget(central)
        status = QStatusBar()
        self.setStatusBar(status)
        self.statusBar().showMessage("系统已就绪")

    def _toggle_context_panels(self, index: int) -> None:
        title = self.tabs.tabText(index)
        is_cockpit = title == "驾驶舱"
        analysis_pages = {"候选股票", "AI 监督", "每日复盘", "任务与资料"}
        hide_metrics = is_cockpit or title in analysis_pages or title == "实时持仓"
        for card in self.metric_cards:
            card.setVisible(not hide_metrics)
        self.trade_frame.setVisible(not is_cockpit and title not in analysis_pages)

    def _update_theme_button(self) -> None:
        self.theme_button.setText("☀ 浅色" if self.dark_mode else "◐ 深色")

    def _toggle_theme(self) -> None:
        self.dark_mode = not self.dark_mode
        self.settings.setValue("dark_mode", self.dark_mode)
        self._update_theme_button()
        self._apply_style()

    @staticmethod
    def _table(headers: list[str]) -> QTableWidget:
        table = QTableWidget(0, len(headers))
        table.setHorizontalHeaderLabels(headers)
        table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        table.verticalHeader().setVisible(False)
        table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        table.setAlternatingRowColors(True)
        return table

    def _enqueue_trade(self) -> None:
        command = self.command_input.text().strip()
        sector = self.sector_input.text().strip() or None
        try:
            self.engine.parse_trade(command, sector or "未分类")
        except InvalidTradeError as exc:
            QMessageBox.warning(self, "交易指令无效", str(exc))
            return
        self.pending_commands.append((command, sector))
        self.command_input.clear()
        self.sector_input.clear()
        self.queue_label.setText(
            f"待同步 {len(self.pending_commands)} 笔；将在下一个 5 秒周期处理"
        )
        self.statusBar().showMessage(f"交易已入队：{command}", 4000)

    def _synchronize_pending(self) -> None:
        if not self.pending_commands:
            self.queue_label.setText("同步正常 · 当前队列为空")
            return
        pending, self.pending_commands = self.pending_commands, []
        success = 0
        messages: list[str] = []
        for command, sector in pending:
            try:
                result = self.engine.sync_trade(command, sector=sector)
                success += 1
                messages.extend(item["message"] for item in result["violations"])
            except (InvalidTradeError, ValueError) as exc:
                messages.append(str(exc))
        self.refresh()
        self.queue_label.setText(
            f"本周期同步 {success}/{len(pending)} 笔"
            + (f" · 告警：{'；'.join(messages)}" if messages else " · 风控正常")
        )
        self.statusBar().showMessage("交易同步完成", 4000)

    def _save_capital(self) -> None:
        try:
            self.engine.update_current_capital(str(self.capital_input.value()))
            self.refresh()
            self.statusBar().showMessage("账户净值已更新", 4000)
        except ValueError as exc:
            QMessageBox.warning(self, "无法保存", str(exc))

    def refresh(self) -> None:
        account = self.engine.load_account()
        snapshot = self.engine.calculate_positions()
        violations = self.engine.check_risk_limits()
        self.capital_input.blockSignals(True)
        self.capital_input.setValue(float(account.current_capital))
        self.capital_input.blockSignals(False)
        self.capital_card.set_value(_wan(account.current_capital))
        pnl_color = "#dc2626" if account.total_pnl >= 0 else "#16a34a"
        self.pnl_card.set_value(_wan(account.total_pnl), pnl_color)
        position_safe = snapshot["total_position_ratio"] <= Decimal("0.60")
        self.position_card.set_value(
            _percent(snapshot["total_position_ratio"]),
            "#7c3aed" if position_safe else "#dc2626",
        )
        cash_safe = snapshot["cash_ratio"] >= Decimal("0.40")
        self.cash_card.set_value(
            _wan(snapshot["cash"]), "#0891b2" if cash_safe else "#dc2626"
        )
        self._render_positions(snapshot["positions"])
        self._render_trades(self.engine.list_trades())
        self._render_risks(violations)

    def _render_positions(self, positions: list[dict]) -> None:
        self.positions_table.setRowCount(len(positions))
        for row, item in enumerate(positions):
            values = [
                item["stock_code"],
                item["sector"],
                f"{item['quantity']:,}",
                f"{item['avg_cost']:,.2f}",
                f"{item['last_price']:,.2f}",
                _wan(item["market_value"]),
                _percent(item["position_ratio"]),
            ]
            pnl_up = item["last_price"] >= item["avg_cost"]
            for column, value in enumerate(values):
                cell = QTableWidgetItem(value)
                if column in {4, 5}:
                    cell.setForeground(
                        QColor("#ef4444" if pnl_up else "#22c55e")
                    )
                self.positions_table.setItem(row, column, cell)

    def _render_trades(self, trades: list[dict]) -> None:
        self.trades_table.setRowCount(len(trades))
        for row, item in enumerate(trades):
            side = "买入" if item["side"] == "buy" else "卖出"
            values = [
                str(item["trade_time"]),
                side,
                item["stock_code"],
                item["sector"],
                f"{item['price']:,.2f}",
                f"{item['quantity']:,}",
                _wan(item["amount"]),
            ]
            for column, value in enumerate(values):
                cell = QTableWidgetItem(value)
                if column == 1:
                    cell.setForeground(
                        QColor("#dc2626" if side == "买入" else "#059669")
                    )
                self.trades_table.setItem(row, column, cell)

    def _render_risks(self, violations: list[dict]) -> None:
        if not violations:
            self.risk_table.setRowCount(1)
            values = ["正常", "全部", "-", "-", "-", "所有仓位指标均在红线内"]
            for column, value in enumerate(values):
                cell = QTableWidgetItem(value)
                cell.setForeground(QColor("#059669"))
                self.risk_table.setItem(0, column, cell)
            return

        rule_names = {
            "single_stock": "单票仓位 ≤ 25%",
            "sector": "板块仓位 ≤ 30%",
            "total_position": "总仓位 ≤ 60%",
            "cash_floor": "现金 ≥ 40%",
        }
        self.risk_table.setRowCount(len(violations))
        for row, item in enumerate(violations):
            target = item.get("stock_code") or item.get("sector") or "账户"
            values = [
                "超限",
                rule_names[item["rule"]],
                target,
                _wan(item["actual"]),
                _wan(item["limit"]),
                item["message"],
            ]
            for column, value in enumerate(values):
                cell = QTableWidgetItem(value)
                cell.setForeground(QColor("#dc2626"))
                self.risk_table.setItem(row, column, cell)

    def closeEvent(self, event) -> None:  # noqa: N802 - Qt API name
        self.sync_timer.stop()
        self.engine.close()
        event.accept()

    def _apply_style(self) -> None:
        light_style = """
            QMainWindow, QWidget {
                background: #f3f6fb;
                color: #14213d;
                font-family: "Microsoft YaHei UI", "Segoe UI";
            }
            QLabel#pageTitle {
                font-size: 27px;
                font-weight: 700;
                color: #14213d;
            }
            QLabel#subtitle, QLabel#hint, QLabel#metricTitle {
                color: #718096;
            }
            QLabel#sectionTitle { font-size: 17px; font-weight: 600; }
            QFrame#metricCard, QFrame#panel {
                background: white;
                border: 1px solid #e4eaf3;
                border-radius: 12px;
            }
            QFrame#dashboardHero {
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:0,
                    stop:0 #14213d, stop:0.55 #1e3a8a, stop:1 #2563eb
                );
                border: 0;
                border-radius: 16px;
            }
            QLabel#heroTitle {
                background: transparent;
                color: white;
                font-size: 27px;
                font-weight: 800;
            }
            QLabel#heroSubtitle, QLabel#heroTime {
                background: transparent;
                color: #dbeafe;
                font-size: 13px;
            }
            QFrame#cockpitCard, QFrame#cockpitKpi, QFrame#holdingCard,
            QFrame#candidateSlot {
                background: white;
                border: 1px solid #e3e9f2;
                border-radius: 14px;
            }
            QFrame#cockpitCard QLabel, QFrame#cockpitKpi QLabel,
            QFrame#holdingCard QLabel, QFrame#candidateSlot QLabel {
                background: transparent;
                border: 0;
            }
            QLabel#holdingName {
                font-size: 16px;
                font-weight: 750;
                color: #14213d;
            }
            QLabel#holdingSector {
                color: #2563eb;
                background: #dbeafe;
                border-radius: 10px;
                padding: 3px 8px;
            }
            QLabel#holdingMetricTitle {
                color: #8491a5;
                font-size: 11px;
            }
            QLabel#holdingMetricValue {
                color: #334155;
                font-size: 14px;
                font-weight: 650;
            }
            QLabel#candidateRank {
                color: #0891b2;
                font-size: 22px;
                font-weight: 800;
            }
            QLabel#candidateSlotName {
                color: #14213d;
                font-size: 17px;
                font-weight: 750;
            }
            QLabel#candidateSlotMeta, QLabel#candidateSlotReason {
                color: #718096;
                background: transparent;
            }
            QLabel#cockpitTitle {
                background: transparent;
                font-size: 17px;
                font-weight: 700;
                color: #1e293b;
            }
            QLabel#cockpitHint, QLabel#kpiTitle {
                background: transparent;
                color: #7b879d;
                font-size: 12px;
            }
            QLabel#cockpitBigText {
                background: transparent;
                font-size: 20px;
                font-weight: 750;
                color: #1e3a8a;
            }
            QLabel#kpiValue {
                background: transparent;
                font-size: 22px;
                font-weight: 750;
            }
            QScrollArea#cockpitScroll, QWidget#cockpitPage {
                border: 0;
                background: #f3f6fb;
            }
            QLineEdit, QDoubleSpinBox, QSpinBox, QComboBox,
            QDateEdit, QTimeEdit, QTextEdit {
                background: white;
                border: 1px solid #d1d9e6;
                border-radius: 8px;
                min-height: 37px;
                padding: 0 10px;
            }
            QLineEdit:focus, QDoubleSpinBox:focus, QSpinBox:focus,
            QComboBox:focus, QDateEdit:focus, QTimeEdit:focus,
            QTextEdit:focus { border-color: #2563eb; }
            QPushButton {
                background: #2563eb;
                color: white;
                border: 0;
                border-radius: 8px;
                min-height: 39px;
                padding: 0 18px;
                font-weight: 600;
            }
            QPushButton:hover { background: #1d4ed8; }
            QPushButton#secondaryButton, QPushButton#themeButton {
                background: #e8efff;
                color: #1d4ed8;
            }
            QTabWidget::pane {
                background: white;
                border: 1px solid #e3e9f2;
                border-radius: 12px;
                top: -1px;
            }
            QTabBar::tab {
                background: #e8edf5;
                color: #64748b;
                padding: 11px 19px;
                margin-right: 4px;
                border-top-left-radius: 9px;
                border-top-right-radius: 9px;
                font-weight: 600;
            }
            QTabBar::tab:selected {
                background: white;
                color: #1d4ed8;
                font-weight: 700;
            }
            QTabBar::tab:hover { color: #2563eb; background: #f8fafc; }
            QTableWidget {
                background: white;
                alternate-background-color: #f8fafc;
                border: 0;
                gridline-color: #edf0f5;
            }
            QHeaderView::section {
                background: #f2f5fa;
                border: 0;
                border-bottom: 1px solid #e2e8f0;
                padding: 9px;
                font-weight: 600;
                color: #475569;
            }
            QProgressBar {
                min-height: 24px;
                border: 0;
                border-radius: 7px;
                background: #e8edf5;
                color: #334155;
                text-align: center;
                font-weight: 600;
            }
            QProgressBar::chunk {
                border-radius: 7px;
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:0,
                    stop:0 #2563eb, stop:1 #38bdf8
                );
            }
            QStatusBar { background: white; border-top: 1px solid #e5eaf2; }
            """
        dark_style = """
            QMainWindow, QWidget {
                background: #050b14;
                color: #d9e7f5;
            }
            QLabel#pageTitle { color: #e8f4ff; }
            QLabel#subtitle, QLabel#hint, QLabel#metricTitle {
                color: #7190aa;
            }
            QFrame#metricCard, QFrame#panel {
                background: #0a1626;
                border: 1px solid #17324d;
            }
            QFrame#dashboardHero {
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:0,
                    stop:0 #071426, stop:0.42 #0a2850,
                    stop:0.78 #064e78, stop:1 #0891b2
                );
                border: 1px solid #0e7490;
            }
            QFrame#cockpitCard, QFrame#cockpitKpi, QFrame#holdingCard,
            QFrame#candidateSlot {
                background: #091827;
                border: 1px solid #173853;
            }
            QFrame#holdingCard {
                border-left: 3px solid #06b6d4;
            }
            QFrame#candidateSlot {
                border-top: 3px solid #0891b2;
            }
            QLabel#cockpitTitle { color: #dff6ff; }
            QLabel#cockpitHint, QLabel#kpiTitle { color: #6f91aa; }
            QLabel#cockpitBigText { color: #38bdf8; }
            QLabel#holdingName { color: #e0f2fe; }
            QLabel#holdingSector {
                color: #67e8f9;
                background: #083344;
            }
            QLabel#holdingMetricTitle { color: #66859d; }
            QLabel#holdingMetricValue { color: #c9dceb; }
            QLabel#candidateRank { color: #22d3ee; }
            QLabel#candidateSlotName { color: #e0f2fe; }
            QLabel#candidateSlotMeta, QLabel#candidateSlotReason {
                color: #7190aa;
            }
            QScrollArea#cockpitScroll, QWidget#cockpitPage {
                background: #050b14;
            }
            QLineEdit, QDoubleSpinBox, QSpinBox, QComboBox,
            QDateEdit, QTimeEdit, QTextEdit {
                background: #081522;
                color: #dbeafe;
                border: 1px solid #1d405c;
                selection-background-color: #0e7490;
            }
            QLineEdit:focus, QDoubleSpinBox:focus, QSpinBox:focus,
            QComboBox:focus, QDateEdit:focus, QTimeEdit:focus,
            QTextEdit:focus { border: 1px solid #22d3ee; }
            QPushButton {
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:0,
                    stop:0 #0369a1, stop:1 #0891b2
                );
                color: #ecfeff;
                border: 1px solid #0e7490;
            }
            QPushButton:hover {
                background: #0e7490;
                border-color: #22d3ee;
            }
            QPushButton#secondaryButton, QPushButton#themeButton {
                background: #0b2235;
                color: #67e8f9;
                border: 1px solid #155e75;
            }
            QTabWidget::pane {
                background: #07111f;
                border: 1px solid #153650;
            }
            QTabBar::tab {
                background: #0a1726;
                color: #6e8ca5;
                border: 1px solid #102a40;
            }
            QTabBar::tab:selected {
                background: #0b2235;
                color: #67e8f9;
                border-bottom-color: #22d3ee;
            }
            QTabBar::tab:hover {
                color: #a5f3fc;
                background: #0d293d;
            }
            QTableWidget {
                background: #07111f;
                alternate-background-color: #0a1827;
                color: #c9dceb;
                gridline-color: #132d43;
                selection-background-color: #0e4f6c;
            }
            QHeaderView::section {
                background: #0d2132;
                color: #7dd3fc;
                border-bottom: 1px solid #155e75;
            }
            QProgressBar {
                background: #0c2233;
                color: #dff6ff;
            }
            QProgressBar::chunk {
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:0,
                    stop:0 #0891b2, stop:1 #22d3ee
                );
            }
            QGroupBox {
                background: #081522;
                border: 1px solid #173853;
                border-radius: 10px;
                margin-top: 12px;
                padding-top: 12px;
                font-weight: 700;
                color: #bae6fd;
            }
            QStatusBar {
                background: #06101c;
                color: #7dd3fc;
                border-top: 1px solid #153650;
            }
            QScrollBar:vertical {
                background: #07111f;
                width: 10px;
                margin: 0;
            }
            QScrollBar::handle:vertical {
                background: #155e75;
                border-radius: 5px;
                min-height: 28px;
            }
        """
        self.setStyleSheet(light_style + (dark_style if self.dark_mode else ""))


def create_window(db_path: str | Path | None = None) -> MainWindow:
    """Factory used by the launcher and UI smoke tests."""
    return MainWindow(db_path)


__all__ = [
    "MainWindow",
    "create_window",
    "default_database_path",
    "QApplication",
]
