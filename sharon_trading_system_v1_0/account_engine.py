"""账户、交易、持仓和风控数据引擎。所有金额均以人民币元计。"""

from __future__ import annotations

import re
import sqlite3
import threading
from collections.abc import Iterable, Mapping
from dataclasses import asdict, dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


DEFAULT_CAPITAL = Decimal("5037200")
SINGLE_STOCK_LIMIT = Decimal("0.25")
SECTOR_LIMIT = Decimal("0.30")
TOTAL_POSITION_LIMIT = Decimal("0.60")
CASH_FLOOR = Decimal("0.40")

_COMMAND_PATTERN = re.compile(
    r"^\s*(买入|卖出|buy|sell)\s+(\d{6})\s+"
    r"(\d+(?:\.\d+)?)\s+([1-9]\d*)\s*$",
    re.IGNORECASE,
)


class AccountEngineError(Exception):
    """账户引擎基础异常。"""


class InvalidTradeError(AccountEngineError, ValueError):
    """交易指令无效。"""


def _money(value: Any, name: str) -> Decimal:
    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"{name}必须是有效数字") from exc
    if not number.is_finite():
        raise ValueError(f"{name}必须是有限数字")
    return number


@dataclass(frozen=True)
class Account:
    id: int
    initial_capital: Decimal
    current_capital: Decimal
    total_pnl: Decimal
    update_time: str


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


