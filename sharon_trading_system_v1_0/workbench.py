"""覆盖 PDF 工作流的完整 Sharon 桌面工作台。"""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path

from PyQt6.QtCore import QDate, QDateTime, Qt, QTimer
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
    QHeaderView,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QProgressBar,
    QScrollArea,
    QSizePolicy,
    QTableWidget,
    QTableWidgetItem,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from .account_engine import InvalidTradeError
from .cockpit import (
    CandidateSlotCard,
    CockpitCard,
    DonutChart,
    HoldingCard,
    MetricStrip,
    PageHeader,
    RadarChart,
    RingGauge,
    ScoreGauge,
    StatusBadge,
)
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
        self._upgrade_positions_tab()
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

    def _upgrade_positions_tab(self) -> None:
        index = self.tabs.indexOf(self.positions_table)
        self.tabs.removeTab(index)
        page = QWidget()
        page.setObjectName("visualPage")
        layout = QVBoxLayout(page)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(12)

        layout.addWidget(
            PageHeader("实时持仓", "账户仓位真相 · 红涨绿跌 · 单票红线 25%")
        )
        self.position_strip = MetricStrip(
            [
                ("count", "持仓股票"),
                ("market", "持仓总市值"),
                ("pnl", "浮动盈亏"),
                ("concentration", "最大单票仓位"),
            ]
        )
        layout.addWidget(self.position_strip)

        holdings = CockpitCard("持仓卡片", "优先阅读单票盈亏与仓位压力")
        self.positions_holding_row = QHBoxLayout()
        self.positions_holding_row.setSpacing(10)
        holdings.body.addLayout(self.positions_holding_row)
        layout.addWidget(holdings, 1)

        body = QHBoxLayout()
        body.setSpacing(12)
        # Keep the table available for export/selection workflows, but compact.
        detail = CockpitCard("持仓明细表", "成本 / 现价 / 市值 / 仓位")
        self.positions_table.setMinimumHeight(110)
        self.positions_table.setMaximumHeight(150)
        self.positions_table.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Maximum
        )
        detail.body.addWidget(self.positions_table)
        self.positions_table.show()
        body.addWidget(detail, 5)

        side = QVBoxLayout()
        side.setSpacing(12)
        allocation = CockpitCard("资产分布", "按市值占比")
        self.position_donut = DonutChart("持仓总市值")
        self.position_donut.setMinimumHeight(150)
        self.position_donut.setMaximumHeight(170)
        self.position_donut.set_dark_mode(self.dark_mode)
        self.position_legend = QVBoxLayout()
        self.position_legend.setSpacing(4)
        allocation.body.addWidget(self.position_donut, 1)
        allocation.body.addLayout(self.position_legend)
        side.addWidget(allocation, 1)

        concentration = CockpitCard("仓位热度", "上限 = 单票 25% 红线")
        self.position_bars = QVBoxLayout()
        self.position_bars.setSpacing(8)
        concentration.body.addLayout(self.position_bars)
        concentration.body.addStretch(1)
        side.addWidget(concentration, 1)
        body.addLayout(side, 3)

        layout.addLayout(body, 1)
        self.position_viz_kpis = self.position_strip.values
        self.positions_visual_page = page
        self.tabs.insertTab(index, page, "实时持仓")

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
                ("equity", "账户净值", "#c9a66b"),
                ("pnl", "累计盈亏", "#e25555"),
                ("market", "持仓市值", "#9aa3ad"),
                ("cash", "可用现金", "#3fad7a"),
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
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        page = QWidget()
        page.setObjectName("visualPage")
        self.candidate_page = scroll
        layout = QVBoxLayout(page)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(12)
        layout.addWidget(
            PageHeader(
                "候选股票",
                "外部 AI 完成 SOP 选股 · 本页只登记最终 2–3 只并做买入准入",
            )
        )

        seats = QHBoxLayout()
        seats.setSpacing(12)
        self.candidate_slots = [CandidateSlotCard(rank) for rank in range(1, 4)]
        for slot in self.candidate_slots:
            seats.addWidget(slot, 1)
        layout.addLayout(seats)

        lower = QHBoxLayout()
        lower.setSpacing(12)
        editor = CockpitCard("登记入池", "代码 / 名称 / 板块 / 来源 / 评分 / 理由")
        editor.setMaximumWidth(380)
        editor.setSizePolicy(
            QSizePolicy.Policy.Preferred, QSizePolicy.Policy.Maximum
        )
        form = QFormLayout()
        form.setSpacing(8)
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
        self.candidate_reason.setMaximumHeight(64)
        self.candidate_reason.setPlaceholderText("粘贴外部 AI 入选摘要")
        save = QPushButton("加入 / 更新候选池")
        save.clicked.connect(self._save_candidate)
        form.addRow("股票代码", self.candidate_code)
        form.addRow("股票名称", self.candidate_name)
        form.addRow("所属板块", self.candidate_sector)
        form.addRow("选股来源", self.candidate_source)
        form.addRow("外部评分", self.candidate_score)
        form.addRow("入选理由", self.candidate_reason)
        form.addRow(save)
        editor.body.addLayout(form)
        lower.addWidget(editor, 2)

        pool = CockpitCard("候选池记录", "最多 3 只 · 选中后可归档替换")
        self.candidate_count_label = QLabel("当前 0 / 3")
        self.candidate_count_label.setObjectName("sectionTitle")
        pool.body.addWidget(self.candidate_count_label)
        self.candidate_table = self._table(
            ["入选时间", "代码", "名称", "板块", "来源 AI", "外部评分", "理由"]
        )
        self.candidate_table.setMinimumHeight(120)
        self.candidate_table.setMaximumHeight(160)
        self.candidate_table.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Maximum
        )
        header = self.candidate_table.horizontalHeader()
        for column in range(6):
            header.setSectionResizeMode(column, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(6, QHeaderView.ResizeMode.Stretch)
        pool.body.addWidget(self.candidate_table, 0)
        archive = QPushButton("移出选中候选")
        archive.setObjectName("secondaryButton")
        archive.setMaximumHeight(36)
        archive.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed
        )
        archive.clicked.connect(self._archive_candidate)
        pool.body.addWidget(archive)
        pool.body.addStretch(1)
        lower.addWidget(pool, 5)
        layout.addLayout(lower, 1)
        scroll.setWidget(page)
        self.tabs.addTab(scroll, "候选股票")

    def _build_intent_tab(self) -> None:
        page = QWidget()
        page.setObjectName("visualPage")
        self.intent_page = page
        layout = QVBoxLayout(page)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(12)
        layout.addWidget(
            PageHeader(
                "交易计划",
                "先测算仓位与纪律，再由 AI 警告区对本次计划做红黄灯警示",
            )
        )

        columns = QHBoxLayout()
        columns.setSpacing(12)

        planner = CockpitCard(
            "交易前纪律检查",
            "指令 · 板块 · 建仓阶段 · 黄灯继续说明",
        )
        form = QFormLayout()
        form.setSpacing(8)
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
        planner.body.addLayout(form)

        self.intent_light_badge = StatusBadge("等待测算", "slate")
        self.intent_light_badge.set_dark_mode(self.dark_mode)
        self.intent_light = self.intent_light_badge
        planner.body.addWidget(self.intent_light_badge)

        self.intent_projection = MetricStrip(
            [
                ("stock", "预计单票"),
                ("sector", "预计板块"),
                ("total", "预计总仓"),
                ("cash", "预计现金"),
            ]
        )
        planner.body.addWidget(self.intent_projection)

        self.intent_details = QTextEdit()
        self.intent_details.setReadOnly(True)
        self.intent_details.setPlaceholderText(
            "测算后显示纪律检查明细与预计仓位。"
        )
        self.intent_details.setMaximumHeight(160)
        planner.body.addWidget(self.intent_details)

        discipline = QLabel(
            "自动检查：外部 AI 候选池、单票/板块/总仓位/现金、禁买时段、"
            "浮盈 ≥10% 才加仓且仅一次。卖出始终允许用于止损止盈。"
        )
        discipline.setWordWrap(True)
        discipline.setObjectName("hint")
        planner.body.addWidget(discipline)
        planner.body.addStretch()
        columns.addWidget(planner, 5)

        warnings = CockpitCard(
            "AI 警告",
            "预检红黄灯 · 持仓纪律信号 · 近期监督事件",
        )
        self.intent_ai_summary = StatusBadge("尚未测算 · 暂无警示", "slate")
        self.intent_ai_summary.set_dark_mode(self.dark_mode)
        warnings.body.addWidget(self.intent_ai_summary)

        self.intent_ai_count = QLabel("0 条警示")
        self.intent_ai_count.setObjectName("sectionTitle")
        warnings.body.addWidget(self.intent_ai_count)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll.setMinimumHeight(280)
        host = QWidget()
        self.intent_ai_list = QVBoxLayout(host)
        self.intent_ai_list.setContentsMargins(0, 0, 4, 0)
        self.intent_ai_list.setSpacing(8)
        self.intent_ai_empty = QLabel(
            "填写交易指令并点击「测算并保存计划」后，"
            "AI 将汇总本笔计划的纪律风险与持仓警示。"
        )
        self.intent_ai_empty.setWordWrap(True)
        self.intent_ai_empty.setObjectName("hint")
        self.intent_ai_list.addWidget(self.intent_ai_empty)
        self.intent_ai_list.addStretch()
        scroll.setWidget(host)
        warnings.body.addWidget(scroll, 1)
        columns.addWidget(warnings, 4)

        layout.addLayout(columns, 1)
        self.tabs.addTab(page, "交易计划")
        self._render_intent_ai_warnings()

    def _build_supervision_tab(self) -> None:
        page = QWidget()
        page.setObjectName("visualPage")
        layout = QVBoxLayout(page)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(12)

        header = PageHeader("AI 监督", "L1 硬规则 · L2 软规则 · L3 心理纪律")
        layout.addWidget(header)

        summary = QHBoxLayout()
        self.grade_label = QLabel("月度评分 —")
        self.grade_label.setObjectName("cockpitBigText")
        self.penalty_label = QLabel("处罚状态：正常")
        refresh = QPushButton("刷新监督结果")
        refresh.setMaximumWidth(140)
        refresh.clicked.connect(self._refresh_supervision)
        summary.addWidget(self.grade_label)
        summary.addWidget(self.penalty_label)
        summary.addStretch()
        summary.addWidget(refresh)
        layout.addLayout(summary)

        visuals = QHBoxLayout()
        visuals.setSpacing(12)

        score_card = CockpitCard("月度纪律评分", "红灯 -20 · 黄灯 -5")
        self.supervision_score_gauge = ScoreGauge()
        self.supervision_score_gauge.setMinimumHeight(190)
        self.supervision_score_gauge.set_dark_mode(self.dark_mode)
        score_card.body.addWidget(self.supervision_score_gauge, 1)
        visuals.addWidget(score_card, 1)

        distribution = CockpitCard("事件结构", "红 / 黄 / 合规")
        self.supervision_donut = DonutChart("监督事件")
        self.supervision_donut.setMinimumHeight(170)
        self.supervision_donut.set_dark_mode(self.dark_mode)
        distribution.body.addWidget(self.supervision_donut, 1)
        self.supervision_distribution = QLabel("暂无监督事件")
        self.supervision_distribution.setAlignment(Qt.AlignmentFlag.AlignCenter)
        distribution.body.addWidget(self.supervision_distribution)
        visuals.addWidget(distribution, 1)

        layers = CockpitCard("三层雷达", "健康度越靠外越好")
        self.supervision_layers: dict[str, StatusBadge] = {}
        badge_row = QHBoxLayout()
        badge_row.setSpacing(8)
        for level in ("L1", "L2", "L3"):
            badge = StatusBadge(f"{level} 正常", "green")
            badge.set_dark_mode(self.dark_mode)
            self.supervision_layers[level] = badge
            badge_row.addWidget(badge, 1)
        layers.body.addLayout(badge_row)
        self.supervision_radar = RadarChart()
        self.supervision_radar.setMinimumHeight(210)
        self.supervision_radar.set_dark_mode(self.dark_mode)
        layers.body.addWidget(self.supervision_radar, 1)
        self.supervision_penalty_viz = QLabel("")
        self.supervision_penalty_viz.hide()
        visuals.addWidget(layers, 1)
        layout.addLayout(visuals, 1)

        timeline = CockpitCard("监督事件", "时间 · 层级 · 灯号 · 规则 · 说明")
        self.findings_table = self._table(
            ["时间", "层级", "灯号", "规则", "说明", "状态"]
        )
        self.findings_table.setMinimumHeight(130)
        self.findings_table.setMaximumHeight(210)
        self.findings_table.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Preferred
        )
        timeline.body.addWidget(self.findings_table, 1)
        layout.addWidget(timeline, 0)
        rules = QLabel(
            "L1：候选池准入、仓位、加仓、止损止盈、时间与处罚；"
            "L2：证据与数据一致性；L3：亏损日不报复、盈利日不贪。"
        )
        rules.setWordWrap(True)
        rules.setObjectName("hint")
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
        self.intent_light_badge.set_status(LIGHT_NAMES[result.light], result.light)
        self.intent_projection.set_value(
            "stock",
            f"{result.projected_stock_ratio:.1%}",
            "#e25555" if result.projected_stock_ratio > Decimal("0.25") else None,
        )
        self.intent_projection.set_value(
            "sector",
            f"{result.projected_sector_ratio:.1%}",
            "#e25555" if result.projected_sector_ratio > Decimal("0.30") else None,
        )
        self.intent_projection.set_value(
            "total",
            f"{result.projected_total_ratio:.1%}",
            "#e25555" if result.projected_total_ratio > Decimal("0.60") else None,
        )
        self.intent_projection.set_value(
            "cash",
            f"{result.projected_cash_ratio:.1%}",
            "#e25555" if result.projected_cash_ratio < Decimal("0.40") else None,
        )
        self.intent_details.setPlainText(
            "\n".join(f"• {reason}" for reason in result.reasons)
        )
        self._render_intent_ai_warnings(
            result=result,
            stock_code=trade.stock_code,
            override_reason=self.intent_override.text().strip(),
        )
        self._refresh_supervision()

    def _ai_warning_item(
        self, *, tone: str, source: str, title: str, message: str
    ) -> QFrame:
        card = QFrame()
        card.setObjectName("holdingCard")
        root = QVBoxLayout(card)
        root.setContentsMargins(12, 10, 12, 10)
        root.setSpacing(4)
        header = QHBoxLayout()
        badge = StatusBadge(source, tone)
        badge.set_dark_mode(self.dark_mode)
        badge.setMaximumWidth(110)
        heading = QLabel(title)
        heading.setObjectName("holdingName")
        heading.setWordWrap(True)
        header.addWidget(badge)
        header.addWidget(heading, 1)
        root.addLayout(header)
        body = QLabel(message)
        body.setWordWrap(True)
        body.setObjectName("hint")
        root.addWidget(body)
        return card

    def _render_intent_ai_warnings(
        self,
        *,
        result=None,
        stock_code: str | None = None,
        override_reason: str = "",
    ) -> None:
        while self.intent_ai_list.count():
            item = self.intent_ai_list.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

        warnings: list[tuple[str, str, str, str]] = []
        if result is not None:
            light_title = {
                "green": "预检通过",
                "yellow": "黄灯警示",
                "red": "红灯禁止",
            }[result.light]
            for reason in result.reasons:
                if reason == "所有自动纪律检查通过":
                    continue
                tone = result.light
                if "黄灯" in reason and result.light == "red":
                    tone = "yellow"
                    title = "黄灯警示"
                else:
                    title = light_title
                warnings.append((tone, "预检", title, reason))
            if result.light == "yellow" and not override_reason:
                warnings.append(
                    (
                        "yellow",
                        "流程",
                        "黄灯需说明",
                        "继续执行前必须填写黄灯说明，否则计划停留在待确认状态。",
                    )
                )
            if result.light == "red":
                warnings.append(
                    (
                        "red",
                        "流程",
                        "禁止落单",
                        "红灯计划已被阻断，需先修正指令、仓位或候选池后再测算。",
                    )
                )

        signals = self.system.position_discipline_signals(self.engine)
        for signal in signals:
            if stock_code and signal["stock_code"] != stock_code:
                # Keep ambient stop-loss alerts even when planning another ticker.
                if signal["severity"] != "red":
                    continue
            warnings.append(
                (
                    signal["severity"],
                    "持仓",
                    f"{signal['stock_code']} · {signal['rule']}",
                    signal["message"],
                )
            )

        # Ambient supervision alerts only before a fresh preflight, to avoid
        # duplicating the finding just written by save_trade_intent().
        if result is None:
            finding_added = 0
            for finding in self.system.list_findings(limit=12):
                if finding["severity"] not in {"red", "yellow"}:
                    continue
                warnings.append(
                    (
                        finding["severity"],
                        finding["level"],
                        finding["rule_code"],
                        finding["message"],
                    )
                )
                finding_added += 1
                if finding_added >= 3:
                    break

        if not warnings:
            empty = QLabel(
                "当前计划未触发 AI 警示。"
                if result is not None
                else "填写交易指令并点击「测算并保存计划」后，"
                "AI 将汇总本笔计划的纪律风险与持仓警示。"
            )
            empty.setWordWrap(True)
            empty.setObjectName("hint")
            self.intent_ai_list.addWidget(empty)
            self.intent_ai_summary.set_status(
                "测算通过 · 暂无警示" if result is not None else "尚未测算 · 暂无警示",
                "green" if result is not None else "slate",
            )
            self.intent_ai_count.setText("0 条警示")
            self.intent_ai_list.addStretch()
            return

        severity_rank = {"red": 2, "yellow": 1, "green": 0}
        top = max(warnings, key=lambda item: severity_rank.get(item[0], 0))
        red_count = sum(item[0] == "red" for item in warnings)
        yellow_count = sum(item[0] == "yellow" for item in warnings)
        summary_tone = top[0] if top[0] in {"red", "yellow"} else "slate"
        if red_count:
            summary = f"AI 警示 · {red_count} 红 / {yellow_count} 黄"
        elif yellow_count:
            summary = f"AI 警示 · {yellow_count} 条黄灯"
        else:
            summary = "AI 提示 · 请复核明细"
        self.intent_ai_summary.set_status(summary, summary_tone)
        self.intent_ai_count.setText(f"{len(warnings)} 条警示")
        for tone, source, title, message in warnings:
            self.intent_ai_list.addWidget(
                self._ai_warning_item(
                    tone=tone, source=source, title=title, message=message
                )
            )
        self.intent_ai_list.addStretch()

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
            self.position_donut.set_dark_mode(self.dark_mode)
            self.supervision_score_gauge.set_dark_mode(self.dark_mode)
            self.supervision_donut.set_dark_mode(self.dark_mode)
            self.supervision_radar.set_dark_mode(self.dark_mode)
            for badge in (
                self.cockpit_compliance,
                self.cockpit_sync,
                self.cockpit_candidate_badge,
                self.cockpit_risk_badge,
                self.intent_light_badge,
                self.intent_ai_summary,
                *self.supervision_layers.values(),
            ):
                badge.set_dark_mode(self.dark_mode)

    @staticmethod
    def _clear_layout(layout) -> None:
        while layout.count():
            item = layout.takeAt(0)
            widget = item.widget()
            child_layout = item.layout()
            if widget:
                widget.deleteLater()
            elif child_layout:
                WorkbenchWindow._clear_layout(child_layout)

    def _refresh_positions_visualization(self) -> None:
        snapshot = self.engine.calculate_positions()
        positions = snapshot["positions"]
        floating_pnl = sum(
            (item["last_price"] - item["avg_cost"]) * item["quantity"]
            for item in positions
        )
        concentration = max(
            (item["position_ratio"] for item in positions),
            default=Decimal(0),
        )
        self.position_strip.set_value("count", f"{len(positions)} 只")
        self.position_strip.set_value(
            "market", _wan(snapshot["total_market_value"])
        )
        self.position_strip.set_value(
            "pnl",
            f"{'+' if floating_pnl >= 0 else ''}{_wan(floating_pnl)}",
            "#e25555" if floating_pnl >= 0 else "#3fad7a",
        )
        self.position_strip.set_value(
            "concentration", f"{concentration:.2%}"
        )
        self.position_donut.set_data(
            [
                (item["stock_code"], float(item["market_value"]))
                for item in positions
            ],
            center_value=_wan(snapshot["total_market_value"]),
        )

        self._clear_layout(self.position_legend)
        for index, item in enumerate(positions):
            row = QHBoxLayout()
            dot = QLabel("●")
            dot.setStyleSheet(
                f"color:{DonutChart.COLORS[index % len(DonutChart.COLORS)]};"
                "font-size:14px; background:transparent;"
            )
            label = QLabel(
                f"{item['stock_code']}  {_wan(item['market_value'])}"
            )
            ratio = QLabel(f"{item['position_ratio']:.2%}")
            ratio.setObjectName("cockpitBigText")
            row.addWidget(dot)
            row.addWidget(label)
            row.addStretch()
            row.addWidget(ratio)
            self.position_legend.addLayout(row)
        if not positions:
            self.position_legend.addWidget(QLabel("暂无持仓分布"))

        self._clear_layout(self.position_bars)
        for item in positions:
            pnl_rate = (
                item["last_price"] / item["avg_cost"] - 1
                if item["avg_cost"]
                else Decimal(0)
            )
            header = QHBoxLayout()
            name = QLabel(f"{item['stock_code']} · {item['sector']}")
            pnl = QLabel(f"{pnl_rate:+.2%}")
            pnl.setStyleSheet(
                f"color:{'#e25555' if pnl_rate >= 0 else '#3fad7a'};"
                "font-weight:800; background:transparent;"
                "font-family:'JetBrains Mono';"
            )
            header.addWidget(name)
            header.addStretch()
            header.addWidget(pnl)
            bar = QProgressBar()
            bar.setRange(0, 250)
            bar.setValue(min(250, int(item["position_ratio"] * 1000)))
            bar.setFormat(
                f"仓位 {item['position_ratio']:.2%} / 25%"
            )
            self.position_bars.addLayout(header)
            self.position_bars.addWidget(bar)
        if not positions:
            self.position_bars.addWidget(QLabel("成交后显示单票仓位热度"))

        self._clear_layout(self.positions_holding_row)
        if not positions:
            empty = QLabel("当前空仓 · 同步成交后展示持仓卡片")
            empty.setObjectName("cockpitHint")
            self.positions_holding_row.addWidget(empty)
        else:
            names: dict[str, str] = {}
            for candidate in self.system.list_candidates(include_archived=True):
                names.setdefault(
                    candidate["stock_code"], candidate["stock_name"]
                )
            for item in positions:
                card = HoldingCard()
                card.set_data(item, names.get(item["stock_code"], ""))
                self.positions_holding_row.addWidget(card, 1)

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
            f"color:{'#e25555' if account.total_pnl >= 0 else '#3fad7a'};"
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
        self._refresh_positions_visualization()
        self._refresh_cockpit()
        self._refresh_candidates()
        self._refresh_supervision()
        self._refresh_reviews()
        self._refresh_tasks()

    def _refresh_candidates(self) -> None:
        rows = self.system.list_candidates()
        ranked = sorted(
            rows,
            key=lambda item: (
                item["external_score"] is None,
                -(item["external_score"] or 0),
                -item["id"],
            ),
        )
        for index, slot in enumerate(self.candidate_slots):
            slot.set_candidate(ranked[index] if index < len(ranked) else None)
        self.candidate_count_label.setText(
            f"当前 {len(rows)} / 3"
            + (" · 建议保持 2–3 只" if len(rows) < 2 else "")
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
        red_count = sum(item["severity"] == "red" for item in rows)
        yellow_count = sum(item["severity"] == "yellow" for item in rows)
        green_count = max(0, 10 - red_count - yellow_count)
        self.supervision_score_gauge.set_score(grade["score"], grade["grade"])
        self.supervision_donut.set_data(
            [
                ("红灯", red_count, "#e25555"),
                ("黄灯", yellow_count, "#d4a017"),
                ("合规", green_count, "#3fad7a"),
            ],
            center_value=f"{red_count + yellow_count} 告警",
        )
        self.supervision_distribution.setText(
            f"🔴 {red_count}   🟡 {yellow_count}   🟢 {green_count}"
        )
        radar_scores: dict[str, float] = {}
        for level, badge in self.supervision_layers.items():
            level_rows = [item for item in rows if item["level"] == level]
            level_red = sum(item["severity"] == "red" for item in level_rows)
            level_yellow = sum(
                item["severity"] == "yellow" for item in level_rows
            )
            if level_red:
                badge.set_status(f"{level} {level_red} 红灯", "red")
                radar_scores[level] = max(15.0, 100.0 - 35.0 * level_red)
            elif level_yellow:
                badge.set_status(f"{level} {level_yellow} 黄灯", "yellow")
                radar_scores[level] = max(40.0, 100.0 - 20.0 * level_yellow)
            else:
                badge.set_status(f"{level} 正常", "green")
                radar_scores[level] = 100.0
        self.supervision_radar.set_scores(radar_scores)
        self.supervision_penalty_viz.setText(
            f"处罚状态：{penalty or '正常'}"
        )
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
                    cell.setForeground(QColor("#e25555"))
                elif item["severity"] == "yellow":
                    cell.setForeground(QColor("#d4a017"))
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
