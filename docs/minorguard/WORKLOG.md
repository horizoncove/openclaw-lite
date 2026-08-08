# MinorGuard 文档工作日志

## 2026-08-08 — P3 编码启动（Epic A–D）

- 新增 `apps/minorguard-api`：模块化 API、SQLite、`/api`+`/api/v1`、Demo 静态页
- 脚本：`p3:check` / `security:scan` / `test:contract` / `redteam:smoke` 通过
- 未入库任何云 API Key；ONNX 适配器仅占位

## 2026-08-08 — 研究意义论文

- 新增工作论文：`papers/研究意义_未成年人生成式AI交互安全与端侧合规保护.md`
- 从社会、法治合规、学术、技术、产业五方面论述立项意义，并声明伦理边界

## 2026-08-08 — 建立 P3 合规开发文档包

- 基于本地 MinorGuard 演示包（P0–P2 foundation）与研究轨冻结产物梳理下一阶段
- 新增 `docs/minorguard/`：PRD/TRD/架构/API/合规/数据治理/双轨映射/验收/Backlog/安全基线
- 明确：不把演示包源码与 API Key 入库；先文档冻结再编码
- 研究轨 README 已回链本目录
