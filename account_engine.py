"""SQLite-backed account and position engine for Sharon Trading System.

Amounts are stored in yuan.  For example, 503.72 万元 is represented as
``5_037_200``.  The engine treats synchronized trades as broker facts: a trade
is persisted first and any position-limit breaches are returned as warnings.
"""

from __future__ import annotations

import re
import sqlite3
import threading
from collections.abc import Callable, Iterable, Mapping
from dataclasses import asdict, dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


DEFAULT_CAPITAL = Decimal("5037200")
SINGLE_STOCK_LIMIT = Decimal("0.25")
SECTOR_LIMIT = Decimal("0.30")
TOTAL_POSITION_LIMIT = Decimal("0.60")
CASH_FLOOR = Decimal("0.40")
DEFAULT_SYNC_INTERVAL_SECONDS = 5.0

_TRADE_PATTERN = re.compile(
    r"^\s*(买入|卖出|buy|sell)\s+([0-9]{6})\s+"
    r"([0-9]+(?:\.[0-9]+)?)\s+([1-9][0-9]*)\s*$",
    re.IGNORECASE,
)


class AccountEngineError(Exception):
    """Base exception raised by the account engine."""


class InvalidTradeError(AccountEngineError, ValueError):
    """Raised when a trade command is malformed or cannot be applied."""


class AccountNotFoundError(AccountEngineError):
    """Raised when the configured account does not exist."""


@dataclass(frozen=True)
class AccountData:
    id: int
    initial_capital: Decimal
    current_capital: Decimal
    total_pnl: Decimal
    update_time: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class Trade:
    side: str
    stock_code: str
    price: Decimal
    quantity: int
    sector: str = "未分类"

    @property
    def amount(self) -> Decimal:
        return self.price * self.quantity

    def to_dict(self) -> dict[str, Any]:
        result = asdict(self)
        result["amount"] = self.amount
        return result


@dataclass(frozen=True)
class RiskViolation:
    rule: str
    actual: Decimal
    limit: Decimal
    message: str
    stock_code: str | None = None
    sector: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _decimal(value: Decimal | int | float | str, field: str) -> Decimal:
    try:
        result = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"{field} 必须是有效数字") from exc
    if not result.is_finite():
        raise ValueError(f"{field} 必须是有限数字")
    return result


