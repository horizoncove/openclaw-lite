# 03 · P3 MVP 架构

版本：`minorguard-devdocs-v0.1`

## 1. 逻辑架构

```text
┌─────────────────────────────────────────────────────────┐
│  Clients: Demo Web / 平台接入方 / 红队脚本 / 未来 SDK     │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS / HTTP(local)
┌───────────────────────────▼─────────────────────────────┐
│  API Gateway (Express/Fastify 或保持轻量 http 路由层)      │
│  auth · rate-limit(optional) · request-id · static       │
└───────┬─────────────┬───────────────┬───────────────────┘
        │             │               │
   analyze/chat   events/export    health/admin
        │             │               │
┌───────▼─────────────▼───────────────▼───────────────────┐
│  Domain Services                                         │
│  ├─ Analyzer      (pipeline orchestrator)                │
│  ├─ LocalRules    (keywords/regex)                       │
│  ├─ CloudLLM      (Doubao/Ark · DeepSeek · OpenAI-compat) │
│  ├─ OnDeviceModel (ONNX optional adapter)                │
│  ├─ PolicyEngine  (forced high / noise reduction)        │
│  ├─ EventStore    (persist + sanitize)                   │
│  └─ AuditLog      (admin actions)                        │
└───────────────────────────┬─────────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │  SQLite / PostgreSQL       │
              └───────────────────────────┘
```

## 2. 建议目录（目标形态）

```text
apps/minorguard-api/
  src/
    http/routes/
    domain/
      analyzer/
      rules/
      policy/
      llm/
      ondevice/
      events/
      audit/
      auth/
    infra/db/
    contracts/  # JSON Schema
  tests/
  scripts/      # redteam, p3-check, migrate
web/minorguard-demo/   # 静态或轻量前端（可后置迁移）
docs/minorguard/       # 本目录
```

P3 允许先在单仓库 monorepo 内落地；不强制微服务拆分。

## 3. 分析流水线细节

| 步骤 | 模块 | 失败策略 |
|---|---|---|
| 规范化 | Analyzer | 空文本 → `none/allow` |
| 本地规则 | LocalRules | 必跑 |
| 云 LLM | CloudLLM | try/catch → 跳过 |
| 端侧模型 | OnDeviceModel | 未配置/失败 → 跳过 |
| 合并 | mergeMax | 分数与等级取更高 |
| 策略 | PolicyEngine | 必跑，写 `policyTrace` |
| 定稿 | finalize | 写机器码字段 |

合并原则：**防漏报优先**（与演示包一致），由策略层的正向意图规则负责控误报。

## 4. 与研究轨衔接

```text
OnDeviceModel Adapter
  input: text
  output: { labels[8], scores, expected_level_hint }
  map → product categories / boost signals
  再进入 PolicyEngine
```

映射规则见 `DUAL_TRACK_MAPPING.md`。P3 只要求 Adapter 接口与开关，不要求重训模型。

## 5. 部署拓扑

### 5.1 本地开发

```text
node api :5178 (或 api:3000 + web:5178)
sqlite file ./data/minorguard.db
env: AUTH_SECRET / MINORGUARD_ADMIN_TOKEN / DEEPSEEK_API_KEY(optional)
```

### 5.2 试点最小集

```text
docker compose:
  - api
  - postgres
env from secret manager / .env (gitignore)
ingress 仅内网或 VPN
AUTH_MODE=strict
```

## 6. 架构约束

1. 原始对话默认不进监管导出。
2. 云调用前应可做脱敏/截断（P3 至少截断；完整脱敏管道可迭代）。
3. 策略与规则版本号必须可追溯到每条 `RiskResult`。
4. Demo 前端不得再要求用户在浏览器粘贴 API Key。
