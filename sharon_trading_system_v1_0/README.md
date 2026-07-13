# Sharon Trading System v1.0

个人量化交易助手桌面 MVP，使用 Python 3.11+、PyQt6 和 SQLite。数据只保存在本机，不连接券商，也不会自动下单。

## 已实现

- 账户起始资金、当前总额和累计盈亏持久化
- 持仓市值、仓位比例、现金和板块仓位实时计算
- 每 5 秒处理一次交易同步队列
- 支持 `买入 002371 350.00 3600`、`卖出 002371 355.00 1000`
- 买入采用移动加权平均成本，禁止超持仓卖出
- 单票 25%、板块 30%、总仓位 60%、现金 40% 四类红线
- 账户总览、持仓、交易流水和风险中心桌面界面

金额统一以人民币元写入数据库，界面以“万元”显示。默认账户总额为 5,037,200 元。

## 安装与启动

在仓库根目录执行：

```bash
python3 -m pip install -r sharon_trading_system_v1_0/requirements.txt
python3 -m sharon_trading_system_v1_0.main
```

无桌面的精简 Ubuntu 镜像若提示缺少 `libEGL.so.1`，先执行：

```bash
sudo apt-get update
sudo apt-get install -y libegl1 libgl1
```

数据库首次启动时自动创建：

```text
sharon_trading_system_v1_0/data/sharon_trading.db
```

## 使用

1. 在“当前总额”输入框更新账户净值。
2. 输入交易指令，可额外填写板块。
3. 点击“加入同步队列”；系统在下一个 5 秒周期写入交易。
4. 在“实时持仓”“交易流水”和“风险中心”查看结果。

同步数据代表券商已经成交的事实，因此即使成交后触发红线，交易仍会入库，同时生成风险告警。

## 测试

```bash
python3 -m unittest discover -s tests -v
```

若服务器没有图形桌面，可使用 Qt 的离屏模式进行界面冒烟测试：

```bash
QT_QPA_PLATFORM=offscreen python3 -m unittest tests.test_sharon_app -v
```

## 当前边界

- 当前版本不连接真实券商或行情源；成交价即该股票的最新估值价格。
- 暂未计算手续费、税费和已实现/未实现盈亏拆分。
- SQLite 适合单机个人使用，不适合作为多人并发交易后台。
