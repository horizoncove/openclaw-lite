"""Reusable visual widgets for the Sharon trading desk."""

from __future__ import annotations

import math
from decimal import Decimal

from PyQt6.QtCore import QPointF, QRectF, Qt, QSize
from PyQt6.QtGui import QColor, QFont, QPainter, QPen, QPolygonF
from PyQt6.QtWidgets import (
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QProgressBar,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

# Ink-terminal palette: graphite surfaces, brass accent, A-share red/green.
BRASS = "#c9a66b"
BRASS_SOFT = "#e6d3a8"
INK = "#ece8e1"
MUTED = "#9aa3ad"
TRACK_DARK = "#2c3440"
TRACK_LIGHT = "#e4e8ee"
PROFIT = "#e25555"
LOSS = "#3fad7a"
WARN = "#d4a017"


def _mono(size: int, weight: QFont.Weight = QFont.Weight.Bold) -> QFont:
    font = QFont("JetBrains Mono", size, weight)
    font.setStyleHint(QFont.StyleHint.TypeWriter)
    return font


def _ui(size: int, weight: QFont.Weight = QFont.Weight.Medium) -> QFont:
    font = QFont("Public Sans", size, weight)
    if not font.exactMatch():
        font = QFont("WenQuanYi Micro Hei", size, weight)
    return font


class PageHeader(QFrame):
    """Single-purpose page masthead: title + one supporting line."""

    def __init__(self, title: str, subtitle: str = "") -> None:
        super().__init__()
        self.setObjectName("pageHeader")
        root = QVBoxLayout(self)
        root.setContentsMargins(22, 16, 22, 16)
        root.setSpacing(4)
        heading = QLabel(title)
        heading.setObjectName("pageHeaderTitle")
        root.addWidget(heading)
        if subtitle:
            hint = QLabel(subtitle)
            hint.setObjectName("pageHeaderSubtitle")
            hint.setWordWrap(True)
            root.addWidget(hint)


class MetricStrip(QFrame):
    """Inline metrics without dashboard-card chrome."""

    def __init__(self, items: list[tuple[str, str]]) -> None:
        super().__init__()
        self.setObjectName("metricStrip")
        self.values: dict[str, QLabel] = {}
        row = QHBoxLayout(self)
        row.setContentsMargins(18, 12, 18, 12)
        row.setSpacing(0)
        for index, (key, title) in enumerate(items):
            if index:
                divider = QFrame()
                divider.setObjectName("metricDivider")
                divider.setFixedWidth(1)
                divider.setMinimumHeight(28)
                row.addWidget(divider)
            cell = QVBoxLayout()
            cell.setSpacing(2)
            cell.setContentsMargins(16, 0, 16, 0)
            label = QLabel(title)
            label.setObjectName("kpiTitle")
            value = QLabel("--")
            value.setObjectName("stripValue")
            cell.addWidget(label)
            cell.addWidget(value)
            self.values[key] = value
            row.addLayout(cell, 1)

    def set_value(self, key: str, text: str, color: str | None = None) -> None:
        label = self.values[key]
        label.setText(text)
        if color:
            label.setStyleSheet(f"color:{color}; background:transparent;")
        else:
            label.setStyleSheet("background:transparent;")


class RingGauge(QWidget):
    """Compact antialiased ring gauge with threshold-aware coloring."""

    def __init__(
        self,
        title: str,
        *,
        good_when_high: bool = False,
        threshold: float = 0.6,
    ) -> None:
        super().__init__()
        self.title = title
        self.ratio = 0.0
        self.good_when_high = good_when_high
        self.threshold = threshold
        self.dark_mode = False
        self.setMinimumSize(150, 150)
        self.setMaximumHeight(180)
        self.setStyleSheet("background: transparent;")

    def set_ratio(self, ratio: float) -> None:
        self.ratio = max(0.0, min(float(ratio), 1.0))
        self.update()

    def set_dark_mode(self, enabled: bool) -> None:
        self.dark_mode = bool(enabled)
        self.update()

    def _color(self) -> QColor:
        safe = (
            self.ratio >= self.threshold
            if self.good_when_high
            else self.ratio <= self.threshold
        )
        return QColor(LOSS if safe else PROFIT)

    def paintEvent(self, event) -> None:  # noqa: N802 - Qt API
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        side = min(self.width(), self.height()) - 28
        rect = QRectF(
            (self.width() - side) / 2,
            (self.height() - side) / 2 - 3,
            side,
            side,
        )
        pen = QPen(QColor(TRACK_DARK if self.dark_mode else TRACK_LIGHT), 11)
        pen.setCapStyle(Qt.PenCapStyle.RoundCap)
        painter.setPen(pen)
        painter.drawArc(rect, 90 * 16, -360 * 16)
        pen.setColor(self._color())
        painter.setPen(pen)
        painter.drawArc(rect, 90 * 16, int(-360 * 16 * self.ratio))

        painter.setPen(QColor(INK if self.dark_mode else "#1a1f26"))
        painter.setFont(_mono(18))
        painter.drawText(
            rect,
            Qt.AlignmentFlag.AlignCenter,
            f"{self.ratio * 100:.1f}%",
        )
        painter.setPen(QColor(MUTED))
        painter.setFont(_ui(10))
        title_rect = QRectF(rect.left(), rect.bottom() - 34, rect.width(), 22)
        painter.drawText(title_rect, Qt.AlignmentFlag.AlignCenter, self.title)


class DonutChart(QWidget):
    """Multi-segment allocation donut with a center summary."""

    COLORS = ["#c9a66b", "#e25555", "#3fad7a", "#6f8fad", "#d4a017"]

    def __init__(self, center_title: str = "") -> None:
        super().__init__()
        self.center_title = center_title
        self.center_value = "--"
        self.segments: list[tuple[str, float, QColor]] = []
        self.dark_mode = False
        self.setMinimumSize(180, 170)
        self.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding
        )
        self.setStyleSheet("background:transparent;")

    def set_data(
        self,
        values: list[tuple[str, float] | tuple[str, float, str]],
        *,
        center_value: str,
    ) -> None:
        self.segments = []
        for index, item in enumerate(values):
            label, value = item[0], item[1]
            color = item[2] if len(item) == 3 else self.COLORS[index % len(self.COLORS)]
            self.segments.append(
                (label, max(0.0, float(value)), QColor(color))
            )
        self.center_value = center_value
        self.update()

    def set_dark_mode(self, enabled: bool) -> None:
        self.dark_mode = bool(enabled)
        self.update()

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        size = min(self.width() - 18, self.height() - 12)
        rect = QRectF(
            (self.width() - size) / 2,
            4,
            size,
            size,
        )
        total = sum(value for _, value, _ in self.segments)
        track = QPen(QColor(TRACK_DARK if self.dark_mode else TRACK_LIGHT), 20)
        track.setCapStyle(Qt.PenCapStyle.FlatCap)
        painter.setPen(track)
        painter.drawArc(rect, 90 * 16, -360 * 16)
        if total:
            start = 90 * 16
            for _, value, color in self.segments:
                span = int(-360 * 16 * value / total)
                pen = QPen(color, 20)
                pen.setCapStyle(Qt.PenCapStyle.FlatCap)
                painter.setPen(pen)
                painter.drawArc(rect, start, span)
                start += span
        painter.setPen(QColor(INK if self.dark_mode else "#1a1f26"))
        painter.setFont(_mono(16))
        value_rect = QRectF(
            rect.left(), rect.center().y() - 20, rect.width(), 28
        )
        painter.drawText(
            value_rect, Qt.AlignmentFlag.AlignCenter, self.center_value
        )
        painter.setPen(QColor(MUTED))
        painter.setFont(_ui(9))
        title_rect = QRectF(rect.left(), rect.center().y() + 6, rect.width(), 20)
        painter.drawText(title_rect, Qt.AlignmentFlag.AlignCenter, self.center_title)


