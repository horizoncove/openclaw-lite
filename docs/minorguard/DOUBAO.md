# 豆包 / 火山方舟接入说明

版本：与 `apps/minorguard-api@0.5.0-doubao` 对齐

MinorGuard 通过 **OpenAI 兼容** 的 `POST {base}/chat/completions` 调用豆包（火山方舟 ModelArk）。未配置密钥时自动回退本地规则，不影响分析接口可用性。

## 1. 控制台准备

1. 打开 [火山方舟 / ModelArk](https://console.volcengine.com/ark)
2. **API Key 管理** → 创建密钥（只显示一次，勿入库）
3. **在线推理 / 推理接入点** → 创建接入点，复制 **Endpoint ID**（形如 `ep-xxxxxxxx`）
4. `model` 字段必须填 Endpoint ID，不要填控制台展示名

## 2. 环境变量

```bash
# apps/minorguard-api/.env
LLM_PROVIDER=doubao          # 或 auto（有豆包 Key 时优先）
CLOUD_LLM_ENABLED=true
DOUBAO_API_KEY=sk-xxxx       # 或 ARK_API_KEY
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=ep-xxxx         # 或 DOUBAO_ENDPOINT / ARK_ENDPOINT
```

| 变量 | 说明 |
|---|---|
| `LLM_PROVIDER` | `auto` / `doubao` / `deepseek` / `openai_compatible` / `none` |
| `DOUBAO_API_KEY` / `ARK_API_KEY` | Bearer Token |
| `DOUBAO_MODEL` | 推理接入点 ID |
| `LLM_JSON_MODE` | 默认 true；若方舟拒绝 `response_format`，客户端会自动重试无 JSON mode |

## 3. 请求契约（方舟侧）

```http
POST https://ark.cn-beijing.volces.com/api/v3/chat/completions
Authorization: Bearer <ARK_API_KEY>
Content-Type: application/json

{
  "model": "ep-xxxx",
  "temperature": 0.2,
  "messages": [
    {"role":"system","content":"..."},
    {"role":"user","content":"..."}
  ]
}
```

MinorGuard 用途：

- **风险分析**：要求模型只输出 JSON（`analyzeRiskWithLlm`）
- **安全回复**：普通文本（`generateSafeReplyWithLlm`）；高风险走本地快路径拒答

## 4. 验证

```bash
cd apps/minorguard-api
npm run doubao:smoke          # 默认 mock 方舟，验证接线
# 实调：
DOUBAO_SMOKE_LIVE=1 DOUBAO_API_KEY=sk-... DOUBAO_MODEL=ep-... npm run doubao:smoke
curl -s http://127.0.0.1:5178/api/v1/health | jq .llm
```

健康检查期望：

```json
{
  "llm": {
    "provider": "doubao",
    "enabled": true,
    "model": "ep-xxxx",
    "reason": "ok"
  }
}
```

联调页：`/docs/doubao.html`

## 5. 回退与安全

- 超时 / HTTP 错误 → 自动回退本地规则，响应 `provider=local`，`note` 含失败原因
- Key 不得提交 Git；生产建议 App 后端持有 MinorGuard Token，云 LLM Key 仅在 MinorGuard 进程环境
- 勿把真实未成年人对话明文送入云模型做训练；分析提示已要求脱敏摘要
