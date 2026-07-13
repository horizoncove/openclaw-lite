"""Reusable visual widgets for the trading cockpit dashboard."""

from __future__ import annotations

from decimal import Decimal

from PyQt6.QtCore import QRectF, Qt
from PyQt6.QtGui import QColor, QFont, QPainter, QPen
from PyQt6.QtWidgets import (
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QProgressBar,
    QVBoxLayout,
    QWidget,
)


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
        return QColor("#22c55e" if safe else "#ef4444")

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
        pen = QPen(QColor("#17324d" if self.dark_mode else "#e8edf5"), 12)
        pen.setCapStyle(Qt.PenCapStyle.RoundCap)
        painter.setPen(pen)
        painter.drawArc(rect, 90 * 16, -360 * 16)
        pen.setColor(self._color())
        painter.setPen(pen)
        painter.drawArc(rect, 90 * 16, int(-360 * 16 * self.ratio))

        painter.setPen(QColor("#e0f2fe" if self.dark_mode else "#14213d"))
        painter.setFont(QFont("", 19, QFont.Weight.Bold))
        painter.drawText(
            rect,
            Qt.AlignmentFlag.AlignCenter,
            f"{self.ratio * 100:.1f}%",
        )
        painter.setPen(QColor("#6f91aa" if self.dark_mode else "#6b7890"))
        painter.setFont(QFont("", 10, QFont.Weight.Medium))
        title_rect = QRectF(rect.left(), rect.bottom() - 35, rect.width(), 24)
        painter.drawText(title_rect, Qt.AlignmentFlag.AlignCenter, self.title)


class CockpitCard(QFrame):
    """White dashboard card with a title and optional subtitle."""

    def __init__(self, title: str, subtitle: str = "") -> None:
        super().__init__()
        self.setObjectName("cockpitCard")
        self.body = QVBoxLayout(self)
        self.body.setContentsMargins(18, 16, 18, 16)
        self.body.setSpacing(10)
        heading = QLabel(title)
        heading.setObjectName("cockpitTitle")
        self.body.addWidget(heading)
        if subtitle:
            hint = QLabel(subtitle)
            hint.setObjectName("cockpitHint")
            hint.setWordWrap(True)
            self.body.addWidget(hint)


class HoldingCard(QFrame):
    """Data-rich card for one currently held A-share position."""

    def __init__(self) -> None:
        super().__init__()
        self.setObjectName("holdingCard")
        root = QVBoxLayout(self)
        root.setContentsMargins(16, 14, 16, 14)
        root.setSpacing(9)
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
        self.metric_labels: dict[str, QLabel] = {}
        for index, (key, title) in enumerate(
            [
                ("quantity", "持仓数量"),
                ("avg_cost", "平均成本"),
                ("last_price", "最新价格"),
                ("market_value", "持仓市值"),
                ("pnl_amount", "浮动盈亏"),
                ("stop_price", "-7% 止损价"),
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
            f"color:{'#ef4444' if pnl_rate >= 0 else '#22c55e'};"
            "font-size:18px; font-weight:800; background:transparent;"
        )
        self.metric_labels["quantity"].setText(f"{quantity:,} 股")
        self.metric_labels["avg_cost"].setText(f"{avg_cost:,.2f}")
        self.metric_labels["last_price"].setText(f"{last_price:,.2f}")
        self.metric_labels["market_value"].setText(
            f"{market_value / 10000:,.2f} 万"
        )
        self.metric_labels["pnl_amount"].setText(
            f"{pnl_amount / 10000:+,.2f} 万"
        )
        self.metric_labels["pnl_amount"].setStyleSheet(
            f"color:{'#ef4444' if pnl_amount >= 0 else '#22c55e'};"
            "font-weight:750; background:transparent;"
        )
        self.metric_labels["stop_price"].setText(
            f"{avg_cost * Decimal('0.93'):,.2f}"
        )
        self.position_bar.setValue(min(250, int(ratio * 1000)))
        self.position_bar.setFormat(f"单票仓位 {ratio:.2%} / 红线 25%")


class StatusBadge(QLabel):
    """Pill badge used for compliance and synchronization state."""

    COLORS = {
        "green": ("#dcfce7", "#15803d"),
        "yellow": ("#fef3c7", "#b45309"),
        "red": ("#fee2e2", "#b91c1c"),
        "blue": ("#dbeafe", "#1d4ed8"),
        "slate": ("#e9eef5", "#475569"),
    }
    DARK_COLORS = {
        "green": ("#052e2b", "#5eead4"),
        "yellow": ("#3b2607", "#fbbf24"),
        "red": ("#3b0a16", "#fb7185"),
        "blue": ("#082f49", "#67e8f9"),
        "slate": ("#152638", "#94a3b8"),
    }

    def __init__(self, text: str = "", tone: str = "slate") -> None:
        super().__init__()
        self.dark_mode = False
        self.tone = tone
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setMinimumHeight(32)
        self.set_status(text, tone)

    def set_status(self, text: str, tone: str = "slate") -> None:
        self.tone = tone
        palette = self.DARK_COLORS if self.dark_mode else self.COLORS
        background, foreground = palette.get(tone, palette["slate"])
        self.setText(text)
        self.setStyleSheet(
            f"background:{background}; color:{foreground}; "
            "border-radius:16px; padding:5px 12px; font-weight:700;"
        )

    def set_dark_mode(self, enabled: bool) -> None:
        self.dark_mode = bool(enabled)
        self.set_status(self.text(), self.tone)


__all__ = ["CockpitCard", "HoldingCard", "RingGauge", "StatusBadge"]
