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
0 16 * * 1-5 python src/main.py --task daily_review
0 */2 * * * python src/tools/rss_monitor.py
```

## 🤝 贡献

欢迎提交Issue和PR！

## 📄 许可证

MIT License

---

**让AI成为你的个人管家，而非替代品。**