class AccountEngine:
    """Manage one trading account, synchronized trades, and risk red lines."""

    def __init__(
        self,
        db_path: str | Path = "sharon_trading.db",
        *,
        account_id: int = 1,
        default_capital: Decimal | int | float | str = DEFAULT_CAPITAL,
        sector_mapping: Mapping[str, str] | None = None,
    ) -> None:
        if account_id <= 0:
            raise ValueError("account_id 必须为正整数")

        self.db_path = str(db_path)
        self.account_id = account_id
        self.default_capital = _decimal(default_capital, "default_capital")
        if self.default_capital <= 0:
            raise ValueError("default_capital 必须大于 0")

        self._sector_mapping = dict(sector_mapping or {})
        self._lock = threading.RLock()
        self._stop_event = threading.Event()
        self._sync_thread: threading.Thread | None = None
        self.last_sync_error: Exception | None = None

        if self.db_path != ":memory:":
            Path(self.db_path).expanduser().resolve().parent.mkdir(
                parents=True, exist_ok=True
            )
        self._connection = sqlite3.connect(
            self.db_path,
            check_same_thread=False,
            timeout=30,
        )
        self._connection.row_factory = sqlite3.Row
        self._connection.execute("PRAGMA foreign_keys = ON")
        self._connection.execute("PRAGMA busy_timeout = 30000")
        if self.db_path != ":memory:":
            self._connection.execute("PRAGMA journal_mode = WAL")
        self._initialize_database()

    def _initialize_database(self) -> None:
        with self._lock, self._connection:
            self._connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS accounts (
                    id INTEGER PRIMARY KEY,
                    initial_capital REAL NOT NULL,
                    current_capital REAL NOT NULL,
                    total_pnl REAL DEFAULT 0,
                    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS positions (
                    account_id INTEGER NOT NULL,
                    stock_code TEXT NOT NULL,
                    sector TEXT NOT NULL DEFAULT '未分类',
                    quantity INTEGER NOT NULL CHECK (quantity >= 0),
                    avg_cost REAL NOT NULL CHECK (avg_cost >= 0),
                    last_price REAL NOT NULL CHECK (last_price >= 0),
                    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (account_id, stock_code),
                    FOREIGN KEY (account_id) REFERENCES accounts(id)
                        ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    account_id INTEGER NOT NULL,
                    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
                    stock_code TEXT NOT NULL,
                    sector TEXT NOT NULL,
                    price REAL NOT NULL CHECK (price > 0),
                    quantity INTEGER NOT NULL CHECK (quantity > 0),
                    amount REAL NOT NULL CHECK (amount > 0),
                    trade_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (account_id) REFERENCES accounts(id)
                        ON DELETE CASCADE
                );
                """
            )
            self._connection.execute(
                """
                INSERT OR IGNORE INTO accounts
                    (id, initial_capital, current_capital, total_pnl)
                VALUES (?, ?, ?, 0)
                """,
                (
                    self.account_id,
                    float(self.default_capital),
                    float(self.default_capital),
                ),
            )

    @staticmethod
    def parse_trade(command: str, *, sector: str = "未分类") -> Trade:
        """Parse commands such as ``买入 002371 350.00 3600``."""
        if not isinstance(command, str):
            raise InvalidTradeError("交易指令必须是字符串")
        match = _TRADE_PATTERN.fullmatch(command)
        if not match:
            raise InvalidTradeError(
                "交易指令格式错误，应为：买入/卖出 股票代码 价格 数量"
            )

        side_text, stock_code, price_text, quantity_text = match.groups()
        price = _decimal(price_text, "价格")
        quantity = int(quantity_text)
        if price <= 0:
            raise InvalidTradeError("价格必须大于 0")
        normalized_sector = sector.strip() if isinstance(sector, str) else ""
        if not normalized_sector:
            normalized_sector = "未分类"
        side = "buy" if side_text.lower() in {"买入", "buy"} else "sell"
        return Trade(side, stock_code, price, quantity, normalized_sector)

    def load_account(self) -> AccountData:
        with self._lock:
            row = self._connection.execute(
                "SELECT * FROM accounts WHERE id = ?", (self.account_id,)
            ).fetchone()
        if row is None:
            raise AccountNotFoundError(f"账户 {self.account_id} 不存在")
        return AccountData(
            id=row["id"],
            initial_capital=_decimal(row["initial_capital"], "initial_capital"),
            current_capital=_decimal(row["current_capital"], "current_capital"),
            total_pnl=_decimal(row["total_pnl"] or 0, "total_pnl"),
            update_time=str(row["update_time"]),
        )

    def save_account(
        self,
        *,
        initial_capital: Decimal | int | float | str | None = None,
        current_capital: Decimal | int | float | str | None = None,
        total_pnl: Decimal | int | float | str | None = None,
    ) -> AccountData:
        """Persist supplied account values, retaining omitted values."""
        old = self.load_account()
        initial = (
            old.initial_capital
            if initial_capital is None
            else _decimal(initial_capital, "initial_capital")
        )
        current = (
            old.current_capital
            if current_capital is None
            else _decimal(current_capital, "current_capital")
        )
        pnl = old.total_pnl if total_pnl is None else _decimal(total_pnl, "total_pnl")
        if initial <= 0 or current < 0:
            raise ValueError("起始资金必须大于 0，当前总额不能小于 0")

        with self._lock, self._connection:
            cursor = self._connection.execute(
                """
                UPDATE accounts
                SET initial_capital = ?, current_capital = ?, total_pnl = ?,
                    update_time = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (float(initial), float(current), float(pnl), self.account_id),
            )
            if cursor.rowcount != 1:
                raise AccountNotFoundError(f"账户 {self.account_id} 不存在")
        return self.load_account()

    def update_current_capital(
        self, current_capital: Decimal | int | float | str
    ) -> AccountData:
        """Update marked-to-market equity and derive cumulative P&L."""
        current = _decimal(current_capital, "current_capital")
        account = self.load_account()
        return self.save_account(
            current_capital=current,
            total_pnl=current - account.initial_capital,
        )

    def _resolve_sector(self, stock_code: str, sector: str | None) -> str:
        if sector and sector.strip():
            return sector.strip()
        return self._sector_mapping.get(stock_code, "未分类")

    def sync_trade(
        self,
        command: str | Trade,
        *,
        sector: str | None = None,
    ) -> dict[str, Any]:
        """Atomically synchronize one executed trade and return risk warnings."""
        if isinstance(command, Trade):
            trade = command
            resolved_sector = self._resolve_sector(trade.stock_code, sector or trade.sector)
            trade = Trade(
                trade.side,
                trade.stock_code,
                trade.price,
                trade.quantity,
                resolved_sector,
            )
        else:
            match = _TRADE_PATTERN.fullmatch(command) if isinstance(command, str) else None
            stock_code = match.group(2) if match else ""
            trade = self.parse_trade(
                command,
                sector=self._resolve_sector(stock_code, sector),
            )

        with self._lock:
            try:
                self._connection.execute("BEGIN IMMEDIATE")
                row = self._connection.execute(
                    """
                    SELECT quantity, avg_cost FROM positions
                    WHERE account_id = ? AND stock_code = ?
                    """,
                    (self.account_id, trade.stock_code),
                ).fetchone()
                old_quantity = int(row["quantity"]) if row else 0
                old_avg_cost = _decimal(row["avg_cost"], "avg_cost") if row else Decimal(0)

                if trade.side == "sell" and trade.quantity > old_quantity:
                    raise InvalidTradeError(
                        f"{trade.stock_code} 可卖数量不足："
                        f"持仓 {old_quantity}，卖出 {trade.quantity}"
                    )

                if trade.side == "buy":
                    new_quantity = old_quantity + trade.quantity
                    new_avg_cost = (
                        old_avg_cost * old_quantity + trade.amount
                    ) / new_quantity
                else:
                    new_quantity = old_quantity - trade.quantity
                    new_avg_cost = old_avg_cost if new_quantity else Decimal(0)

                if new_quantity:
                    self._connection.execute(
                        """
                        INSERT INTO positions
                            (account_id, stock_code, sector, quantity, avg_cost,
                             last_price, update_time)
                        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(account_id, stock_code) DO UPDATE SET
                            sector = excluded.sector,
                            quantity = excluded.quantity,
                            avg_cost = excluded.avg_cost,
                            last_price = excluded.last_price,
                            update_time = CURRENT_TIMESTAMP
                        """,
                        (
                            self.account_id,
                            trade.stock_code,
                            trade.sector,
                            new_quantity,
                            float(new_avg_cost),
                            float(trade.price),
                        ),
                    )
                else:
                    self._connection.execute(
                        "DELETE FROM positions WHERE account_id = ? AND stock_code = ?",
                        (self.account_id, trade.stock_code),
                    )

                cursor = self._connection.execute(
                    """
                    INSERT INTO trades
                        (account_id, side, stock_code, sector, price, quantity, amount)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        self.account_id,
                        trade.side,
                        trade.stock_code,
                        trade.sector,
                        float(trade.price),
                        trade.quantity,
                        float(trade.amount),
                    ),
                )
                snapshot = self._position_snapshot(self._connection)
                self._connection.commit()
            except Exception:
                self._connection.rollback()
                raise

        violations = self._evaluate_risk(snapshot)
        return {
            "trade_id": cursor.lastrowid,
            "trade": trade.to_dict(),
            "positions": snapshot,
            "violations": [item.to_dict() for item in violations],
            "passed": not violations,
        }

    def _position_snapshot(
        self, connection: sqlite3.Connection
    ) -> dict[str, Any]:
        account_row = connection.execute(
            "SELECT current_capital FROM accounts WHERE id = ?", (self.account_id,)
        ).fetchone()
        if account_row is None:
            raise AccountNotFoundError(f"账户 {self.account_id} 不存在")
        capital = _decimal(account_row["current_capital"], "current_capital")
        rows = connection.execute(
            """
            SELECT stock_code, sector, quantity, avg_cost, last_price
            FROM positions WHERE account_id = ? ORDER BY stock_code
            """,
            (self.account_id,),
        ).fetchall()

        positions: list[dict[str, Any]] = []
        sector_values: dict[str, Decimal] = {}
        total_market_value = Decimal(0)
        for row in rows:
            quantity = int(row["quantity"])
            price = _decimal(row["last_price"], "last_price")
            market_value = price * quantity
            total_market_value += market_value
            sector_values[row["sector"]] = (
                sector_values.get(row["sector"], Decimal(0)) + market_value
            )
            positions.append(
                {
                    "stock_code": row["stock_code"],
                    "sector": row["sector"],
                    "quantity": quantity,
                    "avg_cost": _decimal(row["avg_cost"], "avg_cost"),
                    "last_price": price,
                    "market_value": market_value,
                    "position_ratio": (
                        market_value / capital if capital else Decimal(0)
                    ),
                }
            )

        return {
            "current_capital": capital,
            "positions": positions,
            "sector_values": sector_values,
            "total_market_value": total_market_value,
            "total_position_ratio": (
                total_market_value / capital if capital else Decimal(0)
            ),
            "cash": capital - total_market_value,
            "cash_ratio": (
                (capital - total_market_value) / capital if capital else Decimal(0)
            ),
        }

    def calculate_positions(self) -> dict[str, Any]:
        """Return real-time stock, sector, total-position, and cash figures."""
        with self._lock:
            return self._position_snapshot(self._connection)

    def _evaluate_risk(self, snapshot: dict[str, Any]) -> list[RiskViolation]:
        capital: Decimal = snapshot["current_capital"]
        violations: list[RiskViolation] = []
        single_limit = capital * SINGLE_STOCK_LIMIT
        sector_limit = capital * SECTOR_LIMIT
        total_limit = capital * TOTAL_POSITION_LIMIT
        cash_limit = capital * CASH_FLOOR

        for position in snapshot["positions"]:
            value = position["market_value"]
            if value > single_limit:
                violations.append(
                    RiskViolation(
                        "single_stock",
                        value,
                        single_limit,
                        f"{position['stock_code']} 单票仓位超过 25% 红线",
                        stock_code=position["stock_code"],
                    )
                )
        for sector, value in snapshot["sector_values"].items():
            if value > sector_limit:
                violations.append(
                    RiskViolation(
                        "sector",
                        value,
                        sector_limit,
                        f"{sector} 板块仓位超过 30% 红线",
                        sector=sector,
                    )
                )
        if snapshot["total_market_value"] > total_limit:
            violations.append(
                RiskViolation(
                    "total_position",
                    snapshot["total_market_value"],
                    total_limit,
                    "总仓位超过 60% 红线",
                )
            )
        if snapshot["cash"] < cash_limit:
            violations.append(
                RiskViolation(
                    "cash_floor",
                    snapshot["cash"],
                    cash_limit,
                    "现金低于 40% 底线",
                )
            )
        return violations

    def check_risk_limits(self) -> list[dict[str, Any]]:
        return [
            violation.to_dict()
            for violation in self._evaluate_risk(self.calculate_positions())
        ]

    def check_single_stock_limit(self, stock_code: str) -> bool:
        return not any(
            item["rule"] == "single_stock" and item["stock_code"] == stock_code
            for item in self.check_risk_limits()
        )

    def check_sector_limit(self, sector: str) -> bool:
        return not any(
            item["rule"] == "sector" and item["sector"] == sector
            for item in self.check_risk_limits()
        )

    def check_total_position_limit(self) -> bool:
        return not any(
            item["rule"] == "total_position" for item in self.check_risk_limits()
        )

    def check_cash_floor(self) -> bool:
        return not any(item["rule"] == "cash_floor" for item in self.check_risk_limits())

    def sync_pending_trades(
        self, commands: str | Trade | Iterable[str | Trade]
    ) -> list[dict[str, Any]]:
        """Synchronize a batch obtained during one five-second polling cycle."""
        if isinstance(commands, (str, Trade)):
            commands = [commands]
        return [self.sync_trade(command) for command in commands]

    def start_trade_sync(
        self,
        source: Callable[[], str | Trade | Iterable[str | Trade] | None],
        *,
        on_result: Callable[[dict[str, Any]], None] | None = None,
        interval_seconds: float = DEFAULT_SYNC_INTERVAL_SECONDS,
    ) -> None:
        """Start a daemon that polls ``source`` every five seconds by default."""
        if interval_seconds <= 0:
            raise ValueError("interval_seconds 必须大于 0")
        with self._lock:
            if self._sync_thread and self._sync_thread.is_alive():
                raise RuntimeError("交易同步任务已启动")
            self._stop_event.clear()
            self.last_sync_error = None

            def worker() -> None:
                while not self._stop_event.wait(interval_seconds):
                    try:
                        pending = source()
                        if pending is None:
                            continue
                        for result in self.sync_pending_trades(pending):
                            if on_result:
                                on_result(result)
                    except Exception as exc:  # polling must survive transient errors
                        self.last_sync_error = exc

            self._sync_thread = threading.Thread(
                target=worker,
                name="account-trade-sync",
                daemon=True,
            )
            self._sync_thread.start()

    def stop_trade_sync(self, timeout: float | None = None) -> None:
        self._stop_event.set()
        thread = self._sync_thread
        if thread and thread is not threading.current_thread():
            thread.join(timeout)

    def list_trades(self, *, limit: int = 100) -> list[dict[str, Any]]:
        if limit <= 0:
            raise ValueError("limit 必须大于 0")
        with self._lock:
            rows = self._connection.execute(
                """
                SELECT id, side, stock_code, sector, price, quantity, amount,
                       trade_time
                FROM trades WHERE account_id = ?
                ORDER BY id DESC LIMIT ?
                """,
                (self.account_id, limit),
            ).fetchall()
        return [
            {
                **dict(row),
                "price": _decimal(row["price"], "price"),
                "amount": _decimal(row["amount"], "amount"),
            }
            for row in rows
        ]

    def close(self) -> None:
        self.stop_trade_sync(timeout=2)
        with self._lock:
            self._connection.close()

    def __enter__(self) -> "AccountEngine":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()


__all__ = [
    "AccountData",
    "AccountEngine",
    "AccountEngineError",
    "AccountNotFoundError",
    "CASH_FLOOR",
    "DEFAULT_CAPITAL",
    "DEFAULT_SYNC_INTERVAL_SECONDS",
    "InvalidTradeError",
    "RiskViolation",
    "SECTOR_LIMIT",
    "SINGLE_STOCK_LIMIT",
    "TOTAL_POSITION_LIMIT",
    "Trade",
]
