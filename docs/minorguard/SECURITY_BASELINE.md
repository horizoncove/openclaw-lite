# 10 · 安全基线

版本：`minorguard-devdocs-v0.1`

## 1. 威胁模型（简版）

| 威胁 | 影响 | P3 缓解 |
|---|---|---|
| 未授权读台账 | 隐私泄露 | Admin Token / strict 模式 |
| 伪造客户端角色 | 越权操作 | 服务端验 Token，不信任前端 |
| 密钥随包分发 | 云资源盗用/账单 | 禁止入库；env 注入；轮换 |
| 提示注入诱使模型输出违规细节 | 有害内容 | 高风险快路径 + 安全 system prompt + 规则兜底 |
| 日志打印原文/Key | 泄露 | 日志脱敏规范 |
| 演示接口公网裸奔 | 数据被清空/投毒 | 默认绑定内网；生产禁 demo_open |

## 2. 密钥与配置

| 变量 | 必需 | 说明 |
|---|---|---|
| `MINORGUARD_ADMIN_TOKEN` | 对外必需 | 台账鉴权 |
| `AUTH_MODE` | 建议 | `demo_open` / `admin_token` / `strict` |
| `AUTH_SECRET` | 若发会话签牌则必需 | HMAC/JWT 签名 |
| `DEEPSEEK_API_KEY` | 可选 | 仅环境注入 |
| `DATABASE_URL` | 可选 | Postgres |
| `CLOUD_LLM_ENABLED` | 可选 | 默认 true；合规场景可 false |
| `CORS_ORIGIN` | 建议生产设置 | 白名单 |

### 禁止

- 将真实 Key 写入 Git、截图、PR 描述、演示 rar
- 在前端 localStorage 存云厂商 API Key
- 使用演示包历史文件名 `DS.env` 作为唯一配置源（Linux 大小写陷阱）；统一 `.env`（gitignore）

### 轮换

发现泄露：立即在供应商控制台作废 → 更新环境变量 → 复查审计与账单 → 记录事件。

## 3. 接口安全最低要求

1. 管理接口鉴权
2. 请求体大小限制（演示包 已有量级，P3 保持/收紧）
3. 基本超时（云调用）
4. 生产关闭或保护 `demo/seed-events` 与清空接口
5. 错误信息不回传堆栈给客户端

## 4. 依赖与供应链

- 锁定 Node ≥ 20
- 定期 `npm audit`（或等价）
- 不引入与能力无关的重型遥测 SDK

## 5. 安全验收（摘自 ACCEPTANCE）

- 无 Token 访问 events → 401
- 仓库扫描无 `sk-` 真钥
- 导出抽检无明文高敏