class ScoreGauge(QWidget):
    """Semicircular discipline score gauge."""

    def __init__(self, title: str = "纪律评分") -> None:
        super().__init__()
        self.title = title
        self.score = 100
        self.grade = "A"
        self.dark_mode = False
        self.setMinimumSize(200, 160)
        self.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding
        )
        self.setStyleSheet("background:transparent;")

    def set_score(self, score: int, grade: str) -> None:
        self.score = max(0, min(int(score), 100))
        self.grade = grade
        self.update()

    def set_dark_mode(self, enabled: bool) -> None:
        self.dark_mode = bool(enabled)
        self.update()

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        baseline = self.height() - 10
        radius = max(
            48.0,
            min((self.width() - 36) / 2, self.height() - 28),
        )
        rect = QRectF(
            self.width() / 2 - radius,
            baseline - radius,
            radius * 2,
            radius * 2,
        )
        track = QPen(QColor(TRACK_DARK if self.dark_mode else TRACK_LIGHT), 13)
        track.setCapStyle(Qt.PenCapStyle.RoundCap)
        painter.setPen(track)
        painter.drawArc(rect, 0, 180 * 16)
        color = BRASS if self.score >= 90 else WARN if self.score >= 70 else PROFIT
        pen = QPen(QColor(color), 13)
        pen.setCapStyle(Qt.PenCapStyle.RoundCap)
        painter.setPen(pen)
        painter.drawArc(rect, 180 * 16, int(-180 * 16 * self.score / 100))
        painter.setPen(QColor(BRASS_SOFT if self.dark_mode else "#6b5216"))
        painter.setFont(_mono(28))
        painter.drawText(
            QRectF(0, baseline - radius * 0.78, self.width(), 42),
            Qt.AlignmentFlag.AlignCenter,
            self.grade,
        )
        painter.setPen(QColor(INK if self.dark_mode else "#1a1f26"))
        painter.setFont(_mono(14, QFont.Weight.Medium))
        painter.drawText(
            QRectF(0, baseline - radius * 0.42, self.width(), 22),
            Qt.AlignmentFlag.AlignCenter,
            f"{self.score} 分",
        )
        painter.setPen(QColor(MUTED))
        painter.setFont(_ui(10))
        painter.drawText(
            QRectF(0, baseline - radius * 0.18, self.width(), 20),
            Qt.AlignmentFlag.AlignCenter,
            self.title,
        )


