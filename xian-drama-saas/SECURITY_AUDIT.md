# 西安微短剧 SaaS · 安全审核报告（localhost:5178）

**范围**：`xian-drama-saas` 前端（Vite:5178）+ API（Express:3001）  
**日期**：2026-08-08  
**方式**：页面走查 + 源码静态审核 + 鉴权加固后的只读验证（无攻击 PoC）

---

## 1. 页面是什么

双门户演示型运营 SaaS：

| 入口 | 路径 | 用途 |
|---|---|---|
| 落地页 | `/` | 联盟 / 五大中心入口 |
| 联盟登录 | `/alliance/login` | 秘书处 / 会员单位角色选择 |
| 联盟控制台 | `/alliance/console/*` | 会员、活动、撮合、工单、KPI |
| 会员门户 | `/alliance/member/*` | 报名、供需、服务申请 |
| 中心登录 | `/center/login` | 五大中心角色选择 |
| 中心控制台 | `/center/console/*` | 审批/出海/发行/版权/AI |

技术栈：React 19 + Vite + Express 5；本地可无 Postgres（JSON 存储）。

---

## 2. 审核前「可破解」结论（Critical）

系统原先是**演示旁路登录**，不是真实身份认证。主要破点：

| ID | 严重度 | 问题 | 影响 |
|---|---|---|---|
| C1 | Critical | 登录只需 `POST {role}`，无密码/访问码 | 任意人一键取得任意角色 |
| C2 | Critical | Token 为明文 `alliance-${role}` / `center-${role}`，服务端**从不校验** | Token 形同虚设 |
| C3 | Critical | 几乎全部 `/api/*`（含 `reset`、写会员）**无 Authorization** | 未登录即可读写/清空数据 |
| C4 | High | 前端路由只看 `localStorage` 用户 JSON | 伪造用户对象即可进控制台 UI |
| C5 | High | API 失败时前端 **catch 仍本地造用户登录成功** | 关后端也能「登录」并改本地态 |
| C6 | Medium | `cors()` 全开放；生产若暴露公网风险放大 | 跨站调用演示 API |
| C7 | Medium | 会员与秘书处分权仅前端跳转 | 会员 token 可打秘书处写接口（加固前） |

> 结论：加固前该站点**不能**作为生产/含真实数据环境使用；适合内网演示，但演示包也不应裸奔写接口。

---

## 3. 已落地修复（本分支）

1. **HMAC-SHA256 签名令牌**（`server/auth.mjs`），含 `exp` / `portal` / `role`
2. **业务 API 全量 `requireAuth`**；`/alliance/reset` 仅秘书处；会员写接口收紧
3. 前端请求附带 `Authorization: Bearer …`；会话经 `/auth/me` 校验
4. **关闭默认可离线伪造登录**（需显式 `VITE_ALLOW_OFFLINE_AUTH=true`）
5. 可选生产闸门：`DEMO_ACCESS_CODE` + 务必设置 `AUTH_SECRET`
6. Vite 固定 `5178` + `0.0.0.0`，与演示入口对齐

### 运维建议

```bash
export AUTH_SECRET='换成长随机串'
export DEMO_ACCESS_CODE='演示访问码'   # 生产强烈建议开启
npm run dev   # api:3001 + web:5178
```

---

## 4. 残留风险（未完全消除）

| 项 | 说明 |
|---|---|
| 演示角色选择 | 未设 `DEMO_ACCESS_CODE` 时仍可点角色登录（有意保留演示 UX） |
| localStorage XSS | Token 仍在 localStorage；需持续防 XSS |
| 中心角色细粒度 | 中心互斥权限尚未按业务字段拆分 |
| 真机/公网 | 未做 WAF、限流、审计日志 |

---

## 5. 验证清单（只读）

- [x] 无 Token 访问 `/api/alliance/state` → 401  
- [x] 无 Token `POST /api/alliance/reset` → 401  
- [x] 合法登录拿到签名 Token 后可读 state  
- [x] 会员 Token 调 `POST /api/alliance/members` → 403  
- [x] 伪造 localStorage 用户但无 Token → 前端踢回登录  

---

## 6. 一句话

> **页面是双门户运营演示 SaaS；原先认证可被旁路「破解」。本轮已补上签名令牌与 API 鉴权，并给出访问码/密钥 hardening 路径。**
