# Sharon Trading System — Session Handoff

> **下一个会话第一件事：阅读本文件 `handoff.md`，再决定分支与任务。**  
> 最后更新：2026-07-20（已部署：PR #5 合入 main，Release **v1.0.1** 已发布）

---

## 0. 下一会话启动清单（必做）

1. 读完本 `handoff.md`。
2. 确认当前分支与未合并工作：
   - 最新功能在 **`cursor/network-ai-market-data-ff7e`**
   - 对应 Draft PR：**https://github.com/horizoncove/openclaw-lite/pull/5**（CI build 已绿，含联网行情 + AI Agent + 候选实时价）
3. `git fetch` 后切换到上述分支（或按用户要求先合并 PR #5 再基于 `main` 继续）。
4. 跑冒烟：`QT_QPA_PLATFORM=offscreen python3 -m unittest discover -s tests -v`
5. 问用户下一步优先级（见文末「待办 / 可能下一步」）。

---

## 1. 产品身份与边界

| 项 | 内容 |
|---|---|
| 产品名 | **Sharon Trading System v1.0** |
| 定位 | 个人量化交易纪律助手（桌面 PyQt6 + SQLite） |
| 仓库 | `horizoncove/openclaw-lite`（从 openclaw-lite 演进，主体在 `sharon_trading_system_v1_0/`） |
| 不做 | **不连接券商、不自动下单** |
| 选股 | SOP/选股可由外部 AI 或内嵌联网 Agent **建议**；最终 2–3 只候选由用户登记 |
| 颜色 | A 股习惯：**涨/盈红 `#e25555`，跌/亏绿 `#3fad7a`** |
| 视觉 | **石墨 + 黄铜**（`#c9a66b`），字体 Public Sans / JetBrains Mono / 微米黑 |
| 主题 | `QSettings("Sharon","TradingSystem")` → `dark_mode` |
| 数据路径 | `%LOCALAPPDATA%\Sharon\Sharon Trading System\data\sharon_trading.db` |
| 发布 | 用户已确认发布过 **v1.0.0**；勿在未确认时当正式发布 |

**硬规则（纪律引擎）**

- 单票 ≤25%（25–30% 黄灯，>30% 红灯）
- 板块 ≤30%，总仓 ≤60%，现金 ≥40%
- 买入须在候选池；禁买时段 09:30–09:45、14:30–15:00
- 三步建仓；加仓需浮盈 ≥10% 且每票最多一次
- 持仓纪律：-7% 止损；+15%/+25% 减仓；可选 MA5

---

## 2. 仓库 / Git / PR / Release 状态

### 分支

| 分支 | 状态 | 说明 |
|---|---|---|
| `main` | **当前部署尖端** | 已含 PR #2/#4/#5/#7（联网 AI + 涨停接力 + 安装包 1.0.1 元数据） |
| `cursor/network-ai-market-data-ff7e` | 已合入 | PR #5 |
| `cursor/release-v1-0-1-ff7e` | 已合入 | PR #7 版本号 bump |
| `cursor/implement-account-engine-ff7e` | 历史 | PR #2 |
| `cursor/optimize-trade-plan-layout-ff7e` | 历史 | PR #4 |

云代理分支命名规则：`cursor/<descriptive-name>-ff7e`（小写）。

### Pull Requests

