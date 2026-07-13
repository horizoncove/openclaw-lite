"""Reusable visual widgets for the trading cockpit dashboard."""

from __future__ import annotations

from PyQt6.QtCore import QRectF, Qt
from PyQt6.QtGui import QColor, QFont, QPainter, QPen
from PyQt6.QtWidgets import QFrame, QLabel, QVBoxLayout, QWidget


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
        self.setMinimumSize(150, 150)
        self.setMaximumHeight(180)
        self.setStyleSheet("background: transparent;")

    def set_ratio(self, ratio: float) -> None:
        self.ratio = max(0.0, min(float(ratio), 1.0))
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
        pen = QPen(QColor("#e8edf5"), 12)
        pen.setCapStyle(Qt.PenCapStyle.RoundCap)
        painter.setPen(pen)
        painter.drawArc(rect, 90 * 16, -360 * 16)
        pen.setColor(self._color())
        painter.setPen(pen)
        painter.drawArc(rect, 90 * 16, int(-360 * 16 * self.ratio))

        painter.setPen(QColor("#14213d"))
        painter.setFont(QFont("", 19, QFont.Weight.Bold))
        painter.drawText(
            rect,
            Qt.AlignmentFlag.AlignCenter,
            f"{self.ratio * 100:.1f}%",
        )
        painter.setPen(QColor("#6b7890"))
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


class StatusBadge(QLabel):
    """Pill badge used for compliance and synchronization state."""

    COLORS = {
        "green": ("#dcfce7", "#15803d"),
        "yellow": ("#fef3c7", "#b45309"),
        "red": ("#fee2e2", "#b91c1c"),
        "blue": ("#dbeafe", "#1d4ed8"),
        "slate": ("#e9eef5", "#475569"),
    }

    def __init__(self, text: str = "", tone: str = "slate") -> None:
        super().__init__()
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setMinimumHeight(32)
        self.set_status(text, tone)

    def set_status(self, text: str, tone: str = "slate") -> None:
        background, foreground = self.COLORS.get(tone, self.COLORS["slate"])
        self.setText(text)
        self.setStyleSheet(
            f"background:{background}; color:{foreground}; "
            "border-radius:16px; padding:5px 12px; font-weight:700;"
        )


__all__ = ["CockpitCard", "RingGauge", "StatusBadge"]
