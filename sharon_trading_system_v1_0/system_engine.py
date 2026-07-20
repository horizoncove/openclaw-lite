"""External candidate pool, discipline, review, task, and trade queue services."""

from __future__ import annotations

import csv
import json
import sqlite3
import threading
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from .account_engine import (
    CASH_FLOOR,
    SECTOR_LIMIT,
    SINGLE_STOCK_LIMIT,
    TOTAL_POSITION_LIMIT,
    AccountEngine,
    Trade,
)


SHANGHAI = ZoneInfo("Asia/Shanghai")

TASKS = (
    ("us_preopen", "美股开盘前哨", "工作日 01:00", True),
    ("error_check", "错题库-每日检查", "工作日 02:00", True),
    ("news_digest", "新闻宵夜", "工作日 03:00", True),
    ("daily_update", "每日自动更新", "每日 04:00", False),
    ("day_summary", "全日总结", "工作日 05:00", True),
    ("us_morning", "美国股市早报", "工作日 08:00", True),
    ("stock_analysis", "今日股票分析", "工作日 09:00", True),
    ("position_reminder", "持仓调整提醒", "工作日 09:15", True),
    ("limit_up_relay", "涨停接力选股", "交易日 15:05", True),
    ("semiconductor_report", "半导体板块日报", "工作日 15:30", True),
    ("daily_review", "纪律每日复盘", "交易日 15:30", True),
)