class AccountEngine:
    """基于 SQLite 的线程安全单账户数据引擎。"""

    def __init__(
        self,
        db_path: str | Path = "data/sharon_trading.db",
        *,
        account_id: int = 1,
        default_capital: Any = DEFAULT_CAPITAL,
        sector_mapping: Mapping[str, str] | None = None,
    ) -> None:
        self.account_id = account_id
        self.db_path = str(db_path)
        self._sectors = dict(sector_mapping or {})
        self._lock = threading.RLock()
        capital = _money(default_capital, "默认资金")
        if account_id <= 0 or capital <= 0:
            raise ValueError("账户编号和默认资金必须大于 0")
        if self.db_path != ":memory:":
            Path(self.db_path).expanduser().resolve().parent.mkdir(
                parents=True, exist_ok=True
            )
        self._db = sqlite3.connect(
            self.db_path, check_same_thread=False, timeout=30
        )
        self._db.row_factory = sqlite3.Row
        self._db.execute("PRAGMA foreign_keys=ON")
        self._db.execute("PRAGMA busy_timeout=30000")
        if self.db_path != ":memory:":
            self._db.execute("PRAGMA journal_mode=WAL")
        self._create_schema(capital)

    def _create_schema(self, capital: Decimal) -> None:
        with self._lock, self._db:
            self._db.executescript(
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
                    quantity INTEGER NOT NULL CHECK(quantity >= 0),
                    avg_cost REAL NOT NULL CHECK(avg_cost >= 0),
                    last_price REAL NOT NULL CHECK(last_price >= 0),
                    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY(account_id, stock_code),
                    FOREIGN KEY(account_id) REFERENCES accounts(id)
                        ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    account_id INTEGER NOT NULL,
                    side TEXT NOT NULL CHECK(side IN ('buy', 'sell')),
                    stock_code TEXT NOT NULL,
                    sector TEXT NOT NULL,
                    price REAL NOT NULL CHECK(price > 0),
                    quantity INTEGER NOT NULL CHECK(quantity > 0),
                    amount REAL NOT NULL CHECK(amount > 0),
                    trade_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(account_id) REFERENCES accounts(id)
                        ON DELETE CASCADE
                );
                """
            )
            self._db.execute(
                """
                INSERT OR IGNORE INTO accounts
                    (id, initial_capital, current_capital, total_pnl)
                VALUES (?, ?, ?, 0)
                """,
                (self.account_id, float(capital), float(capital)),
            )

    @staticmethod
    def parse_trade(command: str, sector: str = "未分类") -> Trade:
        if not isinstance(command, str):
            raise InvalidTradeError("交易指令必须是字符串")
        match = _COMMAND_PATTERN.fullmatch(command)
        if not match:
            raise InvalidTradeError(
                "格式错误，请输入：买入/卖出 股票代码 价格 数量"
            )
        side, code, price_text, quantity_text = match.groups()
        price = _money(price_text, "价格")
        if price <= 0:
            raise InvalidTradeError("价格必须大于 0")
        normalized_side = "buy" if side.lower() in {"买入", "buy"} else "sell"
        return Trade(
            normalized_side,
            code,
            price,
            int(quantity_text),
            sector.strip() or "未分类",
        )

    def load_account(self) -> Account:
        with self._lock:
            row = self._db.execute(
                "SELECT * FROM accounts WHERE id=?", (self.account_id,)
            ).fetchone()
        if row is None:
            raise AccountEngineError("账户不存在")
        return Account(
            row["id"],
            _money(row["initial_capital"], "起始资金"),
            _money(row["current_capital"], "当前总额"),
            _money(row["total_pnl"] or 0, "累计盈亏"),
            str(row["update_time"]),
        )

    def save_account(
        self,
        *,
        initial_capital: Any | None = None,
        current_capital: Any | None = None,
        total_pnl: Any | None = None,
    ) -> Account:
        old = self.load_account()
        initial = old.initial_capital if initial_capital is None else _money(
            initial_capital, "起始资金"
        )
        current = old.current_capital if current_capital is None else _money(
            current_capital, "当前总额"
        )
        pnl = old.total_pnl if total_pnl is None else _money(total_pnl, "累计盈亏")
        if initial <= 0 or current < 0:
            raise ValueError("起始资金必须大于 0，当前总额不能小于 0")
        with self._lock, self._db:
            self._db.execute(
                """
                UPDATE accounts SET initial_capital=?, current_capital=?,
                    total_pnl=?, update_time=CURRENT_TIMESTAMP WHERE id=?
                """,
                (float(initial), float(current), float(pnl), self.account_id),
            )
        return self.load_account()

    def update_current_capital(self, value: Any) -> Account:
        current = _money(value, "当前总额")
        account = self.load_account()
        return self.save_account(
            current_capital=current,
            total_pnl=current - account.initial_capital,
        )

    def sync_trade(
        self, command: str | Trade, *, sector: str | None = None
    ) -> dict[str, Any]:
        if isinstance(command, Trade):
            trade = command
        else:
            match = _COMMAND_PATTERN.fullmatch(command)
            code = match.group(2) if match else ""
            trade = self.parse_trade(
                command, sector or self._sectors.get(code, "未分类")
            )
        if trade.side not in {"buy", "sell"}:
            raise InvalidTradeError("交易方向只能是 buy 或 sell")
        if trade.price <= 0 or trade.quantity <= 0:
            raise InvalidTradeError("价格和数量必须大于 0")
        resolved_sector = (
            (sector or "").strip()
            or self._sectors.get(trade.stock_code)
            or trade.sector
            or "未分类"
        )
        trade = Trade(
            trade.side,
            trade.stock_code,
            trade.price,
            trade.quantity,
            resolved_sector,
        )

        with self._lock:
            try:
                self._db.execute("BEGIN IMMEDIATE")
                old = self._db.execute(
                    """
                    SELECT quantity, avg_cost FROM positions
                    WHERE account_id=? AND stock_code=?
                    """,
                    (self.account_id, trade.stock_code),
                ).fetchone()
                old_quantity = int(old["quantity"]) if old else 0
                old_cost = _money(old["avg_cost"], "成本") if old else Decimal(0)
                if trade.side == "sell" and trade.quantity > old_quantity:
                    raise InvalidTradeError(
                        f"{trade.stock_code} 可卖 {old_quantity} 股，"
                        f"不能卖出 {trade.quantity} 股"
                    )
                if trade.side == "buy":
                    quantity = old_quantity + trade.quantity
                    avg_cost = (
                        old_cost * old_quantity + trade.amount
                    ) / quantity
                else:
                    quantity = old_quantity - trade.quantity
                    avg_cost = old_cost if quantity else Decimal(0)
                if quantity:
                    self._db.execute(
                        """
                        INSERT INTO positions(account_id, stock_code, sector,
                            quantity, avg_cost, last_price, update_time)
                        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(account_id, stock_code) DO UPDATE SET
                            sector=excluded.sector,
                            quantity=excluded.quantity,
                            avg_cost=excluded.avg_cost,
                            last_price=excluded.last_price,
                            update_time=CURRENT_TIMESTAMP
                        """,
                        (
                            self.account_id,
                            trade.stock_code,
                            trade.sector,
                            quantity,
                            float(avg_cost),
                            float(trade.price),
                        ),
                    )
                else:
                    self._db.execute(
                        """
                        DELETE FROM positions
                        WHERE account_id=? AND stock_code=?
                        """,
                        (self.account_id, trade.stock_code),
                    )
                cursor = self._db.execute(
                    """
                    INSERT INTO trades(account_id, side, stock_code, sector,
                        price, quantity, amount) VALUES (?, ?, ?, ?, ?, ?, ?)
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
                snapshot = self._snapshot()
                self._db.commit()
            except Exception:
                self._db.rollback()
                raise
        violations = self._risk_violations(snapshot)
        return {
            "trade_id": cursor.lastrowid,
            "trade": {**asdict(trade), "amount": trade.amount},
            "positions": snapshot,
            "violations": violations,
            "passed": not violations,
        }

    def sync_pending_trades(
        self, commands: str | Trade | Iterable[str | Trade]
    ) -> list[dict[str, Any]]:
        if isinstance(commands, (str, Trade)):
            commands = [commands]
        return [self.sync_trade(command) for command in commands]

    def _snapshot(self) -> dict[str, Any]:
        account = self.load_account()
        rows = self._db.execute(
            """
            SELECT stock_code, sector, quantity, avg_cost, last_price
            FROM positions WHERE account_id=? ORDER BY stock_code
            """,
            (self.account_id,),
        ).fetchall()
        positions: list[dict[str, Any]] = []
        sectors: dict[str, Decimal] = {}
        total = Decimal(0)
        for row in rows:
            quantity = int(row["quantity"])
            price = _money(row["last_price"], "最新价")
            value = price * quantity
            total += value
            sectors[row["sector"]] = sectors.get(
                row["sector"], Decimal(0)
            ) + value
            positions.append(
                {
                    "stock_code": row["stock_code"],
                    "sector": row["sector"],
                    "quantity": quantity,
                    "avg_cost": _money(row["avg_cost"], "成本"),
                    "last_price": price,
                    "market_value": value,
                    "position_ratio": (
                        value / account.current_capital
                        if account.current_capital
                        else Decimal(0)
                    ),
                }
            )
        cash = account.current_capital - total
        return {
            "current_capital": account.current_capital,
            "positions": positions,
            "sector_values": sectors,
            "total_market_value": total,
            "total_position_ratio": (
                total / account.current_capital
                if account.current_capital
                else Decimal(0)
            ),
            "cash": cash,
            "cash_ratio": (
                cash / account.current_capital
                if account.current_capital
                else Decimal(0)
            ),
        }

    def calculate_positions(self) -> dict[str, Any]:
        with self._lock:
            return self._snapshot()

    @staticmethod
    def _risk_violations(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
        capital = snapshot["current_capital"]
        result: list[dict[str, Any]] = []

        def add(
            rule: str,
            actual: Decimal,
            limit: Decimal,
            message: str,
            **extra: Any,
        ) -> None:
            result.append(
                {
                    "rule": rule,
                    "actual": actual,
                    "limit": limit,
                    "message": message,
                    **extra,
                }
            )

        for item in snapshot["positions"]:
            limit = capital * SINGLE_STOCK_LIMIT
            if item["market_value"] > limit:
                add(
                    "single_stock",
                    item["market_value"],
                    limit,
                    f"{item['stock_code']} 单票仓位超过 25%",
                    stock_code=item["stock_code"],
                )
        for sector, value in snapshot["sector_values"].items():
            limit = capital * SECTOR_LIMIT
            if value > limit:
                add(
                    "sector",
                    value,
                    limit,
                    f"{sector} 板块仓位超过 30%",
                    sector=sector,
                )
        total_limit = capital * TOTAL_POSITION_LIMIT
        if snapshot["total_market_value"] > total_limit:
            add(
                "total_position",
                snapshot["total_market_value"],
                total_limit,
                "总仓位超过 60%",
            )
        cash_limit = capital * CASH_FLOOR
        if snapshot["cash"] < cash_limit:
            add(
                "cash_floor",
                snapshot["cash"],
                cash_limit,
                "现金低于 40% 底线",
            )
        return result

    def check_risk_limits(self) -> list[dict[str, Any]]:
        return self._risk_violations(self.calculate_positions())

    def list_trades(self, limit: int = 100) -> list[dict[str, Any]]:
        if limit <= 0:
            raise ValueError("数量必须大于 0")
        with self._lock:
            rows = self._db.execute(
                """
                SELECT id, side, stock_code, sector, price, quantity, amount,
                    trade_time FROM trades WHERE account_id=?
                ORDER BY id DESC LIMIT ?
                """,
                (self.account_id, limit),
            ).fetchall()
        return [
            {
                **dict(row),
                "price": _money(row["price"], "价格"),
                "amount": _money(row["amount"], "金额"),
            }
            for row in rows
        ]

    def close(self) -> None:
        with self._lock:
            self._db.close()

    def __enter__(self) -> "AccountEngine":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()


__all__ = [
    "Account",
    "AccountEngine",
    "AccountEngineError",
    "CASH_FLOOR",
    "DEFAULT_CAPITAL",
    "InvalidTradeError",
    "SECTOR_LIMIT",
    "SINGLE_STOCK_LIMIT",
    "TOTAL_POSITION_LIMIT",
    "Trade",
]
