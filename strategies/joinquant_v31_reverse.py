#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
V31反向版 - 聚宽(JoinQuant)量化平台策略（参考原稿）
=================================================
本文件供在聚宽研究/回测环境直接粘贴运行，不由 Sharon 桌面端 import。

Sharon 侧对应实现：
  sharon_trading_system_v1_0/limit_up_strategy.py  → score_v31_reverse / mode=v31_reverse
  （东财涨停池适配版：建议层，不自动下单）

策略核心:
1. 多因子评分入场(资金30%+量能20%+波动率15%+形态15%+估值位置10%+行业10%, >=75分才买)
   - 反向优化: 高波动加分 + 突破上轨加分 + 正乖离加分 + 突然放量加分
2. 止盈止损: -2.8%止损, +6%卖半, +18%清仓
3. 仓位管理: 单只30%, 最大持仓3只, 总仓位80%
4. 建仓节奏: 每日最多买1只, 周一至周四逐步建仓, 周五清仓
5. 大盘过滤: 仅按涨停家数<30判定弱市空仓(剔除沪深300条件)
6. 最大持有5个交易日

聚宽平台差异:
- 去掉XGBoost模型预测(聚宽不支持加载外部模型), 用评分系统替代
- 资金流向数据使用get_money_flow获取
- 涨停股池通过get_price实时计算(涨幅>=9.5%)
"""

import numpy as np
import pandas as pd
from datetime import timedelta
from jqdata import *

# ===================== 策略参数 =====================
PARAMS = {
    # 资金管理
    '初始资金': 3000000,
    '单只仓位': 0.30,           # 单只仓位不超过30%
    '最大持仓数': 3,            # 最多买入3只股票
    '总仓位上限': 0.80,         # 总仓位控制在80%

    # 止盈止损
    '止损线': -0.028,
    '止盈线1': 0.06,      # 卖半
    '止盈线2': 0.18,      # 清仓
    '最大持有交易日': 5,

    # 选股条件
    '评分门槛': 75,             # 综合评分>=75分才买
    '涨停家数阈值': 30,         # 涨停<30家为弱市
    '连板上限': 7,              # 排除7连板以上(高位风险)
    'ST排除': True,
    '开盘买入上限': 0.05,       # 开盘涨幅<=5%才买
    '开盘买入下限': -0.03,      # 开盘跌幅>=-3%才买

    # 冷却
    '连亏冷却天数': 3,
    '连亏触发次数': 3,
}


def initialize(context):
    """初始化策略"""
    set_benchmark('000300.XSHG')
    set_option('use_real_price', True)
    set_option('avoid_future_data', True)
    set_order_cost(OrderCost(
        close_tax=0.001,
        open_commission=0.0003,
        close_commission=0.0003,
        min_commission=5
    ), type='stock')
    # 将参数挂载到context
    context.p = PARAMS
    # 状态变量
    context.last_buy_date = None       # 记录今日是否已买入(每日最多买1只)
    context.consecutive_losses = 0     # 连续亏损次数
    context.cooldown_days = 0          # 冷却剩余天数
    context.selected_stock = None      # 今日选中股票
    context.selected_score = 0         # 选中股票评分
    context.holdings = {}              # 持仓字典 {stock: {cost, buy_date, half_sold, initial_shares}}
    context.market_state = 'normal'    # 市场状态
    context.zt_count = 0               # 昨日涨停家数
    # 打印参数(必须在context.p赋值之后)
    log.info('V31反向版 - 聚宽平台启动')
    log.info(f"止损:{context.p['止损线']*100:.1f}% 止盈1:+{context.p['止盈线1']*100:.0f}%卖半 止盈2:+{context.p['止盈线2']*100:.0f}%清仓")
    log.info(f"单只仓位:{context.p['单只仓位']*100:.0f}% 最大持仓:{context.p['最大持仓数']}只 总仓位上限:{context.p['总仓位上限']*100:.0f}%")
    log.info(f"评分门槛:{context.p['评分门槛']}分 涨停阈值:{context.p['涨停家数阈值']}家")
    log.info('=' * 60)
    # 定时任务
    run_daily(before_market_open, time='09:00')
    run_daily(handle_buy, time='09:30')
    run_daily(handle_sell, time='14:50')
    run_daily(after_trading_end, time='15:30')


def before_market_open(context):
    """开盘前选股(09:00)"""
    # 冷却天数递减
    if context.cooldown_days > 0:
        context.cooldown_days -= 1
    # 获取昨日涨停股
    yesterday = context.current_dt.date() - timedelta(days=1)
    zt_stocks = get_zt_stocks(context, yesterday)
    context.zt_count = len(zt_stocks)
    log.info(f'昨日涨停股: {context.zt_count}只')
    # 大盘环境判断: 仅按涨停家数判定弱市
    is_weak_zt = context.zt_count < context.p['涨停家数阈值']
    if is_weak_zt:
        context.market_state = 'weak'
        context.selected_stock = None
        log.info(f'弱市空仓: 涨停{context.zt_count}家 < 阈值{context.p["涨停家数阈值"]}家')
        return
    else:
        context.market_state = 'normal'
    # 对涨停股评分(排除已持仓股票)
    scored_stocks = []
    for stock in zt_stocks:
        if stock in context.holdings:
            continue
        try:
            score = calc_score(context, stock, yesterday)
            if score >= context.p['评分门槛']:
                scored_stocks.append((stock, score))
        except Exception:
            continue
    # 按评分排序,选Top1(每日买1只,逐步建仓至3只)
    if len(scored_stocks) > 0:
        scored_stocks.sort(key=lambda x: x[1], reverse=True)
        context.selected_stock = scored_stocks[0][0]
        context.selected_score = scored_stocks[0][1]
        log.info(f'选中: {context.selected_stock} 评分:{context.selected_score:.0f} (候选{len(scored_stocks)}只)')
    else:
        context.selected_stock = None
        log.info(f'无评分>={context.p["评分门槛"]}的涨停股')


def get_zt_stocks(context, date):
    """获取指定日期的涨停股列表"""
    stocks = get_all_securities(['stock'], date=date)
    if context.p['ST排除']:
        stocks = stocks[~stocks['display_name'].str.contains('ST|\\*ST', na=False)]
    stock_list = stocks.index.tolist()
    if len(stock_list) == 0:
        return []
    price_df = get_price(stock_list, end_date=date, frequency='daily',
                         fields=['close', 'high', 'low', 'pre_close', 'volume', 'paused'],
                         count=1, skip_paused=False, panel=False)
    zt_stocks = []
    for _, row in price_df.iterrows():
        if row['paused'] == 1:
            continue
        if pd.isna(row['pre_close']) or row['pre_close'] <= 0:
            continue
        pct = (row['close'] - row['pre_close']) / row['pre_close']
        if pct >= 0.095:
            zt_stocks.append(row['code'])
    return zt_stocks


def calc_score(context, stock, date):
    """
    多因子评分系统 V31反向版 - 涨停股专用反向因子
    资金30% + 量能20% + 波动率15% + 形态15% + 估值位置10% + 行业10%
    反向优化: 高波动加分 + 突破上轨加分 + 正乖离加分 + 突然放量加分
    聚宽平台可用数据有限,部分因子做简化处理
    """
    score = 0
    try:
        # 获取历史价格数据
        price_df = get_price(stock, end_date=date, frequency='daily',
                             fields=['close', 'volume', 'money', 'high', 'low', 'pre_close', 'open'],
                             count=25, skip_paused=True)
        if len(price_df) < 2:
            return 0
        # ========== 资金因子 (30分) ==========
        try:
            mf = get_money_flow(security_list=[stock], start_date=date, end_date=date,
                                fields=['net_mf_amount', 'buy_elg_amount', 'sell_elg_amount',
                                        'buy_lg_amount', 'sell_lg_amount'])
            if len(mf) > 0:
                row = mf.iloc[0]
                buy_elg = row.get('buy_elg_amount', 0)
                sell_elg = row.get('sell_elg_amount', 0)
                total_elg = buy_elg + sell_elg
                if total_elg > 0:
                    elg_ratio = (buy_elg - sell_elg) / total_elg * 100
                else:
                    elg_ratio = 0
                score += max(min(elg_ratio / 20 * 12 + 12, 24), 0)
                net_mf = row.get('net_mf_amount', 0)
                buy_lg = row.get('buy_lg_amount', 0)
                sell_lg = row.get('sell_lg_amount', 0)
                total_mf = buy_lg + sell_lg + total_elg
                if total_mf > 0:
                    mf_ratio = net_mf / total_mf * 100
                else:
                    mf_ratio = 0
                score += max(min(mf_ratio / 20 * 10 + 10, 20), 0)
                score += 8 if net_mf > 0 else 4
            else:
                score += 20
        except Exception:
            score += 20
        # ========== 量能因子 (20分) ==========
        try:
            latest_vol = price_df['volume'][-1]
            avg_vol_5 = price_df['volume'][-5:].mean() if len(price_df) >= 5 else price_df['volume'].mean()
            turnover_approx = latest_vol / avg_vol_5 if avg_vol_5 > 0 else 1
            # 换手率近似 (8分)
            if turnover_approx > 3:
                score += 8
            elif turnover_approx > 1.5:
                score += 6
            else:
                score += 3
            # 量比 (8分)
            vol_ratio = latest_vol / price_df['volume'][-2] if len(price_df) >= 2 else 1
            if vol_ratio > 2:
                score += 8
            elif vol_ratio > 1:
                score += 6
            else:
                score += 3
            # 量能爆发力 (4分) - 反向：突然放量加分
            if vol_ratio > 2:
                score += 4
            elif vol_ratio > 1.5:
                score += 3
            elif vol_ratio > 1:
                score += 2
            else:
                score += 0
        except Exception:
            score += 10
        # ========== 波动率因子 (15分) - 反向：高波动加分 ==========
        try:
            # 20日波动率 (10分) - 越高越好
            if len(price_df) >= 20:
                returns = price_df['close'].pct_change().dropna()
                vol_20d = returns.std() * np.sqrt(250) * 100
                if vol_20d > 50:
                    score += 8
                elif vol_20d > 35:
                    score += 6
                elif vol_20d > 25:
                    score += 4
                elif vol_20d > 15:
                    score += 2
                else:
                    score += 0
            else:
                score += 5
            # T日振幅 (5分) - 越大越好
            latest = price_df.iloc[-1]
            t_amp = (latest['high'] - latest['low']) / latest['close'] * 100
            if t_amp > 12:
                score += 5
            elif t_amp > 8:
                score += 4
            elif t_amp > 5:
                score += 3
            elif t_amp > 3:
                score += 2
            else:
                score += 1
        except Exception:
            score += 5
        # ========== 形态因子 (15分) ==========
        try:
            hist = price_df
            lianban = 0
            for i in range(len(hist) - 1, -1, -1):
                row = hist.iloc[i]
                if row['high'] >= row['pre_close'] * 1.095:
                    lianban += 1
                else:
                    break
            if lianban >= 3:
                score += 8
            elif lianban >= 2:
                score += 5
            else:
                score += 3
            latest_high = price_df['high'][-1]
            latest_close = price_df['close'][-1]
            is_zhaban = latest_high >= latest_close * 1.02
            score += 5 if not is_zhaban else 2
            pre_c = price_df['pre_close'][-1]
            is_yizi = price_df['open'][-1] >= pre_c * 1.095
            score += 2 if is_yizi else 0
        except Exception:
            score += 8
        # ========== 估值/位置因子 (10分) - 反向：突破上轨加分 ==========
        try:
            # 布林带位置 (5分) - 接近20日高点加分
            if len(price_df) >= 20:
                high_20 = price_df['high'][-20:].max()
                low_20 = price_df['low'][-20:].min()
                current = price_df['close'][-1]
                position = (current - low_20) / (high_20 - low_20 + 0.001)
                if position > 0.8:
                    score += 5
                elif position > 0.6:
                    score += 4
                elif position > 0.4:
                    score += 3
                elif position > 0.2:
                    score += 2
                else:
                    score += 1
            else:
                score += 3
            # 5日乖离率 (5分) - 正乖离加分
            if len(price_df) >= 5:
                ma5 = price_df['close'][-5:].mean()
                bias = (price_df['close'][-1] - ma5) / ma5 * 100
                if bias > 6:
                    score += 5
                elif bias > 3:
                    score += 4
                elif bias > 0:
                    score += 3
                elif bias > -3:
                    score += 2
                else:
                    score += 1
            else:
                score += 3
        except Exception:
            score += 4
        # ========== 行业因子 (10分) ==========
        try:
            industry = get_industry(stock, date=date)
            if industry and stock in industry:
                score += 6
            else:
                score += 3
            score += 4
        except Exception:
            score += 5
    except Exception as e:
        log.error(f'评分失败 {stock}: {e}')
        return 0
    return min(int(score), 100)


def handle_buy(context):
    """开盘买入(09:30): 周一至周四逐步建仓,每日最多买1只"""
    weekday = context.current_dt.weekday()
    is_buy_day = weekday in [0, 1, 2, 3]   # 周一至周四都可买入
    # 非买入日跳过(周五清仓)
    if not is_buy_day:
        return
    # 弱市不买入
    if context.market_state == 'weak':
        return
    # 冷却中不买入
    if context.cooldown_days > 0:
        log.info(f'冷却中,剩余{context.cooldown_days}天')
        return
    # 检查持仓数量
    if len(context.holdings) >= context.p['最大持仓数']:
        return
    # 检查总仓位上限
    portfolio_value = context.portfolio.total_value
    current_position_value = portfolio_value - context.portfolio.available_cash
    if current_position_value / portfolio_value >= context.p['总仓位上限']:
        log.info(f'总仓位已达{current_position_value/portfolio_value*100:.1f}%,超过上限{context.p["总仓位上限"]*100:.0f}%')
        return
    # 检查今日是否已买入(每日最多买1只)
    today_str = context.current_dt.strftime('%Y-%m-%d')
    if context.last_buy_date == today_str:
        return
    # 买入
    if context.selected_stock:
        stock = context.selected_stock
        try:
            current_data = get_current_data()[stock]
            # 停牌跳过
            if current_data.paused:
                log.info(f'{stock} 停牌,跳过')
                return
            # 获取开盘价
            open_price = current_data.day_open
            if open_price <= 0:
                return
            # 开盘涨幅检查
            try:
                price_df = get_price(stock, end_date=context.current_dt.date(),
                                     frequency='daily', fields=['pre_close'],
                                     count=1, skip_paused=True)
                if len(price_df) > 0 and price_df['pre_close'][0] > 0:
                    pre_close = price_df['pre_close'][0]
                else:
                    pre_close = open_price / 1.05
            except Exception:
                pre_close = open_price / 1.05
            open_pct = (open_price - pre_close) / pre_close
            if open_pct > context.p['开盘买入上限'] or open_pct < context.p['开盘买入下限']:
                log.info(f'{stock} 开盘涨幅{open_pct*100:.2f}% 不符合范围,跳过')
                return
            # 计算买入股数(100股整数倍)
            available_cash = context.portfolio.available_cash * 0.98  # 预留2%缓冲
            # 单只仓位按总资产计算,但不超过可用资金
            target_value = min(portfolio_value * context.p['单只仓位'], available_cash)
            buy_price = open_price * (1 + 0.005)  # 0.5%滑点预留
            shares = int(target_value / buy_price / 100) * 100
            if shares <= 0:
                log.info(f'{stock} 可用资金不足,目标金额:{target_value:.0f},现价:{open_price:.2f}')
                return
            actual_value = shares * open_price * 1.003
            # 最终检查: 确保不超过可用资金
            if actual_value > context.portfolio.available_cash:
                shares = int(context.portfolio.available_cash * 0.97 / buy_price / 100) * 100
                if shares <= 0:
                    return
                actual_value = shares * buy_price
            # 下单
            order(stock, shares)
            # 记录持仓
            context.holdings[stock] = {
                'cost': buy_price,
                'buy_date': context.current_dt.date(),
                'half_sold': False,
                'initial_shares': shares,
            }
            context.last_buy_date = today_str
            log.info(f'★ 买入 {stock} @ {buy_price:.2f} 股数:{shares} 金额:{actual_value:.0f} 评分:{context.selected_score:.0f} (持仓{len(context.holdings)}/{context.p["最大持仓数"]})')
        except Exception as e:
            log.error(f'买入失败 {stock}: {e}')


def sync_holdings(context):
    """同步context.holdings与实际持仓,修复历史遗漏持仓"""
    actual_positions = set()
    for stock, pos in context.portfolio.positions.items():
        if pos.total_amount > 0:
            actual_positions.add(stock)
            # 实际有持仓但holdings中没有记录(历史遗漏),补充记录
            if stock not in context.holdings:
                context.holdings[stock] = {
                    'cost': pos.avg_cost,
                    'buy_date': context.current_dt.date(),
                    'half_sold': False,
                    'initial_shares': pos.total_amount,
                }
                log.info(f'⚠ 同步遗漏持仓: {stock} 股数:{pos.total_amount} 成本:{pos.avg_cost:.2f}')
    # 清理holdings中已无实际持仓的记录
    for stock in list(context.holdings.keys()):
        if stock not in actual_positions:
            del context.holdings[stock]


def handle_sell(context):
    """盘中止盈止损检查(14:50): 止损/止盈/到期清仓/周五清仓/冷却清仓"""
    # 先同步持仓,修复历史遗漏
    sync_holdings(context)
    # 是否周五
    is_friday = context.current_dt.weekday() == 4

    # ========== 冷却触发: 立即清仓所有持仓后才进入冷却 ==========
    if context.cooldown_days > 0 and len(context.holdings) > 0:
        log.info(f'⚡ 冷却触发,强制清仓所有持仓({len(context.holdings)}只),清仓后冷却{context.cooldown_days}天')
        for stock in list(context.holdings.keys()):
            try:
                current_data = get_current_data()[stock]
                if current_data.paused:
                    continue
                current_price = current_data.last_price
                if current_price <= 0:
                    continue
                pos = context.portfolio.positions.get(stock)
                if pos is None or pos.total_amount == 0:
                    if stock in context.holdings:
                        del context.holdings[stock]
                    continue
                sellable = pos.sellable_amount
                if sellable <= 0:
                    continue
                cost = pos.avg_cost
                pnl_pct = (current_price - cost) / cost
                hold_days = (context.current_dt.date() - context.holdings[stock]['buy_date']).days
                order_target(stock, 0)
                log.info(f'  ⚡ 冷却清仓 {stock} @ {current_price:.2f} 盈亏:{pnl_pct*100:.2f}% 持有{hold_days}天')
                if stock in context.holdings:
                    del context.holdings[stock]
            except Exception as e:
                log.error(f'冷却清仓失败 {stock}: {e}')
        return  # 冷却清仓后今日不再处理其他卖出逻辑

    for stock in list(context.holdings.keys()):
        try:
            holding = context.holdings[stock]
            current_data = get_current_data()[stock]
            # 停牌跳过
            if current_data.paused:
                continue
            # 获取当前价格
            current_price = current_data.last_price
            if current_price <= 0:
                continue
            # 获取持仓
            pos = context.portfolio.positions.get(stock)
            if pos is None or pos.total_amount == 0:
                # 已清仓,清理记录
                if stock in context.holdings:
                    del context.holdings[stock]
                continue
            # 获取可卖股数
            sellable = pos.sellable_amount
            if sellable <= 0:
                continue
            # 计算盈亏: 用聚宽pos.avg_cost(自动复权,处理除权除息/派现/转股)
            cost = pos.avg_cost
            pnl_pct = (current_price - cost) / cost
            # 同步回holding记录(除权后avg_cost会变化)
            holding['cost'] = cost
            # 持有天数
            hold_days = (context.current_dt.date() - holding['buy_date']).days
            # ========== 周五清仓(最高优先级,盘中执行) ==========
            if is_friday:
                order_target(stock, 0)
                log.info(f'□ 周五清仓 {stock} @ {current_price:.2f} 盈亏:{pnl_pct*100:.2f}% 持有{hold_days}天')
                if pnl_pct < 0:
                    context.consecutive_losses += 1
                    if context.consecutive_losses >= context.p['连亏触发次数']:
                        context.cooldown_days = context.p['连亏冷却天数']
                        log.info(f'触发连亏冷却,冷却{context.cooldown_days}天')
                else:
                    context.consecutive_losses = 0
                if stock in context.holdings:
                    del context.holdings[stock]
                continue
            # 止损清仓
            if pnl_pct <= context.p['止损线']:
                order_target(stock, 0)
                log.info(f'× 止损清仓 {stock} @ {current_price:.2f} 盈亏:{pnl_pct*100:.2f}% 持有{hold_days}天')
                if pnl_pct < 0:
                    context.consecutive_losses += 1
                    if context.consecutive_losses >= context.p['连亏触发次数']:
                        context.cooldown_days = context.p['连亏冷却天数']
                        log.info(f'触发连亏冷却,冷却{context.cooldown_days}天')
                if stock in context.holdings:
                    del context.holdings[stock]
                continue
            # 止盈1: 卖半
            if pnl_pct >= context.p['止盈线1'] and not holding['half_sold']:
                half_shares = (sellable // 2 // 100) * 100
                if half_shares > 0:
                    order(stock, -half_shares)
                    holding['half_sold'] = True
                    log.info(f'◇ 止盈卖半 {stock} @ {current_price:.2f} 盈亏:{pnl_pct*100:.2f}% 卖出{half_shares}股')
                continue
            # 止盈2: 清仓
            if pnl_pct >= context.p['止盈线2']:
                order_target(stock, 0)
                log.info(f'○ 止盈清仓 {stock} @ {current_price:.2f} 盈亏:{pnl_pct*100:.2f}%')
                context.consecutive_losses = 0
                if stock in context.holdings:
                    del context.holdings[stock]
                continue
            # 到期清仓
            if hold_days >= context.p['最大持有交易日']:
                order_target(stock, 0)
                log.info(f'□ 到期清仓 {stock} @ {current_price:.2f} 盈亏:{pnl_pct*100:.2f}% 持有{hold_days}天')
                if pnl_pct < 0:
                    context.consecutive_losses += 1
                    if context.consecutive_losses >= context.p['连亏触发次数']:
                        context.cooldown_days = context.p['连亏冷却天数']
                        log.info(f'触发连亏冷却,冷却{context.cooldown_days}天')
                else:
                    context.consecutive_losses = 0
                if stock in context.holdings:
                    del context.holdings[stock]
                continue
        except Exception as e:
            log.error(f'卖出检查失败 {stock}: {e}')


def after_trading_end(context):
    """盘后清理(15:30): 仅同步持仓记录,不下单"""
    # 同步实际持仓与holdings记录
    sync_holdings(context)
    # 打印持仓
    if context.holdings:
        log.info(f'当前持仓: {len(context.holdings)}只')
        for stock, h in context.holdings.items():
            pos = context.portfolio.positions.get(stock)
            if pos and pos.total_amount > 0:
                pnl = (pos.price - h['cost']) / h['cost'] * 100
                log.info(f'  {stock} 成本:{h["cost"]:.2f} 现价:{pos.price:.2f} 盈亏:{pnl:+.2f}% 股数:{pos.total_amount}')
    else:
        log.info('空仓')
