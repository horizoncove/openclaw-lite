"""Secure Tushare configuration and permission diagnostics."""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict, dataclass
from datetime import date, timedelta
from typing import Any, Iterable

from dotenv import load_dotenv


DEFAULT_TOKEN_ENV = "TUSHARE_TOKEN"


class TushareConfigurationError(RuntimeError):
    """Raised when Tushare credentials are missing or invalid."""


@dataclass(frozen=True)
class EndpointStatus:
    endpoint: str
    required: bool
    status: str
    rows: int
    message: str


@dataclass(frozen=True)
class TushareDiagnostic:
    token_env: str
    token_configured: bool
    reference_trade_date: str
    endpoints: tuple[EndpointStatus, ...]

    @property
    def ready(self) -> bool:
        return self.token_configured and all(
            item.status == "ok"
            for item in self.endpoints
            if item.required
        )

    def to_dict(self) -> dict[str, object]:
        payload = asdict(self)
        payload["ready"] = self.ready
        return payload


def create_tushare_client(
    *,
    token_env: str = DEFAULT_TOKEN_ENV,
    load_dotenv_file: bool = True,
) -> Any:
    """Create a Pro client without ever logging or persisting its token."""
    if load_dotenv_file:
        load_dotenv()
    token = os.environ.get(token_env, "").strip()
    if not token:
        raise TushareConfigurationError(
            f"缺少环境变量 {token_env}；请在 Cursor Secrets 或本机 .env 中配置"
        )
    try:
        import tushare as ts
    except ImportError as exc:
        raise TushareConfigurationError(
            "未安装 tushare；请执行 pip install -r requirements.txt"
        ) from exc
    return ts.pro_api(token)


def diagnose_permissions(
    client: Any,
    *,
    required_endpoints: Iterable[str] = (
        "limit_list_d",
        "moneyflow",
        "stk_auction",
    ),
    today: date | None = None,
) -> TushareDiagnostic:
    required = set(required_endpoints)
    reference_date = _last_closed_trade_date(client, today=today)
    checks = (
        (
            "limit_list_d",
            lambda: client.limit_list_d(
                trade_date=reference_date,
                limit_type="U",
                fields=(
                    "trade_date,ts_code,name,industry,close,pct_chg,"
                    "float_mv,turnover_ratio,fd_amount,first_time,last_time,"
                    "open_times,limit_times,limit"
                ),
            ),
        ),
        (
            "moneyflow",
            lambda: client.moneyflow(
                trade_date=reference_date,
                fields=(
                    "trade_date,ts_code,buy_lg_amount,sell_lg_amount,"
                    "buy_elg_amount,sell_elg_amount,net_mf_amount"
                ),
            ),
        ),
        (
            "stk_auction",
            lambda: client.stk_auction(
                trade_date=reference_date,
                fields=(
                    "trade_date,ts_code,vol,price,amount,pre_close,"
                    "turnover_rate,volume_ratio,float_share"
                ),
            ),
        ),
    )
    statuses = tuple(
        _check_endpoint(name, callback, name in required)
        for name, callback in checks
    )
    return TushareDiagnostic(
        token_env=DEFAULT_TOKEN_ENV,
        token_configured=True,
        reference_trade_date=reference_date,
        endpoints=statuses,
    )


def _last_closed_trade_date(
    client: Any, *, today: date | None = None
) -> str:
    today = today or date.today()
    # Use yesterday or earlier so the diagnostic never mistakes an intraday
    # partial response for a permission failure.
    end_date = today - timedelta(days=1)
    start_date = end_date - timedelta(days=30)
    try:
        calendar = client.trade_cal(
            exchange="SSE",
            start_date=start_date.strftime("%Y%m%d"),
            end_date=end_date.strftime("%Y%m%d"),
            is_open="1",
            fields="cal_date,is_open",
        )
    except Exception as exc:
        raise TushareConfigurationError(
            f"Tushare Token 或基础接口验证失败: {_safe_error(exc)}"
        ) from exc
    if calendar is None or calendar.empty or "cal_date" not in calendar:
        raise TushareConfigurationError("交易日历返回为空，无法验证 Token")
    return str(calendar["cal_date"].max())


def _check_endpoint(
    endpoint: str, callback: Any, required: bool
) -> EndpointStatus:
    try:
        frame = callback()
        rows = 0 if frame is None else len(frame)
        status = "ok" if rows > 0 else "empty"
        message = (
            "权限可用"
            if rows > 0
            else "接口可调用但该参考日无数据，请换交易日复核"
        )
    except Exception as exc:
        rows = 0
        status = "error"
        message = _safe_error(exc)
    return EndpointStatus(
        endpoint=endpoint,
        required=required,
        status=status,
        rows=rows,
        message=message,
    )


def _safe_error(exc: Exception) -> str:
    """Return an actionable error while removing accidental token echoes."""
    message = str(exc).replace("\n", " ").strip()
    token = os.environ.get(DEFAULT_TOKEN_ENV, "").strip()
    if token:
        message = message.replace(token, "[REDACTED]")
    return message[:500] or exc.__class__.__name__


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="检查 Tushare Token 与接口权限")
    parser.add_argument(
        "--require",
        default="limit_list_d,moneyflow,stk_auction",
        help="必须通过的接口，逗号分隔",
    )
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    required = tuple(
        item.strip() for item in args.require.split(",") if item.strip()
    )
    try:
        client = create_tushare_client()
        diagnostic = diagnose_permissions(
            client, required_endpoints=required
        )
        print(json.dumps(diagnostic.to_dict(), ensure_ascii=False, indent=2))
        return 0 if diagnostic.ready else 2
    except TushareConfigurationError as exc:
        print(
            json.dumps(
                {
                    "ready": False,
                    "token_env": DEFAULT_TOKEN_ENV,
                    "error": str(exc),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
