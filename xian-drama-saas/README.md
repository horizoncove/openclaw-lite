# 西安微短剧产业服务中心 · 运营 SaaS 平台

**联盟运行 SaaS + 五大中心运营 SaaS** 一体化平台（前端 + API + 数据持久化）。

## 功能

| 模块 | 能力 |
|------|------|
| 官网落地页 | 产品介绍、模块说明、进入平台 |
| 总控 | 运营总览、工单中枢、KPI 看板 |
| 联盟运行 | 会员管理、活动运营、供需撮合 |
| 五大中心 | 审批 / 出海 / 发行投流 / 版权 / AI |

## 快速启动（推荐）

```bash
cd xian-drama-saas
npm install
npm run dev
```

- 前端：`http://localhost:5173`
- API：`http://localhost:3001/api`

打开浏览器 → 官网 → **进入平台** → 选择角色登录。

## 生产部署

### PaaS 一键部署（推荐 · 只需付款）

无需买服务器，连接 GitHub 自动上线：

| 平台 | 操作 |
|------|------|
| **Render** | [一键部署按钮](https://render.com/deploy?repo=https://github.com/horizoncove/openclaw-lite) |
| **Railway** | 见 [`deploy/PAAS.md`](./deploy/PAAS.md) |

详细图文步骤：**[`deploy/PAAS.md`](./deploy/PAAS.md)**（约 $10–15/月）

### Docker Compose（自建服务器）

```bash
cp .env.example .env   # 修改数据库密码
docker compose up -d --build
```

访问 `http://服务器IP:3001`。详细步骤见 [`deploy/DEPLOY.md`](./deploy/DEPLOY.md)。

### 单进程（JSON 或 PostgreSQL）

```bash
npm install
npm run build
# 使用 PostgreSQL 时：
export DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/xian_drama
npm run db:migrate
PORT=3001 npm start
```

## 技术栈

- 前端：React + TypeScript + Vite + React Router
- 后端：Express + **PostgreSQL 16**（生产）/ JSON 文件（本地降级）
- Docker：多阶段构建 + docker-compose（app + postgres）

## 演示资料

- 截图手册：[`demo/saas-demo.pdf`](./demo/saas-demo.pdf)
- 网页版：[`demo/index.html`](./demo/index.html)

## API 示例

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/stats
curl http://localhost:3001/api/members
```

## 目录

```
xian-drama-saas/
  server/          # Express API
  src/             # React 前端
  demo/            # 离线演示手册
  public/          # 静态资源
```
