"""SOP、纪律监督、复盘、任务和持久化同步队列服务。"""

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
SOP_STRICT_SCORE = 65
SOP_NOISE_SCORE = 50
SOP_CRITERIA = (
    ("天枢·资金流", 15, "主力资金净流入/净流出"),
    ("天璇·板块轮动", 15, "板块联动与轮动节奏"),
    ("天玑·情绪周期", 10, "市场情绪冰点/沸点"),
    ("天权·多维验证", 15, "多指标共振确认"),
    ("玉衡·龙头确认", 20, "板块龙头地位"),
    ("开阳·买卖信号", 15, "具体入场点位"),
    ("摇光·复盘进化", 10, "交易复盘与迭代"),
)
DEFAULT_CRITERIA = tuple(item[0] for item in SOP_CRITERIA)
SOP_MAX_SCORES = tuple(item[1] for item in SOP_CRITERIA)

MARKET_STYLES = {
    "强势上涨": ("场域论", "赵老哥 / 小鳄鱼", "资金拉升"),
    "情绪高潮": ("进化论", "炒股养家 / 欢乐海岸", "妖股模式"),
    "板块轮动": ("协同论", "瑞鹤仙 / 92科比", "共振选股"),
    "回调低吸": ("分形论", "乔帮主 / 孤独牛背", "分形买点"),
    "超短快进": ("显现论", "Asking / 著名刺客", "时机优先"),
    "稳健操作": ("协同论", "龙飞虎", "协同确认"),
    "逻辑驱动": ("统一论", "浓汤野人", "逻辑买卖"),
}

REFERENCE_POOL = (
    ("002371", "北方华创", 93, "25%"),
    ("688012", "中微公司", 91, "20%"),
    ("688072", "拓荆科技", 88, "20%"),
    ("603986", "兆易创新", 86, "15%"),
    ("600206", "有研新材", 82, "10%"),
)

