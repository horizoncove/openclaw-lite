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
        root.setContentsMargins(20, 14, 20, 12)
        root.setSpacing(10)

        heading = QHBoxLayout()
        titles = QVBoxLayout()
        title = QLabel("Sharon")
        title.setObjectName("pageTitle")
        subtitle = QLabel("交易控制台 · 纪律执行台 · 本地 SQLite")
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
        self.capital_card = MetricCard("当前总额", "#c9a66b")
        self.pnl_card = MetricCard("累计盈亏", "#e25555")
        self.position_card = MetricCard("总仓位", "#9aa3ad")
        self.cash_card = MetricCard("可用现金", "#3fad7a")
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
        trade_layout = QHBoxLayout(trade_frame)
        trade_layout.setContentsMargins(14, 10, 14, 10)
        trade_layout.setSpacing(10)
        trade_title = QLabel("同步")
        trade_title.setObjectName("sectionTitle")
        self.command_input = QLineEdit()
        self.command_input.setPlaceholderText("买入 002371 350.00 3600")
        self.command_input.returnPressed.connect(self._enqueue_trade)
        self.sector_input = QLineEdit()
        self.sector_input.setPlaceholderText("板块")
        self.sector_input.setMaximumWidth(140)
        enqueue_button = QPushButton("入队")
        enqueue_button.setMaximumWidth(88)
        enqueue_button.clicked.connect(self._enqueue_trade)
        trade_layout.addWidget(trade_title)
        trade_layout.addWidget(self.command_input, 1)
        trade_layout.addWidget(self.sector_input)
        trade_layout.addWidget(enqueue_button)
        self.queue_label = QLabel("5 秒同步")
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
        # Keep the shell quiet: metrics only on ledger pages, sync only when executing.
        metric_pages = {"交易流水", "风险中心"}
        trade_pages = {"交易流水", "交易计划"}
        for card in self.metric_cards:
            card.setVisible(title in metric_pages)
        self.trade_frame.setVisible(title in trade_pages)
        # Cockpit owns its own summary; never duplicate shell chrome there.
        if is_cockpit:
            for card in self.metric_cards:
                card.setVisible(False)
            self.trade_frame.setVisible(False)

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
        pnl_color = "#e25555" if account.total_pnl >= 0 else "#3fad7a"
        self.pnl_card.set_value(_wan(account.total_pnl), pnl_color)
        position_safe = snapshot["total_position_ratio"] <= Decimal("0.60")
        self.position_card.set_value(
            _percent(snapshot["total_position_ratio"]),
            "#9aa3ad" if position_safe else "#e25555",
        )
        cash_safe = snapshot["cash_ratio"] >= Decimal("0.40")
        self.cash_card.set_value(
            _wan(snapshot["cash"]), "#3fad7a" if cash_safe else "#e25555"
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
                        QColor("#e25555" if pnl_up else "#3fad7a")
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
                        QColor("#e25555" if side == "买入" else "#3fad7a")
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
        fonts = '"Public Sans", "WenQuanYi Micro Hei", "Microsoft YaHei UI"'
        mono = '"JetBrains Mono", "WenQuanYi Micro Hei Mono", monospace'
        light_style = f"""
            QMainWindow, QWidget {{
                background: #eef1f4;
                color: #1a1f26;
                font-family: {fonts};
                font-size: 13px;
            }}
            QLabel#pageTitle {{
                font-family: {fonts};
                font-size: 30px;
                font-weight: 750;
                letter-spacing: 0.5px;
                color: #1a1f26;
            }}
            QLabel#subtitle, QLabel#hint, QLabel#metricTitle {{
                color: #6b7380;
            }}
            QLabel#sectionTitle {{
                font-size: 15px;
                font-weight: 650;
                color: #2a313c;
            }}
            QFrame#metricCard, QFrame#panel, QFrame#pageHeader,
            QFrame#metricStrip {{
                background: #ffffff;
                border: 1px solid #d7dde5;
                border-radius: 8px;
            }}
            QFrame#pageHeader {{
                background: transparent;
                border: 0;
            }}
            QLabel#pageHeaderTitle {{
                background: transparent;
                color: #1a1f26;
                font-size: 22px;
                font-weight: 750;
            }}
            QLabel#pageHeaderSubtitle {{
                background: transparent;
                color: #6b7380;
                font-size: 12px;
            }}
            QFrame#dashboardHero {{
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:1,
                    stop:0 #1a1f26, stop:0.6 #2c2418, stop:1 #4a3b22
                );
                border: 0;
                border-radius: 10px;
            }}
            QLabel#heroTitle {{
                background: transparent;
                color: #f4efe6;
                font-size: 28px;
                font-weight: 800;
            }}
            QLabel#heroSubtitle, QLabel#heroTime {{
                background: transparent;
                color: #d6c7a8;
                font-size: 13px;
            }}
            QFrame#cockpitCard, QFrame#cockpitKpi, QFrame#holdingCard,
            QFrame#candidateSlot {{
                background: #ffffff;
                border: 1px solid #d7dde5;
                border-radius: 8px;
            }}
            QFrame#holdingCard {{
                border-left: 3px solid #c9a66b;
            }}
            QFrame#candidateSlot {{
                border-top: 3px solid #c9a66b;
            }}
            QFrame#candidateSlot[occupied="false"] {{
                border-top: 3px solid #c5ccd6;
                background: #f7f8fa;
            }}
            QFrame#cockpitCard QLabel, QFrame#cockpitKpi QLabel,
            QFrame#holdingCard QLabel, QFrame#candidateSlot QLabel,
            QFrame#metricStrip QLabel, QFrame#pageHeader QLabel {{
                background: transparent;
                border: 0;
            }}
            QFrame#metricDivider {{
                background: #d7dde5;
                border: 0;
                max-width: 1px;
            }}
            QLabel#holdingName {{
                font-size: 16px;
                font-weight: 750;
                color: #1a1f26;
            }}
            QLabel#holdingSector {{
                color: #6b5216;
                background: #f0e6d2;
                border-radius: 4px;
                padding: 2px 8px;
            }}
            QLabel#holdingMetricTitle {{
                color: #8a929c;
                font-size: 11px;
            }}
            QLabel#holdingMetricValue {{
                color: #2a313c;
                font-family: {mono};
                font-size: 13px;
                font-weight: 650;
            }}
            QLabel#candidateRank {{
                color: #8b6914;
                font-family: {mono};
                font-size: 22px;
                font-weight: 800;
            }}
            QLabel#candidateSlotName {{
                color: #1a1f26;
                font-size: 17px;
                font-weight: 750;
            }}
            QLabel#candidateSlotMeta, QLabel#candidateSlotReason {{
                color: #6b7380;
            }}
            QLabel#cockpitTitle {{
                font-size: 15px;
                font-weight: 700;
                color: #1a1f26;
            }}
            QLabel#cockpitHint, QLabel#kpiTitle {{
                color: #7a8491;
                font-size: 11px;
                letter-spacing: 0.3px;
            }}
            QLabel#cockpitBigText, QLabel#stripValue {{
                font-family: {mono};
                font-size: 20px;
                font-weight: 700;
                color: #6b5216;
            }}
            QLabel#kpiValue {{
                font-family: {mono};
                font-size: 21px;
                font-weight: 700;
            }}
            QScrollArea#cockpitScroll, QWidget#cockpitPage, QWidget#visualPage {{
                border: 0;
                background: #eef1f4;
            }}
            QLineEdit, QDoubleSpinBox, QSpinBox, QComboBox,
            QDateEdit, QTimeEdit, QTextEdit {{
                background: white;
                border: 1px solid #cfd5de;
                border-radius: 6px;
                min-height: 36px;
                padding: 0 10px;
            }}
            QLineEdit:focus, QDoubleSpinBox:focus, QSpinBox:focus,
            QComboBox:focus, QDateEdit:focus, QTimeEdit:focus,
            QTextEdit:focus {{ border-color: #c9a66b; }}
            QPushButton {{
                background: #1a1f26;
                color: #f4efe6;
                border: 0;
                border-radius: 6px;
                min-height: 38px;
                padding: 0 16px;
                font-weight: 650;
            }}
            QPushButton:hover {{ background: #2c2418; }}
            QPushButton#secondaryButton, QPushButton#themeButton {{
                background: #f0e6d2;
                color: #6b5216;
            }}
            QTabWidget::pane {{
                background: #ffffff;
                border: 1px solid #d7dde5;
                border-radius: 8px;
                top: -1px;
            }}
            QTabBar::tab {{
                background: transparent;
                color: #6b7380;
                padding: 10px 16px;
                margin-right: 2px;
                border-bottom: 2px solid transparent;
                font-weight: 600;
            }}
            QTabBar::tab:selected {{
                color: #6b5216;
                border-bottom: 2px solid #c9a66b;
                font-weight: 750;
            }}
            QTabBar::tab:hover {{ color: #1a1f26; }}
            QTableWidget {{
                background: transparent;
                alternate-background-color: #f7f8fa;
                border: 0;
                gridline-color: #e6eaef;
                font-family: {mono};
                font-size: 12px;
            }}
            QHeaderView::section {{
                background: transparent;
                border: 0;
                border-bottom: 1px solid #d7dde5;
                padding: 8px;
                font-family: {fonts};
                font-weight: 650;
                color: #6b7380;
            }}
            QProgressBar {{
                min-height: 18px;
                border: 0;
                border-radius: 3px;
                background: #e6eaef;
                color: #2a313c;
                text-align: center;
                font-family: {mono};
                font-size: 11px;
                font-weight: 600;
            }}
            QProgressBar::chunk {{
                border-radius: 3px;
                background: #c9a66b;
            }}
            QGroupBox {{
                background: #ffffff;
                border: 1px solid #d7dde5;
                border-radius: 8px;
                margin-top: 12px;
                padding-top: 12px;
                font-weight: 700;
                color: #1a1f26;
            }}
            QStatusBar {{ background: #ffffff; border-top: 1px solid #d7dde5; }}
            """
        dark_style = f"""
            QMainWindow, QWidget {{
                background: #12151a;
                color: #ece8e1;
                font-family: {fonts};
            }}
            QLabel#pageTitle {{ color: #f4efe6; }}
            QLabel#subtitle, QLabel#hint, QLabel#metricTitle {{
                color: #9aa3ad;
            }}
            QFrame#metricCard, QFrame#panel, QFrame#pageHeader,
            QFrame#metricStrip {{
                background: #1b2028;
                border: 1px solid #323b48;
            }}
            QFrame#pageHeader {{
                background: transparent;
                border: 0;
            }}
            QLabel#pageHeaderTitle {{ color: #f4efe6; font-size: 22px; }}
            QLabel#pageHeaderSubtitle {{ color: #9aa3ad; }}
            QFrame#dashboardHero {{
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:1,
                    stop:0 #171b22, stop:0.5 #242018, stop:1 #3d3220
                );
                border: 1px solid #3d3220;
            }}
            QFrame#cockpitCard, QFrame#cockpitKpi, QFrame#holdingCard,
            QFrame#candidateSlot {{
                background: #1b2028;
                border: 1px solid #323b48;
            }}
            QFrame#holdingCard {{
                border-left: 3px solid #c9a66b;
            }}
            QFrame#candidateSlot {{
                border-top: 3px solid #c9a66b;
            }}
            QFrame#candidateSlot[occupied="false"] {{
                border-top: 3px solid #3a4350;
                background: #161b22;
            }}
            QFrame#metricDivider {{
                background: #323b48;
            }}
            QLabel#cockpitTitle {{ color: #f4efe6; }}
            QLabel#cockpitHint, QLabel#kpiTitle {{ color: #9aa3ad; }}
            QLabel#cockpitBigText, QLabel#stripValue {{ color: #e6d3a8; }}
            QLabel#holdingName {{ color: #ece8e1; }}
            QLabel#holdingSector {{
                color: #e6d3a8;
                background: #2a2418;
            }}
            QLabel#holdingMetricTitle {{ color: #8b949e; }}
            QLabel#holdingMetricValue {{ color: #d8d2c8; }}
            QLabel#candidateRank {{ color: #c9a66b; }}
            QLabel#candidateSlotName {{ color: #ece8e1; }}
            QLabel#candidateSlotMeta, QLabel#candidateSlotReason {{
                color: #9aa3ad;
            }}
            QScrollArea#cockpitScroll, QWidget#cockpitPage, QWidget#visualPage {{
                background: #12151a;
            }}
            QLineEdit, QDoubleSpinBox, QSpinBox, QComboBox,
            QDateEdit, QTimeEdit, QTextEdit {{
                background: #161b22;
                color: #ece8e1;
                border: 1px solid #3a4350;
                selection-background-color: #3d3220;
            }}
            QLineEdit:focus, QDoubleSpinBox:focus, QSpinBox:focus,
            QComboBox:focus, QDateEdit:focus, QTimeEdit:focus,
            QTextEdit:focus {{ border: 1px solid #c9a66b; }}
            QPushButton {{
                background: #c9a66b;
                color: #1a1f26;
                border: 0;
            }}
            QPushButton:hover {{
                background: #e6d3a8;
            }}
            QPushButton#secondaryButton, QPushButton#themeButton {{
                background: #242a33;
                color: #e6d3a8;
                border: 1px solid #3d3220;
            }}
            QTabWidget::pane {{
                background: #171b22;
                border: 1px solid #323b48;
            }}
            QTabBar::tab {{
                background: transparent;
                color: #8b949e;
                border: 0;
                border-bottom: 2px solid transparent;
            }}
            QTabBar::tab:selected {{
                background: transparent;
                color: #e6d3a8;
                border-bottom: 2px solid #c9a66b;
            }}
            QTabBar::tab:hover {{
                color: #ece8e1;
            }}
            QTableWidget {{
                background: transparent;
                alternate-background-color: #1b2028;
                color: #d8d2c8;
                gridline-color: #2a313c;
                selection-background-color: #2a2418;
                font-family: {mono};
            }}
            QHeaderView::section {{
                background: transparent;
                color: #9aa3ad;
                border-bottom: 1px solid #323b48;
                font-family: {fonts};
            }}
            QProgressBar {{
                background: #242a33;
                color: #ece8e1;
            }}
            QProgressBar::chunk {{
                background: #c9a66b;
            }}
            QGroupBox {{
                background: #1b2028;
                border: 1px solid #323b48;
                border-radius: 8px;
                margin-top: 12px;
                padding-top: 12px;
                font-weight: 700;
                color: #e6d3a8;
            }}
            QStatusBar {{
                background: #161b22;
                color: #9aa3ad;
                border-top: 1px solid #323b48;
            }}
            QScrollBar:vertical {{
                background: #12151a;
                width: 8px;
                margin: 0;
            }}
            QScrollBar::handle:vertical {{
                background: #3a4350;
                border-radius: 4px;
                min-height: 28px;
            }}
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
