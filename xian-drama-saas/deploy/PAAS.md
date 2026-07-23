# PaaS 一键部署（只需注册付款）

无需自己买服务器、装 Docker。选 **Render** 或 **Railway**，连接 GitHub 后自动构建上线。

预计费用：**约 $10–20 / 月**（Web 服务 + PostgreSQL）。

---

## 方案一：Render（推荐，真正一键）

### 第 1 步：点按钮部署

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/horizoncove/openclaw-lite)

或手动打开：<https://render.com/deploy?repo=https://github.com/horizoncove/openclaw-lite>

### 第 2 步：登录并授权 GitHub

1. 用 GitHub 账号登录 Render（<https://render.com>）
2. 授权 Render 读取仓库 `horizoncove/openclaw-lite`
3. Blueprint 会自动读取根目录 `render.yaml`，创建：
   - **Web 服务** `xian-drama-saas`（Docker 构建）
   - **PostgreSQL** 数据库 `xian-drama-db`

### 第 3 步：确认并付款

1. 检查计划（Web `Starter` + DB `Basic 256MB`，可按需升级）
2. 绑定信用卡
3. 点击 **Apply** / **Create**

### 第 4 步：等待部署（约 3–5 分钟）

构建日志中出现 `Live` 后，访问 Render 分配的地址，例如：

```
https://xian-drama-saas-xxxx.onrender.com
```

- 首页：`https://你的域名/`
- 登录：`https://你的域名/login`
- 健康检查：`https://你的域名/api/health`（应返回 `"storage":"postgresql"`）

### 可选：自定义域名

Render 控制台 → 你的 Web 服务 → **Settings → Custom Domains** → 添加域名并按提示配置 DNS。

---

## 方案二：Railway

### 第 1 步：注册 Railway

打开 <https://railway.app>，用 GitHub 登录。

### 第 2 步：从 GitHub 创建项目

1. 点击 **New Project** → **Deploy from GitHub repo**
2. 选择 `horizoncove/openclaw-lite`
3. 若提示选择目录，设置 **Root Directory** 为：

   ```
   xian-drama-saas
   ```

### 第 3 步：添加 PostgreSQL

1. 在项目画布点击 **+ New**
2. 选择 **Database → PostgreSQL**
3. Railway 会自动生成 `DATABASE_URL`

### 第 4 步：配置环境变量

进入 Web 服务 → **Variables**，添加：

| 变量 | 值 |
|------|-----|
| `NODE_ENV` | `production` |
| `STORAGE` | `postgres` |
| `DATABASE_URL` | 引用 PostgreSQL 服务的 `${{Postgres.DATABASE_URL}}` |

（点击 **Add Reference** 从数据库服务引用即可，无需手抄连接串。）

### 第 5 步：部署并生成域名

1. 等待构建完成（使用仓库内 `Dockerfile` + `railway.toml`）
2. **Settings → Networking → Generate Domain**
3. 得到类似 `xian-drama-saas-production.up.railway.app` 的地址

### 付款

Railway 按用量计费，需在 **Account → Billing** 绑定支付方式（约 $5 起充）。

---

## 部署后验证

```bash
curl https://你的域名/api/health
# 期望：{"ok":true,"storage":"postgresql",...}

curl https://你的域名/api/stats
# 期望：返回会员数、工单数等统计
```

浏览器打开 `/login`，选择任意角色（如「联盟秘书处」）即可进入运营控制台。

---

## 常见问题

| 问题 | 处理 |
|------|------|
| 构建失败 | 确认 Root Directory 为 `xian-drama-saas` |
| 数据库连接失败 | 检查 `DATABASE_URL` 是否已引用 PostgreSQL 服务 |
| 首次打开较慢 | Render 免费/低配实例会休眠，唤醒需 30–60 秒 |
| 重置演示数据 | `curl -X POST https://你的域名/api/reset` |

---

## 费用参考（2026）

| 平台 | Web | 数据库 | 合计约 |
|------|-----|--------|--------|
| Render | Starter $7/月 | Basic $7/月 | **~$14/月** |
| Railway | 按量 ~$5–10 | 按量 ~$5 | **~$10–15/月** |

具体以平台官网为准。国内访问 Render 新加坡节点通常比美国节点更快。