class RadarChart(QWidget):
    """Triangular radar for L1 / L2 / L3 supervision health."""

    def __init__(self) -> None:
        super().__init__()
        self.dark_mode = False
        self.axes = [
            ("L1", "硬规则", 100.0),
            ("L2", "软规则", 100.0),
            ("L3", "心理", 100.0),
        ]
        self.setMinimumSize(210, 190)
        self.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding
        )
        self.setStyleSheet("background:transparent;")

    def set_scores(self, scores: dict[str, float]) -> None:
        updated = []
        for key, label, _ in self.axes:
            updated.append(
                (key, label, max(0.0, min(float(scores.get(key, 100.0)), 100.0)))
            )
        self.axes = updated
        self.update()

    def set_dark_mode(self, enabled: bool) -> None:
        self.dark_mode = bool(enabled)
        self.update()

    def sizeHint(self) -> QSize:  # noqa: N802
        return QSize(240, 210)

    def _point(self, center: QPointF, radius: float, index: int, ratio: float) -> QPointF:
        angle = -math.pi / 2 + index * (2 * math.pi / 3)
        distance = radius * max(0.0, min(ratio, 1.0))
        return QPointF(
            center.x() + distance * math.cos(angle),
            center.y() + distance * math.sin(angle),
        )

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        margin = 38
        side = min(self.width(), self.height()) - margin * 2
        center = QPointF(self.width() / 2, self.height() / 2 + 2)
        radius = max(40.0, side / 2)
        grid = QColor("#3a4350" if self.dark_mode else "#d5dae2")
        axis = QColor(MUTED)
        fill = QColor(201, 166, 107, 55 if self.dark_mode else 80)
        stroke = QColor(BRASS)
        text = QColor(INK if self.dark_mode else "#1a1f26")

        for ring in (0.33, 0.66, 1.0):
            polygon = QPolygonF(
                [self._point(center, radius, index, ring) for index in range(3)]
            )
            painter.setPen(QPen(grid, 1))
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.drawPolygon(polygon)

        for index in range(3):
            tip = self._point(center, radius, index, 1.0)
            painter.setPen(QPen(grid, 1))
            painter.drawLine(center, tip)

        value_poly = QPolygonF(
            [
                self._point(center, radius, index, score / 100.0)
                for index, (_, _, score) in enumerate(self.axes)
            ]
        )
        painter.setBrush(fill)
        painter.setPen(QPen(stroke, 2.2))
        painter.drawPolygon(value_poly)

        for index, (key, label, score) in enumerate(self.axes):
            point = self._point(center, radius, index, score / 100.0)
            painter.setBrush(stroke)
            painter.setPen(Qt.PenStyle.NoPen)
            painter.drawEllipse(point, 3.2, 3.2)

            label_point = self._point(center, radius + 22, index, 1.0)
            painter.setPen(text)
            painter.setFont(_mono(11))
            painter.drawText(
                QRectF(label_point.x() - 30, label_point.y() - 18, 60, 18),
                Qt.AlignmentFlag.AlignCenter,
                key,
            )
            painter.setPen(axis)
            painter.setFont(_ui(9))
            painter.drawText(
                QRectF(label_point.x() - 34, label_point.y() - 2, 68, 16),
                Qt.AlignmentFlag.AlignCenter,
                f"{label} {score:.0f}",
            )