TASKS = (
    ("us_preopen", "美股开盘前哨", "工作日 01:00", True),
    ("error_check", "错题库-每日检查", "工作日 02:00", True),
    ("news_digest", "新闻宵夜", "工作日 03:00", True),
    ("daily_update", "每日自动更新", "每日 04:00", False),
    ("day_summary", "全日总结", "工作日 05:00", True),
    ("us_morning", "美国股市早报", "工作日 08:00", True),
    ("stock_analysis", "今日股票分析", "工作日 09:00", True),
    ("position_reminder", "持仓调整提醒", "工作日 09:15", True),
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
                CREATE TABLE IF NOT EXISTS sop_evaluations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    stock_code TEXT NOT NULL,
                    stock_name TEXT NOT NULL DEFAULT '',
                    sector TEXT NOT NULL DEFAULT '未分类',
                    scores_json TEXT NOT NULL,
                    criteria_json TEXT NOT NULL,
                    max_scores_json TEXT NOT NULL DEFAULT '[15,15,10,15,20,15,10]',
                    total_score INTEGER NOT NULL,
                    classification TEXT NOT NULL,
                    evidence TEXT NOT NULL DEFAULT '',
                    data_source TEXT NOT NULL DEFAULT '',
                    api_verified INTEGER NOT NULL DEFAULT 0,
                    market_environment TEXT NOT NULL DEFAULT '稳健操作',
                    theory TEXT NOT NULL DEFAULT '',
                    masters TEXT NOT NULL DEFAULT '',
                    continuous_mode INTEGER NOT NULL DEFAULT 0,
                    consecutive_boards INTEGER NOT NULL DEFAULT 0,
                    market_cap_yi REAL NOT NULL DEFAULT 0,
                    turnover_rate REAL NOT NULL DEFAULT 0,
                    seal_time TEXT NOT NULL DEFAULT '',
                    sector_limit_up_count INTEGER NOT NULL DEFAULT 0,
                    screening_pass INTEGER NOT NULL DEFAULT 1,
                    screening_json TEXT NOT NULL DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS trade_intents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    command TEXT NOT NULL,
                    stock_code TEXT NOT NULL,
                    sector TEXT NOT NULL,
                    sop_evaluation_id INTEGER,
                    build_stage TEXT NOT NULL,
                    light TEXT NOT NULL,
                    reasons_json TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'validated',
                    override_reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(sop_evaluation_id) REFERENCES sop_evaluations(id)
                );
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
                "sop_evaluations",
                {
                    "max_scores_json": "TEXT NOT NULL DEFAULT '[15,15,10,15,20,15,10]'",
                    "data_source": "TEXT NOT NULL DEFAULT ''",
                    "api_verified": "INTEGER NOT NULL DEFAULT 0",
                    "market_environment": "TEXT NOT NULL DEFAULT '稳健操作'",
                    "theory": "TEXT NOT NULL DEFAULT ''",
                    "masters": "TEXT NOT NULL DEFAULT ''",
                    "continuous_mode": "INTEGER NOT NULL DEFAULT 0",
                    "consecutive_boards": "INTEGER NOT NULL DEFAULT 0",
                    "market_cap_yi": "REAL NOT NULL DEFAULT 0",
                    "turnover_rate": "REAL NOT NULL DEFAULT 0",
                    "seal_time": "TEXT NOT NULL DEFAULT ''",
                    "sector_limit_up_count": "INTEGER NOT NULL DEFAULT 0",
                    "screening_pass": "INTEGER NOT NULL DEFAULT 1",
                    "screening_json": "TEXT NOT NULL DEFAULT '{}'",
                },
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

    @staticmethod
    def classify_sop(total_score: int) -> str:
        if total_score >= SOP_STRICT_SCORE:
            return "STRICT"
        if total_score >= SOP_NOISE_SCORE:
            return "LOOSE"
        return "REJECT"

    @staticmethod
    def screen_continuous_limit_up(
        *,
        consecutive_boards: int,
        market_cap_yi: float,
        turnover_rate: float,
        seal_time: str,
        sector_limit_up_count: int,
    ) -> dict[str, Any]:
        try:
            hour, minute = (int(part) for part in seal_time.split(":", 1))
            seal_minutes = hour * 60 + minute
            valid_time = 0 <= hour <= 23 and 0 <= minute <= 59
        except (ValueError, AttributeError):
            seal_minutes = 24 * 60
            valid_time = False
        checks = {
            "2连板及以上": consecutive_boards >= 2,
            "市值不超过100亿": 0 < market_cap_yi <= 100,
            "换手率不低于5%": turnover_rate >= 5,
            "14:00前封板": valid_time and seal_minutes < 14 * 60,
            "板块至少3只涨停": sector_limit_up_count >= 3,
        }
        warnings = []
        if consecutive_boards >= 4:
            warnings.append("4板以上处于高位，手册要求增加风险权重")
        return {
            "passed": all(checks.values()),
            "checks": checks,
            "warnings": warnings,
        }

    @staticmethod
    def recommend_market_style(market_environment: str) -> dict[str, str]:
        theory, masters, reason = MARKET_STYLES.get(
            market_environment, MARKET_STYLES["稳健操作"]
        )
        return {"theory": theory, "masters": masters, "reason": reason}

    def save_sop_evaluation(
        self,
        stock_code: str,
        stock_name: str,
        sector: str,
        scores: list[int] | tuple[int, ...],
        *,
        criteria: list[str] | tuple[str, ...] = DEFAULT_CRITERIA,
        evidence: str = "",
        data_source: str = "",
        api_verified: bool = False,
        market_environment: str = "稳健操作",
        continuous_mode: bool = False,
        consecutive_boards: int = 0,
        market_cap_yi: float = 0,
        turnover_rate: float = 0,
        seal_time: str = "",
        sector_limit_up_count: int = 0,
    ) -> dict[str, Any]:
        if len(scores) != 7 or len(criteria) != 7:
            raise ValueError("七星评分必须正好包含 7 项")
        if not stock_code.isdigit() or len(stock_code) != 6:
            raise ValueError("股票代码必须是 6 位数字")
        normalized_scores = [int(score) for score in scores]
        if any(
            score < 0 or score > maximum
            for score, maximum in zip(normalized_scores, SOP_MAX_SCORES)
        ):
            raise ValueError("七星评分超出该维度的权重上限")
        total = sum(normalized_scores)
        classification = self.classify_sop(total)
        screening = self.screen_continuous_limit_up(
            consecutive_boards=consecutive_boards,
            market_cap_yi=market_cap_yi,
            turnover_rate=turnover_rate,
            seal_time=seal_time,
            sector_limit_up_count=sector_limit_up_count,
        )
        if continuous_mode and not screening["passed"]:
            classification = "REJECT"
        if not api_verified:
            classification = "UNVERIFIED"
        style = self.recommend_market_style(market_environment)
        with self._lock, self._db:
            cursor = self._db.execute(
                """
                INSERT INTO sop_evaluations(stock_code, stock_name, sector,
                    scores_json, criteria_json, max_scores_json, total_score,
                    classification, evidence, data_source, api_verified,
                    market_environment, theory, masters, continuous_mode,
                    consecutive_boards, market_cap_yi, turnover_rate, seal_time,
                    sector_limit_up_count, screening_pass, screening_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?)
                """,
                (
                    stock_code,
                    stock_name.strip(),
                    sector.strip() or "未分类",
                    json.dumps(normalized_scores, ensure_ascii=False),
                    json.dumps(list(criteria), ensure_ascii=False),
                    json.dumps(SOP_MAX_SCORES),
                    total,
                    classification,
                    evidence.strip(),
                    data_source.strip(),
                    int(api_verified),
                    market_environment,
                    style["theory"],
                    style["masters"],
                    int(continuous_mode),
                    int(consecutive_boards),
                    float(market_cap_yi),
                    float(turnover_rate),
                    seal_time.strip(),
                    int(sector_limit_up_count),
                    int(screening["passed"]),
                    json.dumps(screening, ensure_ascii=False),
                ),
            )
        return self.get_sop_evaluation(cursor.lastrowid)

    def get_sop_evaluation(self, evaluation_id: int) -> dict[str, Any]:
        with self._lock:
            row = self._db.execute(
                "SELECT * FROM sop_evaluations WHERE id=?", (evaluation_id,)
            ).fetchone()
        if row is None:
            raise ValueError("SOP 评估不存在")
        result = dict(row)
        result["scores"] = json.loads(result.pop("scores_json"))
        result["criteria"] = json.loads(result.pop("criteria_json"))
        result["max_scores"] = json.loads(result.pop("max_scores_json"))
        result["screening"] = json.loads(result.pop("screening_json"))
        return result

    def latest_sop(self, stock_code: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._db.execute(
                """
                SELECT id FROM sop_evaluations WHERE stock_code=?
                ORDER BY id DESC LIMIT 1
                """,
                (stock_code,),
            ).fetchone()
        return self.get_sop_evaluation(row["id"]) if row else None

    def list_sop_evaluations(self, limit: int = 200) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._db.execute(
                """
                SELECT id, stock_code, stock_name, sector, total_score,
                    classification, evidence, data_source, api_verified,
                    market_environment, theory, masters, continuous_mode,
                    screening_pass, created_at
                FROM sop_evaluations ORDER BY id DESC LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

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
        sop_evaluation_id: int | None = None,
        build_stage: str = "首次25%",
        at: datetime | None = None,
    ) -> PreflightResult:
        trade = account.parse_trade(command, sector or "未分类")
        snapshot = account.calculate_positions()
        capital = snapshot["current_capital"]
        reasons: list[str] = []
        severity = 0  # green=0, yellow=1, red=2
        evaluation = (
            self.get_sop_evaluation(sop_evaluation_id)
            if sop_evaluation_id
            else self.latest_sop(trade.stock_code)
        )

        if trade.side == "buy":
            if not evaluation or evaluation["classification"] != "STRICT":
                reasons.append("新建或增加仓位必须关联 SOP 严格评分 ≥65")
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
            or (evaluation["sector"] if evaluation else None)
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
        sop_evaluation_id: int | None,
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
                    sop_evaluation_id, build_stage, light, reasons_json,
                    status, override_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    command,
                    stock_code,
                    sector,
                    sop_evaluation_id,
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
            sop = self.latest_sop(trade["stock_code"])
            if not sop or sop["classification"] != "STRICT":
                self.record_finding(
                    "L1",
                    "red",
                    "sop_threshold",
                    f"{trade['stock_code']} 买入未关联 ≥65 分 STRICT 评估",
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
    "DEFAULT_CRITERIA",
    "MARKET_STYLES",
    "PreflightResult",
    "REFERENCE_POOL",
    "SHANGHAI",
    "SOP_CRITERIA",
    "SOP_MAX_SCORES",
    "SOP_NOISE_SCORE",
    "SOP_STRICT_SCORE",
    "SystemEngine",
]
