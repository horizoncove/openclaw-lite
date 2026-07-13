"""应用启动入口：python -m sharon_trading_system_v1_0.main"""

from __future__ import annotations

import sys

from PyQt6.QtWidgets import QApplication

from .main_window import MainWindow


def main() -> int:
    app = QApplication(sys.argv)
    app.setApplicationName("Sharon Trading System")
    app.setOrganizationName("Sharon")
    window = MainWindow()
    window.show()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