class CandidateSlotCard(QFrame):
    """One of three externally selected candidate seats."""

    def __init__(self, rank: int) -> None:
        super().__init__()
        self.rank = rank
        self.setObjectName("candidateSlot")
        self.setMinimumHeight(168)
        self.setMaximumHeight(198)
        root = QVBoxLayout(self)
        root.setContentsMargins(16, 14, 16, 14)
        root.setSpacing(7)
        top = QHBoxLayout()
        self.rank_label = QLabel(f"{rank:02d}")
        self.rank_label.setObjectName("candidateRank")
        self.name = QLabel("空席")
        self.name.setObjectName("candidateSlotName")
        top.addWidget(self.rank_label)
        top.addWidget(self.name, 1)
        root.addLayout(top)
        self.code_sector = QLabel("等待外部 AI 写入")
        self.code_sector.setObjectName("candidateSlotMeta")
        self.quote = QLabel("行情 —")
        self.quote.setObjectName("candidateSlotMeta")
        self.source = QLabel("—")
        self.source.setObjectName("candidateSlotMeta")
        self.score = QProgressBar()
        self.score.setRange(0, 100)
        self.score.setValue(0)
        self.score.setFormat("外部评分 未提供")
        self.score.setMaximumHeight(20)
        self.reason = QLabel("登记后展示入选摘要")
        self.reason.setObjectName("candidateSlotReason")
        self.reason.setWordWrap(True)
        self.reason.setMaximumHeight(34)
        root.addWidget(self.code_sector)
        root.addWidget(self.quote)
        root.addWidget(self.source)
        root.addWidget(self.score)
        root.addWidget(self.reason)
        self.setProperty("occupied", False)

    def set_candidate(
        self, candidate: dict | None, quote: object | None = None
    ) -> None:
        if not candidate:
            self.name.setText("空席")
            self.code_sector.setText("等待外部 AI 写入")
            self.quote.setText("行情 —")
            self.quote.setStyleSheet("background:transparent; border:0;")
            self.source.setText("—")
            self.score.setValue(0)
            self.score.setFormat("外部评分 未提供")
            self.reason.setText("登记后展示入选摘要")
            self.setProperty("occupied", False)
            self.style().unpolish(self)
            self.style().polish(self)
            return
        self.name.setText(candidate["stock_name"] or "未命名股票")
        self.code_sector.setText(
            f"{candidate['stock_code']}  ·  {candidate['sector']}"
        )
        self.set_quote(quote)
        self.source.setText(f"来源  {candidate['source_ai']}")
        score = candidate["external_score"]
        self.score.setValue(int(score or 0))
        self.score.setFormat(
            f"外部评分  {score:g} / 100" if score is not None else "外部评分 未提供"
        )
        reason = candidate["selection_reason"] or "未填写入选理由"
        self.reason.setText(reason if len(reason) <= 40 else reason[:38] + "…")
        self.setProperty("occupied", True)
        self.style().unpolish(self)
        self.style().polish(self)

    def set_quote(self, quote: object | None) -> None:
        if quote is None:
            self.quote.setText("行情等待刷新")
            self.quote.setStyleSheet(
                "background:transparent; border:0; color:#9aa3ad;"
            )
            return
        change = getattr(quote, "change_pct", None)
        price = getattr(quote, "last_price", None)
        if price is None:
            self.quote.setText("行情等待刷新")
            self.quote.setStyleSheet(
                "background:transparent; border:0; color:#9aa3ad;"
            )
            return
        change_text = f"{change:+.2f}%" if change is not None else "--"
        color = "#e25555" if change is not None and change >= 0 else "#3fad7a"
        if change is None:
            color = "#9aa3ad"
        self.quote.setText(f"现价 {price:.2f}  ·  {change_text}")
        self.quote.setStyleSheet(
            f"background:transparent; border:0; color:{color}; font-weight:700;"
        )


