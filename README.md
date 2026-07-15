# OpenClaw Lite 🐾

> 个人AI管家，一键部署你的智能助手团队

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/Platform-Linux%2FMac%2FWindows-lightgrey)

## ✨ 核心功能

OpenClaw Lite 是一个专为个人用户设计的AI管家系统，它将多个AI助手整合到一个平台中：

| 模块 | 功能 | 状态 |
|:---:|:---|:---:|
| **📈 Alex** | 量化交易监控、自动报告生成 | ✅ |
| **🎬 Shakespeare** | 剧本创作辅助、大纲生成 | ✅ |
| **📰 RSS订阅** | 新闻聚合、AI总结、微信推送 | ✅ |
| **📊 数据分析** | 股票图表、Excel自动化 | ✅ |
| **🤖 AI集成** | DeepSeek/通义千问/ChatGPT | 🔄 |
| **☁️ 云同步** | 阿里云盘自动备份 | 🔄 |

## 🚀 快速开始

### 1. 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/openclaw-lite.git
cd openclaw-lite

# 安装依赖
pip install -r requirements.txt

# 初始化配置
python setup.py
```

### 2. 配置

复制配置文件模板并填写：

```bash
cp config/config.example.yaml config/config.yaml
```

编辑 `config/config.yaml`，添加你的API Key：

```yaml
# 股票监控配置
stocks:
  - code: "002353"
    name: "杰瑞股份"
    alert_threshold: 0.03  # 涨跌幅3%提醒
    
# DeepSeek API（可选）
deepseek:
  api_key: "your-api-key"
  
# 通义千问 API（可选）  
qwen:
  api_key: "your-api-key"

# Server酱微信推送
wechat:
  send_key: "your-send-key"
```

### 3. 启动

```bash
# 启动完整系统
python src/main.py

# 或启动单个模块
python src/agents/alex.py      # 仅股票监控
python src/agents/shakespeare.py  # 仅剧本助手
```

## 📊 Alex - 量化交易助手

### 功能
- 实时监控持仓股票
- 自动生成周/日报（带图表）
- 异动微信提醒
- Excel报告导出

### 使用
```python
from src.agents.alex import Alex

alex = Alex()
alex.generate_weekly_report()  # 生成周报
alex.start_monitoring()        # 启动监控
```

### 收盘涨停延续候选

工作日 15:30，Alex 会拉取当日完整涨停池和行业板块涨幅榜，综合以下
可解释指标生成最多 3 只次日观察候选：

- 板块涨停家数与行业涨幅榜共振（30 分）
- 封单金额/流通市值（25 分）
- 首次封板时间（15 分）
- 换手率、开板次数和连板高度（30 分）

默认排除 ST/退市风险股、低换手一字板、封单过弱和开板过多的股票。
参数可在 `config/config.yaml` 的 `limit_up_strategy` 中调整。手动运行：

```bash
python src/main.py --task limit_up_screening
```

结果保存在 `~/.openclaw/workspace/data/limit_up_candidates_YYYYMMDD.json`
对应目录中，包含总分、分项得分、入选理由和风险提示。东方财富公共接口可能
变更或限流；生产使用建议替换为有授权的数据源。评分只用于研究和观察，
不构成投资建议，也不保证次日涨停。

### 五年历史数据与回测

历史下载器使用 BaoStock 的沪深 A 股不复权日线，包含已退市股票并支持断点
续传。必须使用不复权价格，才能正确识别当时的涨停幅度：

```bash
python3 -m src.backtesting.market_database \
  --start 2021-07-15 --end 2026-07-15 \
  --database data/backtest/a_share_5y.sqlite

python3 -m src.backtesting.limit_up_backtest \
  --start 2021-07-15 --end 2026-07-15 \
  --database data/backtest/a_share_5y.sqlite \
  --output-dir data/backtest/results

python3 -m src.backtesting.sop_v31_optimizer \
  --start 2021-07-15 --end 2026-07-15 \
  --database data/backtest/a_share_5y.sqlite \
  --output-dir data/backtest/results
```

数据库和回测结果默认不提交到 Git。回测在收盘选出候选，按次日开盘等权买入、
收盘卖出，开盘涨停视为无法成交，并扣除双边成本。报告同时给出次日继续涨停
命中率、可成交收益、分年度结果和最大回撤。

需要注意：免费日线没有历史封单金额、首次封板时间和精确炸板次数，因此该回测
使用板块涨停宽度、连板高度、换手、成交额和开盘形态构建
`daily_bar_proxy_v1` 代理评分，不能宣称为实时策略的完全复现；BaoStock 不覆盖
北交所，历史行业使用下载时的证监会分类。若配置有权限的 Tushare
`limit_list_d` 数据，才能完整复现封板质量维度。

优化器使用以前年度训练、下一年度验证的滚动方式，并将全样本静态结果与样本外
结果分开。只有样本外交易数、扣费胜率、平均净收益和最大回撤全部达到门槛时，
报告中的 `deployment_decision.approved` 才可能为 `true`；否则系统明确禁止
实盘，不会为了得到“好看结果”继续在同一批历史数据上追逐参数。

## 🎬 Shakespeare - 剧本创作助手

### 功能
- 三幕式结构分析
- 自动生成场景大纲
- 角色一致性检查
- 对白润色

### 使用
```python
from src.agents.shakespeare import Shakespeare

shakespeare = Shakespeare()
blueprint = shakespeare.create_blueprint(
    episode=6,
    theme="真相大白，凶手揭晓",
    characters=["侦探", "凶手", "受害者"]
)
```

## 📰 RSS订阅监控

### 已配置源
- 36氪、机器之心、量子位
- 华尔街见闻、财新
- OpenAI博客

### 特点
- 每2小时自动抓取
- AI阅读并生成总结
- 微信推送摘要

## 🛠️ 技术栈

- **Python 3.10+** - 核心语言
- **Pandas/Matplotlib** - 数据分析与可视化
- **Playwright** - 浏览器自动化
- **SQLite** - 本地数据存储
- **Flask** - HTTP服务

## 📁 项目结构

```
openclaw-lite/
├── src/
│   ├── agents/           # AI助手模块
│   │   ├── alex.py       # 量化交易
│   │   ├── shakespeare.py # 剧本创作
│   │   └── candy.py      # 运营助手
│   ├── core/             # 核心功能
│   │   ├── database.py   # SQLite管理
│   │   ├── notifier.py   # 微信推送
│   │   └── scheduler.py  # 定时任务
│   ├── tools/            # 工具集
│   │   ├── stock_analyzer.py
│   │   ├── excel_automation.py
│   │   └── rss_monitor.py
│   └── main.py           # 入口
├── config/               # 配置文件
├── docs/                 # 文档
├── tests/                # 测试
└── requirements.txt      # 依赖
```

## 📝 配置定时任务

```bash
# 添加到crontab
0 9 * * 1-5 python src/main.py --task morning_report
30 15 * * 1-5 python src/main.py --task limit_up_screening
0 16 * * 1-5 python src/main.py --task daily_review
0 */2 * * * python src/tools/rss_monitor.py
```

## 🤝 贡献

欢迎提交Issue和PR！

## 📄 许可证

MIT License

---

**让AI成为你的个人管家，而非替代品。**
