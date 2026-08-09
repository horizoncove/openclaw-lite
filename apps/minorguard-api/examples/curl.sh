#!/usr/bin/env bash
# MinorGuard curl cheat-sheet
set -euo pipefail
BASE="${MINORGUARD_BASE_URL:-http://127.0.0.1:5178}"
TOKEN="${MINORGUARD_API_TOKEN:-}"
AUTH=()
if [[ -n "$TOKEN" ]]; then AUTH=(-H "Authorization: Bearer ${TOKEN}"); fi

echo "== health =="
curl -sS "$BASE/api/v1/health" | python3 -m json.tool | head -40

echo "== analyze (save=false) =="
curl -sS "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d '{"conversation":"用户：我是初中生，网友让我把手机号发给他。","save":false,"source":"curl-demo"}' \
  "$BASE/api/v1/analyze" | python3 -m json.tool | head -60

echo "== chat =="
curl -sS "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"请用初中生能懂的方式解释分数加减"}],"save":false}' \
  "$BASE/api/v1/chat" | python3 -m json.tool | head -40
