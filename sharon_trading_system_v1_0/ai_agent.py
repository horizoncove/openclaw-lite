"""Networked OpenAI-compatible AI agent for Sharon (advisory only)."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable


@dataclass(frozen=True)
class AgentMessage:
    role: str
    content: str


@dataclass(frozen=True)
class AgentReply:
    content: str
    tool_calls: list[dict[str, Any]]
    raw: dict[str, Any]


ToolHandler = Callable[[dict[str, Any]], dict[str, Any]]


SYSTEM_PROMPT = """你是 Sharon 交易系统内嵌的纪律型 AI Agent。
职责：
1. 结合实时行情与账户持仓，给出纪律化交易建议。
2. 可以建议候选股票（2–3 只），但必须说明理由与风险。
3. 绝不代替用户下单，不连接券商，不编造成交。
4. 遵守 A 股纪律：单票≤25%、板块≤30%、总仓≤60%、现金≥40%；
   浮亏 -7% 硬止损；禁买时段 09:30-09:45、14:30-15:00。
5. 选股默认「融合(修订)」：弱市看涨停家数；硬过滤用 SOP v3.1；
   评分=七星主分≥65 + 封板质量附加 − 过热罚分（V31反向正权已移出）。
   手册历史胜率声明须标注“尚未独立验证”，不得当作收益保证。
6. 回答简洁、可执行，优先指出红黄灯风险。
使用中文回答。"""


class OpenAICompatibleAgent:
    """Chat completions client with optional tool-calling loop."""

    def __init__(
        self,
        *,
        base_url: str,
        api_key: str,
        model: str = "deepseek-chat",
        timeout: float = 60.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key.strip()
        self.model = model.strip() or "deepseek-chat"
        self.timeout = timeout
        if not self.base_url:
            raise ValueError("AI Agent base_url 不能为空")
        if not self.api_key:
            raise ValueError("AI Agent API Key 不能为空")

    def chat(
        self,
        messages: list[AgentMessage | dict[str, str]],
        *,
        tools: list[dict[str, Any]] | None = None,
        tool_handlers: dict[str, ToolHandler] | None = None,
        max_tool_rounds: int = 3,
    ) -> AgentReply:
        payload_messages: list[dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        for item in messages:
            if isinstance(item, AgentMessage):
                payload_messages.append(
                    {"role": item.role, "content": item.content}
                )
            else:
                payload_messages.append(item)

        handlers = tool_handlers or {}
        last: dict[str, Any] = {}
        for _ in range(max(1, max_tool_rounds)):
            body: dict[str, Any] = {
                "model": self.model,
                "messages": payload_messages,
                "temperature": 0.3,
            }
            if tools:
                body["tools"] = tools
                body["tool_choice"] = "auto"
            last = self._post_chat(body)
            message = ((last.get("choices") or [{}])[0].get("message")) or {}
            tool_calls = message.get("tool_calls") or []
            content = (message.get("content") or "").strip()
            if not tool_calls or not handlers:
                return AgentReply(content=content, tool_calls=tool_calls, raw=last)

            payload_messages.append(
                {
                    "role": "assistant",
                    "content": message.get("content") or "",
                    "tool_calls": tool_calls,
                }
            )
            for call in tool_calls:
                function = call.get("function") or {}
                name = function.get("name") or ""
                raw_args = function.get("arguments") or "{}"
                try:
                    args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                except json.JSONDecodeError:
                    args = {}
                handler = handlers.get(name)
                if handler is None:
                    result = {"error": f"未知工具：{name}"}
                else:
                    try:
                        result = handler(args if isinstance(args, dict) else {})
                    except Exception as exc:  # noqa: BLE001 - surface to model
                        result = {"error": str(exc)}
                payload_messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.get("id") or name,
                        "content": json.dumps(result, ensure_ascii=False),
                    }
                )
        message = ((last.get("choices") or [{}])[0].get("message")) or {}
        return AgentReply(
            content=(message.get("content") or "").strip(),
            tool_calls=message.get("tool_calls") or [],
            raw=last,
        )

    def _post_chat(self, body: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        request = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
                "User-Agent": "SharonTradingSystem/1.0",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"AI Agent HTTP {exc.code}：{detail[:400]}"
            ) from exc
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"AI Agent 请求失败：{exc}") from exc


def sharon_tool_specs() -> list[dict[str, Any]]:
    return [
        {
            "type": "function",
            "function": {
                "name": "get_market_quotes",
                "description": "获取股票最新行情（实时或近实时）",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "stock_codes": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "6 位 A 股代码列表",
                        }
                    },
                    "required": ["stock_codes"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_account_snapshot",
                "description": "读取当前账户资金、持仓与风险摘要",
                "parameters": {"type": "object", "properties": {}},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "list_candidates",
                "description": "列出当前外部/Agent 候选池",
                "parameters": {"type": "object", "properties": {}},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "propose_candidates",
                "description": "把 1–3 只候选股票写入 Sharon 候选池（会替换超额席位需用户归档）",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "candidates": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "stock_code": {"type": "string"},
                                    "stock_name": {"type": "string"},
                                    "sector": {"type": "string"},
                                    "external_score": {"type": "number"},
                                    "selection_reason": {"type": "string"},
                                },
                                "required": [
                                    "stock_code",
                                    "stock_name",
                                    "sector",
                                    "selection_reason",
                                ],
                            },
                        }
                    },
                    "required": ["candidates"],
                },
            },
        },
    ]


__all__ = [
    "AgentMessage",
    "AgentReply",
    "OpenAICompatibleAgent",
    "SYSTEM_PROMPT",
    "sharon_tool_specs",
]
