#!/usr/bin/env python3
"""Example: Python App backend calling MinorGuard analyze API."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("MINORGUARD_BASE_URL", "http://127.0.0.1:5178").rstrip("/")
TOKEN = os.environ.get("MINORGUARD_API_TOKEN", "")


def api(method: str, path: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.loads(res.read().decode("utf-8"))


def decide(action_code: str) -> dict:
    if action_code == "block_review":
        return {"allow_reply": False, "show_warning": True, "review": True}
    if action_code == "throttle":
        return {"allow_reply": True, "show_warning": True, "limit_follow_up": True}
    if action_code == "observe":
        return {"allow_reply": True, "show_warning": True}
    return {"allow_reply": True, "show_warning": False}


def main() -> None:
    text = " ".join(sys.argv[1:]) or (
        "用户：我是初中生，网友让我把手机号发给他换游戏装备，还说别告诉爸妈。"
    )
    health = api("GET", "/api/v1/health")
    print("health", {k: health.get(k) for k in ("version", "apiAuthRequired", "authMode")})
    risk = api(
        "POST",
        "/api/v1/analyze",
        {"conversation": text, "save": False, "source": "example-python-app"},
    )
    decision = decide(risk.get("actionCode") or "")
    print(
        "risk",
        {
            "levelCode": risk.get("levelCode"),
            "actionCode": risk.get("actionCode"),
            "finalScore": risk.get("finalScore"),
            "summary": risk.get("summary"),
        },
    )
    print("appDecision", decision)
    if not decision["allow_reply"]:
        print("uiReply", "这个问题涉及较高风险，请停止分享敏感信息并告知监护人。")
        return
    print("uiReply", "(此处调用业务大模型)")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as e:
        print("HTTPError", e.code, e.read().decode(), file=sys.stderr)
        raise SystemExit(1)
