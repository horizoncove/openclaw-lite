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

## 生产部署（单进程）

```bash
npm install
npm run build
PORT=3001 npm start
```

访问 `http://服务器IP:3001`（同时提供网页 + API）。

## 技术栈

- 前端：React + TypeScript + Vite + React Router
- 后端：Express + JSON 文件数据库（`server/data/db.json`）
- API 离线时自动降级为浏览器本地模式

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