class CockpitCard(QFrame):
    """Surface panel with title and optional subtitle."""

    def __init__(self, title: str, subtitle: str = "") -> None:
        super().__init__()
        self.setObjectName("cockpitCard")
        self.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding
        )
        self.body = QVBoxLayout(self)
        self.body.setContentsMargins(18, 15, 18, 15)
        self.body.setSpacing(8)
        heading = QLabel(title)
        heading.setObjectName("cockpitTitle")
        self.body.addWidget(heading)
        if subtitle:
            hint = QLabel(subtitle)
            hint.setObjectName("cockpitHint")
            hint.setWordWrap(True)
            self.body.addWidget(hint)


class HoldingCard(QFrame):
    """Dense card for one currently held A-share position."""

    def __init__(self) -> None:
        super().__init__()
        self.setObjectName("holdingCard")
        root = QVBoxLayout(self)
        root.setContentsMargins(16, 14, 16, 14)
        root.setSpacing(8)
        header = QHBoxLayout()
        self.code_name = QLabel("--")
        self.code_name.setObjectName("holdingName")
        self.sector = QLabel("--")
        self.sector.setObjectName("holdingSector")
        self.pnl = QLabel("--")
        self.pnl.setObjectName("holdingPnl")
        header.addWidget(self.code_name)
        header.addWidget(self.sector)
        header.addStretch()
        header.addWidget(self.pnl)
        root.addLayout(header)

        metrics = QGridLayout()
        metrics.setHorizontalSpacing(12)
        metrics.setVerticalSpacing(4)
        self.metric_labels: dict[str, QLabel] = {}
        for index, (key, title) in enumerate(
            [
                ("quantity", "数量"),
                ("avg_cost", "成本"),
                ("last_price", "现价"),
                ("market_value", "市值"),
                ("pnl_amount", "浮盈"),
                ("stop_price", "止损"),
            ]
        ):
            title_label = QLabel(title)
            title_label.setObjectName("holdingMetricTitle")
            value_label = QLabel("--")
            value_label.setObjectName("holdingMetricValue")
            column = index % 3
            row = (index // 3) * 2
            metrics.addWidget(title_label, row, column)
            metrics.addWidget(value_label, row + 1, column)
            self.metric_labels[key] = value_label
        root.addLayout(metrics)
        self.position_bar = QProgressBar()
        self.position_bar.setRange(0, 250)
        self.position_bar.setMaximumHeight(18)
        root.addWidget(self.position_bar)

    def set_data(self, item: dict, name: str = "") -> None:
        quantity = int(item["quantity"])
        avg_cost = item["avg_cost"]
        last_price = item["last_price"]
        market_value = item["market_value"]
        ratio = item["position_ratio"]
        pnl_rate = last_price / avg_cost - 1 if avg_cost else Decimal(0)
        pnl_amount = (last_price - avg_cost) * quantity
        self.code_name.setText(
            f"{item['stock_code']}  {name or '持仓股票'}"
        )
        self.sector.setText(item["sector"])
        self.pnl.setText(f"{pnl_rate:+.2%}")
        self.pnl.setStyleSheet(
            f"color:{PROFIT if pnl_rate >= 0 else LOSS};"
            "font-size:18px; font-weight:800; background:transparent;"
            "font-family:'JetBrains Mono';"
        )
        self.metric_labels["quantity"].setText(f"{quantity:,}")
        self.metric_labels["avg_cost"].setText(f"{avg_cost:,.2f}")
        self.metric_labels["last_price"].setText(f"{last_price:,.2f}")
        self.metric_labels["market_value"].setText(
            f"{market_value / 10000:,.2f}万"
        )
        self.metric_labels["pnl_amount"].setText(
            f"{pnl_amount / 10000:+,.2f}万"
        )
        self.metric_labels["pnl_amount"].setStyleSheet(
            f"color:{PROFIT if pnl_amount >= 0 else LOSS};"
            "font-weight:750; background:transparent;"
            "font-family:'JetBrains Mono';"
        )
        self.metric_labels["stop_price"].setText(
            f"{avg_cost * Decimal('0.93'):,.2f}"
        )
        self.position_bar.setValue(min(250, int(ratio * 1000)))
        self.position_bar.setFormat(f"仓位 {ratio:.2%} / 25%")


class StatusBadge(QLabel):
    """Compact status chip — square corners, not rounded pills."""

    COLORS = {
        "green": ("#e8f6ee", "#1f7a4d"),
        "yellow": ("#f8efd6", "#8a6a12"),
        "red": ("#f8e6e6", "#a33333"),
        "blue": ("#ece7dc", "#6b5216"),
        "slate": ("#eceff2", "#4b5563"),
    }
    DARK_COLORS = {
        "green": ("#1a2b22", "#7dcca0"),
        "yellow": ("#2c2412", "#e0bf5a"),
        "red": ("#2c1717", "#e88a8a"),
        "blue": ("#2a2418", BRASS_SOFT),
        "slate": ("#242a33", "#aeb6c0"),
    }

    def __init__(self, text: str = "", tone: str = "slate") -> None:
        super().__init__()
        self.dark_mode = False
        self.tone = tone
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setMinimumHeight(28)
        self.set_status(text, tone)

    def set_status(self, text: str, tone: str = "slate") -> None:
        self.tone = tone
        palette = self.DARK_COLORS if self.dark_mode else self.COLORS
        background, foreground = palette.get(tone, palette["slate"])
        self.setText(text)
        self.setStyleSheet(
            f"background:{background}; color:{foreground}; "
            "border-radius:4px; padding:4px 10px; font-weight:700;"
        )

    def set_dark_mode(self, enabled: bool) -> None:
        self.dark_mode = bool(enabled)
        self.set_status(self.text(), self.tone)


__all__ = [
    "CandidateSlotCard",
    "CockpitCard",
    "DonutChart",
    "HoldingCard",
    "MetricStrip",
    "PageHeader",
    "RadarChart",
    "RingGauge",
    "ScoreGauge",
    "StatusBadge",
]
