# MinorGuard GitHub Pages 部署

在线演示：**<https://horizoncove.github.io/openclaw-lite/minorguard/>**

## 形态说明

| 能力 | GitHub Pages 静态 MVP | 本地/自建 API |
|---|---|---|
| 风险分析（规则+策略） | ✅ 浏览器引擎 | ✅ |
| 聊天安全拒答 | ✅ | ✅ |
| 事件台账 | ✅ localStorage | ✅ SQLite |
| 样本生成 / 导出 | ✅ | ✅ |
| 豆包 / DeepSeek 云 LLM | ❌（需自建服务） | ✅ |
| App Token 鉴权接入 | ❌ | ✅ |

静态站部署在 `gh-pages` 分支的 **`/minorguard/`** 子目录，不覆盖仓库原有 Pages 站点（Xpark）。

## 自动部署

工作流：`.github/workflows/deploy-minorguard-pages.yml`

- 触发：`main` 上相关路径变更，或手动 `workflow_dispatch`
- 构建：`node apps/minorguard-api/scripts/build-pages.mjs`
- 发布：`peaceiris/actions-gh-pages` → `gh-pages/minorguard`

## 本地预览静态包

```bash
cd apps/minorguard-api
npm run build:pages
npx --yes serve dist-pages -p 4178
# http://127.0.0.1:4178/
```

## 手动发布（维护者）

```bash
npm run build:pages
# 将 dist-pages 内容内容推到 origin/gh-pages 的 minorguard/ 目录
```