| PR | 标题 | 状态 |
|---|---|---|
| [#7](https://github.com/horizoncove/openclaw-lite/pull/7) | Bump installer to v1.0.1 | **MERGED** |
| [#5](https://github.com/horizoncove/openclaw-lite/pull/5) | Networked quotes + AI agent + limit-up screener | **MERGED** |
| [#4](https://github.com/horizoncove/openclaw-lite/pull/4) | Optimize trade plan + left sidebar | **MERGED** |
| [#2](https://github.com/horizoncove/openclaw-lite/pull/2) | Graphite-brass UI + account engine | **MERGED** |

### Release / EXE

- **最新 Tag：v1.0.1** → https://github.com/horizoncove/openclaw-lite/releases/tag/v1.0.1  
- 资产：`SharonTradingSystem-Setup.exe`、`SharonTradingSystem.exe`  
- 本机副本：`/opt/cursor/artifacts/sharon-v1.0.1/`  
- 旧版：v1.0.0 仍保留  
- 说明：v1.0.1 功能包来自 PR #5 最终绿构建；installer 元数据 1.0.1 已合入 main。

本地产物目录（环境内）：

- `/opt/cursor/artifacts/sharon-v1.0.1/` — **当前部署 EXE**  
- `/opt/cursor/artifacts/sharon-exe/` — 更早 EXE 副本  
- `/opt/cursor/artifacts/sharon-candidate-quotes/` — 含候选实时价的全页预览  
- `/opt/cursor/artifacts/sharon-network-ai/` / `sharon-limit-up/` — 联网/涨停页预览  

构建：`.github/workflows/build-windows-installer.yml`（`main` / `cursor/**` / `v*`）  
入口：`windows_launcher.py` + `SharonTradingSystem.spec` + `installer/SharonTradingSystem.iss`

---

## 3. 架构速览（关键路径）

```
sharon_trading_system_v1_0/
  main.py              → WorkbenchWindow
  main_window.py       → 壳：顶栏、KPI、交易同步条、左侧菜单、主题、基础三表
  workbench.py         → 全部业务页（驾驶舱/持仓可视化/候选/计划/监督/复盘/任务/联网AI）
  account_engine.py    → 账户、成交、持仓、红线；update_last_prices()
  system_engine.py     → 候选池、预检、监督、复盘、任务队列
  cockpit.py           → 图表/卡片组件（HoldingCard、CandidateSlotCard、MetricStrip…）
  market_data.py       → EastMoneyQuoteProvider（东财公开行情）
  ai_agent.py          → OpenAICompatibleAgent + tool calling
  network_settings.py  → QSettings 持久化联网配置
```

**价格语义**

- 成交同步：`sync_trade` 用成交价写 `last_price`
- 行情刷新：`update_last_prices` **只改估值**，不造成交
- 关闭行情时退回最近成交价估值

**导航**

- 顶部 TabBar **隐藏**；左侧 `QListWidget#sideNav` 与 `QTabWidget` 双向同步
- 分析页（候选/计划/监督/复盘/任务/**联网 AI**/持仓）会隐藏顶栏 KPI 和/或交易同步条（见 `_toggle_context_panels`）

---

## 4. 本会话工作分类总结

### A. UI / 布局

1. **石墨黄铜视觉系统**（已合入）  
   深浅色、驾驶舱 KPI/仪表/持仓卡、候选席位、监督雷达/甜甜圈等。
2. **过度简化 → 回退**  
   用户反馈「过于简单」后，恢复更密的 graphite-brass 布局。
3. **交易计划页多次迭代**（已合入 PR #4）  
   终态：**左写右读**  
   - 左：拟定表单 + 测算按钮  
   - 右：灯号结论 + 预计仓位 + AI 警告列表  
   - 本页隐藏顶栏 KPI / 同步条  
4. **全站菜单改左侧**（已合入 PR #4）  
   侧栏「菜单」+ 黄铜选中态。

### B. 纪律 / 交易计划警示

- 交易计划增加 **AI 警告区**（预检原因、持仓纪律、流程提示）
- 与监督页 finding 去重：测算后以预检+持仓信号为主

### C. 发布

- 用户明确「确认发布」→ 合并主功能 PR、打 tag `v1.0.0`、上传 Setup/EXE  
- 用户「通过可以直接输出成 EXE」→ 下载 CI 产物并更新 Release 资产

### D. 联网能力（PR #5，未合入）

1. **实时行情**（东财 `push2.eastmoney.com`）  
   - 定时刷新持仓+候选代码  
   - `AccountEngine.update_last_prices`
2. **嵌入 AI Agent**（OpenAI 兼容，默认 DeepSeek）  
   - 页：`联网 AI`  
   - 工具：`get_market_quotes` / `get_account_snapshot` / `list_candidates` / `propose_candidates`  
   - **建议层**，不落单
3. **候选买入名单显示实时数据**（用户明确要求）  
   - 输入 6 位代码 → 查现价/涨跌，名称可回填  
   - 席位卡、候选池表、驾驶舱候选表展示最新价/涨跌幅  
   - 缓存：`WorkbenchWindow._live_quotes`
4. **涨停接力选股**（用户最新要求）  
   - 模块：`limit_up_strategy.py`（东财涨停池 + 板块热度聚合评分）  
   - UI：联网 AI 页「涨停接力选股」→ 收盘扫描 / 写入候选池  
   - 任务表新增 `limit_up_relay`（交易日 15:05）  
   - 评分因子：热门板块家数、封板时间、连板数、炸板次数、封单/成交额、换手、创业板/科创折价  
   - **不自动下单**；结果需人工确认后进候选池与交易计划

### E. 测试 / 预览

- 测试约 **20** 项：`tests/test_account_engine.py`、`test_sharon_app.py`、`test_system_engine.py`、`test_network_services.py`
- 预览脚本：`tools/render_previews.py` → 输出到 `/opt/cursor/artifacts/...`
- 离屏：`QT_QPA_PLATFORM=offscreen`

---

## 5. 页面清单（侧栏顺序）

1. 驾驶舱  
2. 实时持仓  
3. 交易流水  
4. 风险中心  
5. 候选股票 ← **登记时显示实时行情**  
6. 交易计划 ← **左写右读 + AI 警告**  
7. AI 监督  
8. 每日复盘  
9. 任务与资料  
10. 联网 AI ← **行情设置 + Agent 对话**

---

## 6. 用户偏好与沟通要点（务必遵守）

- 前端：避免紫白/奶油陶土/报纸风；避免仪表盘式第一屏堆砌；品牌要强。  
- **例外**：本应用已是交易工作台，以既有 graphite-brass 体系为准，勿推倒重来。  
- 用户曾拒绝「过简」布局 → 保持信息密度，但层级要清晰。  
- 发布必须用户明确确认；不要擅自当已发布。  
- PR 用 `ManagePullRequest`；分支前缀 `cursor/`、后缀 `-ff7e`。  
- 中文沟通，简洁直接。

---

## 7. 配置键（联网）

`QSettings("Sharon", "TradingSystem")`：

| Key | 含义 | 默认 |
|---|---|---|
| `dark_mode` | 深色主题 | false/历史值 |
| `network/market_enabled` | 行情开关 | true |
| `network/market_interval_sec` | 刷新秒数 | 15（≥5） |
| `network/agent_enabled` | Agent 开关 | false |
| `network/agent_base_url` | OpenAI 兼容根 | `https://api.deepseek.com/v1` |
| `network/agent_api_key` | API Key | 空 |
| `network/agent_model` | 模型名 | `deepseek-chat` |

---

## 8. 待办 / 可能下一步（供下一会话）

按优先级建议与用户确认：

1. ~~合并 PR #5 并发布 v1.0.1~~ **已完成（2026-07-20）**。  
2. Actions 排队结束后，用带 1.0.1 元数据的 main 构建 **覆盖** Release 资产（可选）。  
3. 涨停策略增强：炸板池/跌停池对照、概念板块接口、历史连板胜率回测、收盘自动定时。  
   - **V31反向版（本会话）**：分支 `cursor/v31-reverse-strategy-0fdb`  
     - Sharon：`limit_up_strategy.score_v31_reverse` + UI 策略切换（默认 V31）  
     - 弱市：涨停家数不足 30 空仓；评分门槛 75；排除 7 连板以上  
     - 计划提示：-2.8% / +6%卖半 / +18%清仓等（不改 L1 硬红线）  
     - 聚宽原稿：`strategies/joinquant_v31_reverse.py`（仅供粘贴到聚宽，不 import）  
4. 候选页：板块辅助填写；行情失败更稳降级。  
5. Agent：流式输出、对话历史持久化、密钥钥匙串。  
6. 根目录遗留 `account_engine.py` 与包内版本不同——改动时别改错文件。

---

## 9. 常用命令

```bash
# 测试
QT_QPA_PLATFORM=offscreen python3 -m unittest discover -s tests -v

# 本地跑
python3 -m pip install -r sharon_trading_system_v1_0/requirements.txt
python3 -m sharon_trading_system_v1_0.main

# 全页预览
QT_QPA_PLATFORM=offscreen python3 tools/render_previews.py /opt/cursor/artifacts/sharon-preview

# 东财行情冒烟
python3 - <<'PY'
from sharon_trading_system_v1_0.market_data import EastMoneyQuoteProvider
print(EastMoneyQuoteProvider().fetch_quotes(["002371","600519"]))
PY
```

---

## 10. 一句话现状

**Sharon v1.0.1 已部署：main 含联网行情、AI Agent、候选实时价、涨停接力选股；GitHub Release v1.0.1 可下载 EXE。**

下一会话：先读本文件 → 按用户新需求继续；可选刷新 Release 构建元数据。