@dataclass(frozen=True)
class PreflightResult:
    light: str
    reasons: tuple[str, ...]
    projected_stock_ratio: Decimal
    projected_sector_ratio: Decimal
    projected_total_ratio: Decimal
    projected_cash_ratio: Decimal

    @property
    def allowed(self) -> bool:
        return self.light != "red"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class SystemEngine:
    """Auditable local implementation of the PDF's operating framework."""

    def __init__(self, db_path: str | Path) -> None:
        self.db_path = str(db_path)
        if self.db_path != ":memory:":
            Path(self.db_path).expanduser().resolve().parent.mkdir(
                parents=True, exist_ok=True
            )
        self._lock = threading.RLock()
        self._db = sqlite3.connect(
            self.db_path, check_same_thread=False, timeout=30
        )
        self._db.row_factory = sqlite3.Row
        self._db.execute("PRAGMA foreign_keys=ON")
        self._db.execute("PRAGMA busy_timeout=30000")
        self._create_schema()

    def _create_schema(self) -> None:
        with self._lock, self._db:
            self._db.executescript(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version INTEGER PRIMARY KEY,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS trade_intents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    command TEXT NOT NULL,
                    stock_code TEXT NOT NULL,
                    sector TEXT NOT NULL,
                    candidate_id INTEGER,
                    build_stage TEXT NOT NULL,
                    light TEXT NOT NULL,
                    reasons_json TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'validated',
                    override_reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS selected_candidates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    stock_code TEXT NOT NULL,
                    stock_name TEXT NOT NULL DEFAULT '',
                    sector TEXT NOT NULL DEFAULT '未分类',
                    source_ai TEXT NOT NULL,
                    external_score REAL,
                    selection_reason TEXT NOT NULL DEFAULT '',
                    status TEXT NOT NULL DEFAULT 'active',
                    selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    archived_at TIMESTAMP
                );
                CREATE UNIQUE INDEX IF NOT EXISTS
                    idx_selected_candidates_active_code
                ON selected_candidates(stock_code) WHERE status='active';
                CREATE TABLE IF NOT EXISTS trade_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    command TEXT NOT NULL,
                    sector TEXT,
                    status TEXT NOT NULL DEFAULT 'pending',
                    error TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed_at TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS supervision_findings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    level TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    rule_code TEXT NOT NULL,
                    message TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'open',
                    related_type TEXT,
                    related_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS penalties (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    red_count INTEGER NOT NULL,
                    action TEXT NOT NULL,
                    suspended_until TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS daily_reviews (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    review_date TEXT NOT NULL UNIQUE,
                    trade_count INTEGER NOT NULL,
                    red_count INTEGER NOT NULL,
                    yellow_count INTEGER NOT NULL,
                    mindset TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    lessons TEXT NOT NULL,
                    grade TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS decision_journal (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    decision_date TEXT NOT NULL,
                    decision TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS scheduled_tasks (
                    task_key TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    schedule TEXT NOT NULL,
                    enabled INTEGER NOT NULL,
                    last_run TIMESTAMP,
                    last_status TEXT,
                    last_message TEXT
                );
                CREATE TABLE IF NOT EXISTS cash_conditions (
                    condition_key TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    active INTEGER NOT NULL DEFAULT 0,
                    note TEXT NOT NULL DEFAULT '',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            self._ensure_columns(
                "trade_intents",
                {"candidate_id": "INTEGER"},
            )
            self._db.execute(
                "INSERT OR IGNORE INTO schema_migrations(version) VALUES (1)"
            )
            self._db.executemany(
                """
                INSERT OR IGNORE INTO scheduled_tasks
                    (task_key, name, schedule, enabled)
                VALUES (?, ?, ?, ?)
                """,
                [
                    (key, name, schedule, int(enabled))
                    for key, name, schedule, enabled in TASKS
                ],
            )
            self._db.executemany(
                """
                INSERT OR IGNORE INTO cash_conditions(condition_key, name)
                VALUES (?, ?)
                """,
                [
                    (f"cash_{index}", f"强制空仓条件 {index}（待纪律手册定义）")
                    for index in range(1, 6)
                ],
            )

    def _ensure_columns(self, table: str, columns: dict[str, str]) -> None:
        existing = {
            row["name"]
            for row in self._db.execute(f"PRAGMA table_info({table})").fetchall()
        }
        for name, definition in columns.items():
            if name not in existing:
                self._db.execute(
                    f"ALTER TABLE {table} ADD COLUMN {name} {definition}"
                )

    def add_candidate(
        self,
        stock_code: str,
        stock_name: str,
        sector: str,
        *,
        source_ai: str,
        external_score: float | None = None,
        selection_reason: str = "",
    ) -> dict[str, Any]:
        """Record one stock selected by an external AI; never score it locally."""
        if not stock_code.isdigit() or len(stock_code) != 6:
            raise ValueError("股票代码必须是 6 位数字")
        if not source_ai.strip():
            raise ValueError("必须记录选股来源 AI")
        if external_score is not None and not 0 <= external_score <= 100:
            raise ValueError("外部评分必须在 0 到 100 之间")
        with self._lock, self._db:
            existing = self._db.execute(
                """
                SELECT id FROM selected_candidates
                WHERE stock_code=? AND status='active'
                """,
                (stock_code,),
            ).fetchone()
            if existing:
                self._db.execute(
                    """
                    UPDATE selected_candidates SET stock_name=?, sector=?,
                        source_ai=?, external_score=?, selection_reason=?,
                        selected_at=CURRENT_TIMESTAMP
                    WHERE id=?
                    """,
                    (
                        stock_name.strip(),
                        sector.strip() or "未分类",
                        source_ai.strip(),
                        external_score,
                        selection_reason.strip(),
                        existing["id"],
                    ),
                )
                candidate_id = existing["id"]
            else:
                count = self._db.execute(
                    """
                    SELECT COUNT(*) FROM selected_candidates
                    WHERE status='active'
                    """
                ).fetchone()[0]
                if count >= 3:
                    raise ValueError("当前候选池最多只能保留 3 只股票")
                cursor = self._db.execute(
                    """
                    INSERT INTO selected_candidates(stock_code, stock_name,
                        sector, source_ai, external_score, selection_reason)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        stock_code,
                        stock_name.strip(),
                        sector.strip() or "未分类",
                        source_ai.strip(),
                        external_score,
                        selection_reason.strip(),
                    ),
                )
                candidate_id = cursor.lastrowid
        return self.get_candidate(int(candidate_id))

    def get_candidate(self, candidate_id: int) -> dict[str, Any]:
        with self._lock:
            row = self._db.execute(
                "SELECT * FROM selected_candidates WHERE id=?",
                (candidate_id,),
            ).fetchone()
        if row is None:
            raise ValueError("候选股票不存在")
        return dict(row)

    def active_candidate(self, stock_code: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._db.execute(
                """
                SELECT * FROM selected_candidates
                WHERE stock_code=? AND status='active'
                ORDER BY id DESC LIMIT 1
                """,
                (stock_code,),
            ).fetchone()
        return dict(row) if row else None

    def list_candidates(
        self, *, include_archived: bool = False
    ) -> list[dict[str, Any]]:
        query = "SELECT * FROM selected_candidates"
        if not include_archived:
            query += " WHERE status='active'"
        query += " ORDER BY id DESC"
        with self._lock:
            rows = self._db.execute(query).fetchall()
        return [dict(row) for row in rows]

    def archive_candidate(self, candidate_id: int) -> None:
        with self._lock, self._db:
            cursor = self._db.execute(
                """
                UPDATE selected_candidates SET status='archived',
                    archived_at=CURRENT_TIMESTAMP
                WHERE id=? AND status='active'
                """,
                (candidate_id,),
            )
            if cursor.rowcount != 1:
                raise ValueError("候选股票不存在或已归档")

    @staticmethod
    def _restricted_buy_time(at: datetime) -> bool:
        local = at.astimezone(SHANGHAI)
        if local.weekday() >= 5:
            return False
        minutes = local.hour * 60 + local.minute
        return 570 <= minutes < 585 or 870 <= minutes <= 900

    def active_suspension(self, at: datetime | None = None) -> str | None:
        at = at or datetime.now(SHANGHAI)
        with self._lock:
            row = self._db.execute(
                """
                SELECT suspended_until, action FROM penalties
                WHERE suspended_until IS NOT NULL ORDER BY id DESC LIMIT 1
                """
            ).fetchone()
        if row and row["suspended_until"] >= at.date().isoformat():
            return row["action"]
        return None

    def validate_trade_intent(
        self,
        account: AccountEngine,
        command: str,
        *,
        sector: str | None = None,
        candidate_id: int | None = None,
        build_stage: str = "首次25%",
        at: datetime | None = None,
    ) -> PreflightResult:
        trade = account.parse_trade(command, sector or "未分类")
        snapshot = account.calculate_positions()
        capital = snapshot["current_capital"]
        reasons: list[str] = []
        severity = 0  # green=0, yellow=1, red=2
        candidate = (
            self.get_candidate(candidate_id)
            if candidate_id
            else self.active_candidate(trade.stock_code)
        )
        if candidate and (
            candidate["status"] != "active"
            or candidate["stock_code"] != trade.stock_code
        ):
            candidate = None

        if trade.side == "buy":
            if not candidate:
                reasons.append("买入股票必须先由外部 AI 选入当前候选池")
                severity = 2
            if self._restricted_buy_time(at or datetime.now(SHANGHAI)):
                reasons.append("当前处于 09:30-09:45 或 14:30-15:00 禁止开仓时段")
                severity = 2
            suspension = self.active_suspension(at)
            if suspension:
                reasons.append(f"纪律处罚生效中：{suspension}")
                severity = 2
            if any(item["active"] for item in self.list_cash_conditions()):
                reasons.append("当前存在已激活的强制空仓条件")
                severity = 2

        positions = {item["stock_code"]: item for item in snapshot["positions"]}
        current = positions.get(trade.stock_code)
        old_value = current["market_value"] if current else Decimal(0)
        delta = trade.amount if trade.side == "buy" else -trade.amount
        projected_stock = max(Decimal(0), old_value + delta)
        projected_total = max(
            Decimal(0), snapshot["total_market_value"] + delta
        )
        resolved_sector = (
            sector
            or (candidate["sector"] if candidate else None)
            or (current["sector"] if current else "未分类")
        )
        old_sector = snapshot["sector_values"].get(resolved_sector, Decimal(0))
        projected_sector = max(Decimal(0), old_sector + delta)
        projected_cash = capital - projected_total

        stock_ratio = projected_stock / capital
        sector_ratio = projected_sector / capital
        total_ratio = projected_total / capital
        cash_ratio = projected_cash / capital
        if stock_ratio > Decimal("0.30"):
            reasons.append("单票预计仓位超过 30%，红灯禁止")
            severity = 2
        elif stock_ratio > SINGLE_STOCK_LIMIT:
            reasons.append("单票预计仓位超过 25% 但不超过 30%，黄灯")
            severity = max(severity, 1)
        if sector_ratio > SECTOR_LIMIT:
            reasons.append("单板块预计仓位超过 30%")
            severity = 2
        if total_ratio > TOTAL_POSITION_LIMIT:
            reasons.append("总仓位预计超过 60%")
            severity = 2
        if cash_ratio < CASH_FLOOR:
            reasons.append("预计现金低于 40%")
            severity = 2

        if trade.side == "buy":
            if build_stage == "加仓":
                if not current:
                    reasons.append("没有现有持仓，不能使用加仓阶段")
                    severity = 2
                else:
                    gain = trade.price / current["avg_cost"] - 1
                    if gain < Decimal("0.10"):
                        reasons.append("浮盈不足 10%，不允许加仓")
                        severity = 2
                with self._lock:
                    count = self._db.execute(
                        """
                        SELECT COUNT(*) FROM trade_intents
                        WHERE stock_code=? AND build_stage='加仓'
                            AND status IN ('validated', 'executed')
                        """,
                        (trade.stock_code,),
                    ).fetchone()[0]
                if count:
                    reasons.append("每只股票最多加仓一次")
                    severity = 2
            elif build_stage in {"首次25%", "第二次25%", "第三次50%"}:
                stages = ["首次25%", "第二次25%", "第三次50%"]
                with self._lock:
                    completed = self._db.execute(
                        """
                        SELECT COUNT(*) FROM trade_intents
                        WHERE stock_code=? AND build_stage IN
                            ('首次25%', '第二次25%', '第三次50%')
                            AND status IN ('validated', 'executed')
                        """,
                        (trade.stock_code,),
                    ).fetchone()[0]
                expected = stages[min(int(completed), 2)]
                if build_stage != expected:
                    reasons.append(f"三步建仓顺序错误，当前应为：{expected}")
                    severity = 2

        light = ("green", "yellow", "red")[severity]
        if not reasons:
            reasons.append("所有自动纪律检查通过")
        return PreflightResult(
            light,
            tuple(reasons),
            stock_ratio,
            sector_ratio,
            total_ratio,
            cash_ratio,
        )

    def save_trade_intent(
        self,
        command: str,
        stock_code: str,
        sector: str,
        result: PreflightResult,
        *,
        candidate_id: int | None = None,
        build_stage: str,
        override_reason: str = "",
    ) -> int:
        status = "blocked" if result.light == "red" else "validated"
        if result.light == "yellow" and not override_reason.strip():
            status = "needs_override"
        with self._lock, self._db:
            cursor = self._db.execute(
                """
                INSERT INTO trade_intents(command, stock_code, sector,
                    candidate_id, build_stage, light, reasons_json, status,
                    override_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    command,
                    stock_code,
                    sector,
                    candidate_id,
                    build_stage,
                    result.light,
                    json.dumps(result.reasons, ensure_ascii=False),
                    status,
                    override_reason.strip() or None,
                ),
            )
        if result.light == "red":
            self.record_finding(
                "L1", "red", "preflight", "；".join(result.reasons),
                related_type="trade_intent", related_id=cursor.lastrowid
            )
        elif result.light == "yellow":
            self.record_finding(
                "L2", "yellow", "position_warning", "；".join(result.reasons),
                related_type="trade_intent", related_id=cursor.lastrowid
            )
        return int(cursor.lastrowid)

    def enqueue_trade(self, command: str, sector: str | None = None) -> int:
        with self._lock, self._db:
            cursor = self._db.execute(
                "INSERT INTO trade_queue(command, sector) VALUES (?, ?)",
                (command, sector),
            )
        return int(cursor.lastrowid)

    def pending_trades(self) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._db.execute(
                """
                SELECT * FROM trade_queue WHERE status='pending'
                ORDER BY id
                """
            ).fetchall()
        return [dict(row) for row in rows]

    def complete_queued_trade(
        self, queue_id: int, *, error: str | None = None
    ) -> None:
        with self._lock, self._db:
            self._db.execute(
                """
                UPDATE trade_queue SET status=?, error=?,
                    processed_at=CURRENT_TIMESTAMP WHERE id=?
                """,
                ("failed" if error else "processed", error, queue_id),
            )

    def record_execution_result(
        self, result: dict[str, Any], *, related_id: int | None = None
    ) -> None:
        rule_levels = {
            "single_stock": ("L1", "red"),
            "sector": ("L1", "red"),
            "total_position": ("L1", "red"),
            "cash_floor": ("L1", "red"),
        }
        for violation in result["violations"]:
            level, severity = rule_levels[violation["rule"]]
            self.record_finding(
                level,
                severity,
                violation["rule"],
                violation["message"],
                related_type="trade",
                related_id=result["trade_id"],
            )
        trade = result["trade"]
        if trade["side"] == "buy":
            candidate = self.active_candidate(trade["stock_code"])
            if not candidate:
                self.record_finding(
                    "L1",
                    "red",
                    "candidate_pool",
                    f"{trade['stock_code']} 买入时不在外部 AI 当前候选池",
                    related_type="trade",
                    related_id=result["trade_id"],
                )

    def record_finding(
        self,
        level: str,
        severity: str,
        rule_code: str,
        message: str,
        *,
        related_type: str | None = None,
        related_id: int | None = None,
    ) -> int:
        if level not in {"L1", "L2", "L3"}:
            raise ValueError("监督层级必须是 L1、L2 或 L3")
        if severity not in {"red", "yellow", "green"}:
            raise ValueError("告警级别无效")
        with self._lock, self._db:
            cursor = self._db.execute(
                """
                INSERT INTO supervision_findings(level, severity, rule_code,
                    message, related_type, related_id)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    level,
                    severity,
                    rule_code,
                    message,
                    related_type,
                    related_id,
                ),
            )
        if severity == "red":
            self._apply_penalty()
        return int(cursor.lastrowid)

    def _month_counts(self, month: str | None = None) -> tuple[int, int]:
        month = month or datetime.now(SHANGHAI).strftime("%Y-%m")
        with self._lock:
            rows = self._db.execute(
                """
                SELECT severity, COUNT(*) count FROM supervision_findings
                WHERE substr(created_at, 1, 7)=? GROUP BY severity
                """,
                (month,),
            ).fetchall()
        counts = {row["severity"]: row["count"] for row in rows}
        return int(counts.get("red", 0)), int(counts.get("yellow", 0))

    def _apply_penalty(self) -> None:
        red_count, _ = self._month_counts()
        action = "记录违规"
        suspended_until: str | None = None
        today = datetime.now(SHANGHAI).date()
        if red_count >= 5:
            action = "系统必须重构并重新审批"
            suspended_until = (today + timedelta(days=3650)).isoformat()
        elif red_count >= 3:
            action = "暂停交易一周"
            suspended_until = (today + timedelta(days=7)).isoformat()
        elif red_count >= 2:
            action = "暂停交易一天"
            suspended_until = (today + timedelta(days=1)).isoformat()
        with self._lock, self._db:
            self._db.execute(
                """
                INSERT INTO penalties(red_count, action, suspended_until)
                VALUES (?, ?, ?)
                """,
                (red_count, action, suspended_until),
            )

    def monthly_grade(self, month: str | None = None) -> dict[str, Any]:
        red, yellow = self._month_counts(month)
        score = max(0, 100 - 20 * red - 5 * yellow)
        grade = "A" if score >= 90 else "B" if score >= 80 else "C" if score >= 70 else "D"
        if red and grade in {"A", "B"}:
            grade = "C"
        if red >= 2:
            grade = "D"
        return {"grade": grade, "score": score, "red": red, "yellow": yellow}

    def list_findings(self, limit: int = 200) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._db.execute(
                """
                SELECT * FROM supervision_findings
                ORDER BY id DESC LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def position_discipline_signals(
        self,
        account: AccountEngine,
        *,
        ma5_by_code: dict[str, Decimal] | None = None,
    ) -> list[dict[str, Any]]:
        """Evaluate the -7%, +15%, +25%, and MA5 exit disciplines."""
        signals: list[dict[str, Any]] = []
        ma5_by_code = ma5_by_code or {}
        for item in account.calculate_positions()["positions"]:
            if not item["avg_cost"]:
                continue
            gain = item["last_price"] / item["avg_cost"] - 1
            if gain <= Decimal("-0.07"):
                signals.append(
                    {
                        "severity": "red",
                        "rule": "stop_loss",
                        "stock_code": item["stock_code"],
                        "message": f"浮亏 {gain:.2%}，触发 -7% 硬止损，必须清仓",
                    }
                )
            elif gain >= Decimal("0.25"):
                signals.append(
                    {
                        "severity": "yellow",
                        "rule": "take_profit_25",
                        "stock_code": item["stock_code"],
                        "message": f"浮盈 {gain:.2%}，触发 +25% 第二次减仓 1/3",
                    }
                )
            elif gain >= Decimal("0.15"):
                signals.append(
                    {
                        "severity": "yellow",
                        "rule": "take_profit_15",
                        "stock_code": item["stock_code"],
                        "message": f"浮盈 {gain:.2%}，触发 +15% 第一次减仓 1/3",
                    }
                )
            ma5 = ma5_by_code.get(item["stock_code"])
            if ma5 is not None and item["last_price"] < ma5:
                signals.append(
                    {
                        "severity": "red",
                        "rule": "ma5_exit",
                        "stock_code": item["stock_code"],
                        "message": "最新价跌破手工提供的 5 日均线，触发清仓",
                    }
                )
        return signals

    def list_cash_conditions(self) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._db.execute(
                "SELECT * FROM cash_conditions ORDER BY condition_key"
            ).fetchall()
        return [dict(row) for row in rows]

    def set_cash_condition(
        self, condition_key: str, active: bool, note: str = ""
    ) -> None:
        with self._lock, self._db:
            cursor = self._db.execute(
                """
                UPDATE cash_conditions SET active=?, note=?,
                    updated_at=CURRENT_TIMESTAMP WHERE condition_key=?
                """,
                (int(active), note.strip(), condition_key),
            )
            if cursor.rowcount != 1:
                raise ValueError("强制空仓条件不存在")

    def create_daily_review(
        self,
        *,
        review_date: str,
        mindset: str,
        summary: str,
        lessons: str,
    ) -> dict[str, Any]:
        with self._lock:
            trade_count = self._db.execute(
                "SELECT COUNT(*) FROM trades WHERE date(trade_time)=?",
                (review_date,),
            ).fetchone()[0]
            counts = self._db.execute(
                """
                SELECT severity, COUNT(*) count FROM supervision_findings
                WHERE date(created_at)=? GROUP BY severity
                """,
                (review_date,),
            ).fetchall()
        severity_counts = {row["severity"]: row["count"] for row in counts}
        red = int(severity_counts.get("red", 0))
        yellow = int(severity_counts.get("yellow", 0))
        score = max(0, 100 - red * 20 - yellow * 5)
        grade = "A" if score >= 90 else "B" if score >= 80 else "C" if score >= 70 else "D"
        with self._lock, self._db:
            self._db.execute(
                """
                INSERT INTO daily_reviews(review_date, trade_count, red_count,
                    yellow_count, mindset, summary, lessons, grade)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(review_date) DO UPDATE SET
                    trade_count=excluded.trade_count,
                    red_count=excluded.red_count,
                    yellow_count=excluded.yellow_count,
                    mindset=excluded.mindset,
                    summary=excluded.summary,
                    lessons=excluded.lessons,
                    grade=excluded.grade,
                    created_at=CURRENT_TIMESTAMP
                """,
                (
                    review_date,
                    trade_count,
                    red,
                    yellow,
                    mindset,
                    summary.strip(),
                    lessons.strip(),
                    grade,
                ),
            )
            row = self._db.execute(
                "SELECT * FROM daily_reviews WHERE review_date=?",
                (review_date,),
            ).fetchone()
        return dict(row)

    def list_reviews(self, limit: int = 100) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._db.execute(
                "SELECT * FROM daily_reviews ORDER BY review_date DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def record_decision(self, decision: str, reason: str) -> None:
        with self._lock, self._db:
            self._db.execute(
                """
                INSERT INTO decision_journal(decision_date, decision, reason)
                VALUES (?, ?, ?)
                """,
                (datetime.now(SHANGHAI).date().isoformat(), decision, reason),
            )

    def list_tasks(self) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._db.execute(
                "SELECT * FROM scheduled_tasks ORDER BY rowid"
            ).fetchall()
        return [dict(row) for row in rows]

    def run_task(self, task_key: str) -> None:
        with self._lock, self._db:
            row = self._db.execute(
                "SELECT enabled FROM scheduled_tasks WHERE task_key=?",
                (task_key,),
            ).fetchone()
            if row is None:
                raise ValueError("任务不存在")
            if not row["enabled"]:
                raise ValueError("任务已禁用")
            self._db.execute(
                """
                UPDATE scheduled_tasks SET last_run=CURRENT_TIMESTAMP,
                    last_status='success', last_message='桌面端手动执行完成'
                WHERE task_key=?
                """,
                (task_key,),
            )

    def export_csv(self, directory: str | Path, account: AccountEngine) -> list[Path]:
        target = Path(directory)
        target.mkdir(parents=True, exist_ok=True)
        account_path = target / "account.csv"
        trades_path = target / "recommendations.csv"
        snapshot = account.calculate_positions()
        account_data = account.load_account()
        with account_path.open("w", encoding="utf-8-sig", newline="") as file:
            writer = csv.writer(file)
            writer.writerow(
                [
                    "snapshot_at", "account_id", "initial_capital",
                    "current_equity", "total_pnl", "cash",
                    "total_market_value", "total_position_ratio", "source",
                ]
            )
            writer.writerow(
                [
                    datetime.now(SHANGHAI).isoformat(),
                    account_data.id,
                    account_data.initial_capital,
                    account_data.current_capital,
                    account_data.total_pnl,
                    snapshot["cash"],
                    snapshot["total_market_value"],
                    snapshot["total_position_ratio"],
                    "sqlite_export",
                ]
            )
        trades = account.list_trades(limit=100000)
        with trades_path.open("w", encoding="utf-8-sig", newline="") as file:
            fields = [
                "id", "trade_time", "side", "stock_code", "sector",
                "price", "quantity", "amount",
            ]
            writer = csv.DictWriter(file, fieldnames=fields)
            writer.writeheader()
            for trade in reversed(trades):
                writer.writerow({field: trade[field] for field in fields})
        return [account_path, trades_path]

    def close(self) -> None:
        with self._lock:
            self._db.close()


__all__ = [
    "PreflightResult",
    "SHANGHAI",
    "SystemEngine",
]
