#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
三策略融合版 - 聚宽(JoinQuant)量化平台策略
==========================================
融合：
  1) Sharon SOP v3.1 硬过滤 + 七星代理评分（权重 50%）
  2) 经典涨停接力（封板质量/板块热度，权重 25%）
  3) V31反向多因子（高波动/放量/正乖离，权重 25%）

统一流程：
  涨停家数 < 30 → 弱市空仓
  → SOP硬过滤（2–4连板 / 流通市值≤100亿 / 换手≥5% / 14:00前封板 / 板块≥3只）
  → 融合分 = SOP×50% + 接力×25% + 反向×25%
  → 融合分≥70 且分项底线 SOP≥60 / 接力≥50 / 反向≥55 才可选
  → 每日最多买1只，周一至周四建仓，周五清仓，最多持有5个交易日

仓位与风控（以 SOP/L1 为准，V31 止盈作战术）：
  单只≤25%，最多3只，总仓≤60%
  止损 -7%；+6%卖半；+18%清仓
  买入窗口内现价涨跌幅落在 [-3%, +5%]

★ 回测交易模式 = 盯盘实时（务必选「分钟」频率）：
  - handle_data 每分钟调用：盘中按最新价实时检查止损/止盈/到期
  - 买入：09:30–09:45 窗口内盯盘，现价落入区间即买（不是收盘后一次性撮合）
  - 周五：盘中照常止盈止损，14:50 起强制清仓
  - 日线回测无法模拟盯盘，结果会失真

使用方法：
  复制本文件全部代码到聚宽「策略研究 / 回测」编辑器；
  回测频率选择「分钟」，再运行。不依赖 Sharon 桌面端。
"""

import numpy as np
import pandas as pd
from collections import Counter
from jqdata import *
# jqdata 的 import * 会覆盖标准库 time 模块名，须在其后重新导入 datetime.time
from datetime import datetime, timedelta, time as dt_time

# ===================== 策略参数 =====================
PARAMS = {
    # 资金 / 仓位（SOP/L1）
    '初始资金': 3000000,
    '单只仓位': 0.25,
    '最大持仓数': 3,
    '总仓位上限': 0.60,

    # 止盈止损
    '止损线': -0.07,
    '止盈线1': 0.06,       # 卖半（V31战术）
    '止盈线2': 0.18,       # 清仓（V31战术）
    '最大持有交易日': 5,

    # 融合评分
    '融合门槛': 70,
    'SOP权重': 0.50,
    '接力权重': 0.25,
    '反向权重': 0.25,
    'SOP底线': 60,
    '接力底线': 50,
    '反向底线': 55,

    # SOP硬过滤
    '涨停家数阈值': 30,
    '连板下限': 2,
    '连板上限': 4,
    '流通市值上限亿': 100,
    '流通市值硬剔除亿': 300,
    '换手下限': 5.0,
    '小市值亿': 30,
    '小市值换手上限': 30.0,
    '板块最少涨停': 3,
    '最晚封板时点': dt_time(14, 0),

    # 盯盘买入窗口（按现价，非整日收盘价）
    '买入窗口开始': dt_time(9, 30),
    '买入窗口结束': dt_time(9, 45),
    '开盘买入上限': 0.05,
    '开盘买入下限': -0.03,
    'ST排除': True,

    # 周五强制清仓起点（此前仍实时止盈止损）
    '周五清仓时点': dt_time(14, 50),

    # 冷却
    '连亏冷却天数': 3,
    '连亏触发次数': 3,
}


def initialize(context):
    set_benchmark('000300.XSHG')
    set_option('use_real_price', True)
    set_option('avoid_future_data', True)
    set_order_cost(OrderCost(
        close_tax=0.001,
        open_commission=0.0003,
        close_commission=0.0003,
        min_commission=5
    ), type='stock')

    context.p = PARAMS
    context.last_buy_date = None
    context.consecutive_losses = 0
    context.cooldown_days = 0
    context.selected_stock = None
    context.selected_score = 0
    context.selected_detail = ''
    context.holdings = {}
    context.market_state = 'normal'
    context.zt_count = 0
    context.buy_attempted_today = False  # 窗口内失败也只盯当天

    log.info('三策略融合版 - 聚宽启动（盯盘实时 / 请用分钟回测）')
    log.info(
        '硬过滤:SOP | 评分:七星50%+接力25%+反向25% | '
        '融合门槛:%s | 弱市涨停<%s空仓' % (
            context.p['融合门槛'], context.p['涨停家数阈值']
        )
    )
    log.info(
        '仓位:单只%.0f%% 最多%d只 总仓≤%.0f%% | 止损%.0f%% +%.0f%%卖半 +%.0f%%清仓' % (
            context.p['单只仓位'] * 100,
            context.p['最大持仓数'],
            context.p['总仓位上限'] * 100,
            abs(context.p['止损线']) * 100,
            context.p['止盈线1'] * 100,
            context.p['止盈线2'] * 100,
        )
    )
    log.info(
        '盯盘: 买入%02d:%02d-%02d:%02d按现价; 持仓每分钟检查止盈止损; 周五%02d:%02d强制清仓' % (
            context.p['买入窗口开始'].hour, context.p['买入窗口开始'].minute,
            context.p['买入窗口结束'].hour, context.p['买入窗口结束'].minute,
            context.p['周五清仓时点'].hour, context.p['周五清仓时点'].minute,
        )
    )
    log.info('=' * 60)

    # 盘前选股仍按日切；买卖全部走 handle_data 分钟盯盘
    run_daily(before_market_open, time='09:00')
    run_daily(after_trading_end, time='15:30')


def handle_data(context, data):
    """
    分钟回测：每根分钟K线调用一次，模拟盯盘实时交易。
    日线回测：每天只调用一次，无法还原盘中止盈止损路径。
    """
    now_t = context.current_dt.time()

    # 非连续竞价时段不交易（含午休）
    if now_t < dt_time(9, 30) or now_t > dt_time(14, 57):
        return
    if dt_time(11, 30) < now_t < dt_time(13, 0):
        return

    # 1) 持仓：每分钟按最新价检查止损/止盈/到期/周五清仓
    monitor_positions(context)

    # 2) 买入窗口内盯盘尝试建仓（现价落入区间才买）
    if context.p['买入窗口开始'] <= now_t <= context.p['买入窗口结束']:
        try_buy_intraday(context)


# ===================== 选股 =====================
def before_market_open(context):
    if context.cooldown_days > 0:
        context.cooldown_days -= 1
    context.buy_attempted_today = False
    context.selected_stock = None
    context.selected_score = 0
    context.selected_detail = ''

    yesterday = context.previous_date
    zt_stocks = get_zt_stocks(context, yesterday)
    context.zt_count = len(zt_stocks)
    log.info('昨日涨停股: %d只' % context.zt_count)

    if context.zt_count < context.p['涨停家数阈值']:
        context.market_state = 'weak'
        context.selected_stock = None
        log.info(
            '弱市空仓: 涨停%d家 < 阈值%d家' % (
                context.zt_count, context.p['涨停家数阈值']
            )
        )
        return

    context.market_state = 'normal'
    sector_counts = count_sector_limit_ups(zt_stocks, yesterday)
    scored = []
    for stock in zt_stocks:
        if stock in context.holdings:
            continue
        try:
            ok, reason = pass_sop_hard_filters(
                context, stock, yesterday, sector_counts
            )
            if not ok:
                continue
            detail = calc_fused_score(
                context, stock, yesterday, sector_counts, context.zt_count
            )
            if detail is None:
                continue
            if detail['融合分'] >= context.p['融合门槛']:
                scored.append((stock, detail))
        except Exception as e:
            log.warn('评分跳过 %s: %s' % (stock, e))
            continue

    if not scored:
        context.selected_stock = None
        log.info('无融合分≥%s 的标的' % context.p['融合门槛'])
        return

    scored.sort(key=lambda x: x[1]['融合分'], reverse=True)
    stock, detail = scored[0]
    context.selected_stock = stock
    context.selected_score = detail['融合分']
    context.selected_detail = (
        '融合%.0f=SOP%.0f×50%%+接力%.0f×25%%+反向%.0f×25%%' % (
            detail['融合分'], detail['SOP'], detail['接力'], detail['反向']
        )
    )
    log.info(
        '选中: %s %s (候选%d只)' % (
            stock, context.selected_detail, len(scored)
        )
    )


def get_zt_stocks(context, date):
    stocks = get_all_securities(['stock'], date=date)
    if context.p['ST排除']:
        stocks = stocks[~stocks['display_name'].str.contains(r'ST|\*ST', na=False)]
    stock_list = stocks.index.tolist()
    if not stock_list:
        return []

    # 分批取价，避免一次过大
    zt = []
    batch = 800
    for i in range(0, len(stock_list), batch):
        part = stock_list[i:i + batch]
        price_df = get_price(
            part, end_date=date, frequency='daily',
            fields=['close', 'high', 'low', 'pre_close', 'volume', 'paused'],
            count=1, skip_paused=False, panel=False
        )
        if price_df is None or len(price_df) == 0:
            continue
        for _, row in price_df.iterrows():
            if row.get('paused', 0) == 1:
                continue
            pre = row.get('pre_close')
            if pre is None or pd.isna(pre) or pre <= 0:
                continue
            # 用接近涨停阈值；创业板/科创板放宽到约19.5%
            code = row['code']
            thr = 0.195 if str(code)[:3] in ('300', '301', '688') else 0.095
            pct = (row['close'] - pre) / pre
            if pct >= thr:
                zt.append(code)
    return zt


def count_sector_limit_ups(zt_stocks, date):
    counter = Counter()
    for stock in zt_stocks:
        try:
            info = get_industry(stock, date=date)
            name = '未分类'
            if info and stock in info:
                # 优先申万一级
                block = info[stock]
                for key in ('sw_l1', 'sw_l2', 'jq_l1', 'jq_l2'):
                    if key in block and block[key].get('industry_name'):
                        name = block[key]['industry_name']
                        break
            counter[name] += 1
        except Exception:
            counter['未分类'] += 1
    return counter


def get_float_cap_and_turnover(stock, date):
    """流通市值(亿)、换手率(%)."""
    q = query(valuation).filter(valuation.code == stock)
    df = get_fundamentals(q, date=date)
    if df is None or len(df) == 0:
        return None, None
    row = df.iloc[0]
    cap = float(row['circulating_market_cap']) if 'circulating_market_cap' in row else None
    turn = float(row['turnover_ratio']) if 'turnover_ratio' in row else None
    return cap, turn


def calc_board_count(stock, date, max_lookback=10):
    """向前统计连续涨停板数（含date当日）。"""
    hist = get_price(
        stock, end_date=date, frequency='daily',
        fields=['close', 'high', 'pre_close'],
        count=max_lookback, skip_paused=True
    )
    if hist is None or len(hist) == 0:
        return 0
    boards = 0
    for i in range(len(hist) - 1, -1, -1):
        row = hist.iloc[i]
        pre = row['pre_close']
        if pre is None or pd.isna(pre) or pre <= 0:
            break
        thr = 0.195 if stock[:3] in ('300', '301', '688') else 0.095
        # 收盘接近涨停或最高触及涨停视为板
        if row['close'] / pre - 1 >= thr * 0.98 or row['high'] / pre - 1 >= thr:
            boards += 1
        else:
            break
    return boards


def first_seal_time(stock, date):
    """用1分钟线估计首次触及涨停的时间；失败返回 None。"""
    try:
        bars = get_price(
            stock, start_date=date, end_date=date,
            frequency='1m', fields=['close', 'high', 'open'],
            skip_paused=True
        )
        if bars is None or len(bars) == 0:
            return None
        daily = get_price(
            stock, end_date=date, frequency='daily',
            fields=['pre_close'], count=1, skip_paused=True
        )
        if daily is None or len(daily) == 0:
            return None
        pre = float(daily['pre_close'][-1])
        thr = 0.195 if stock[:3] in ('300', '301', '688') else 0.095
        limit_price = pre * (1 + thr)
        for ts, row in bars.iterrows():
            if row['high'] >= limit_price * 0.998 or row['close'] >= limit_price * 0.998:
                if hasattr(ts, 'time'):
                    return ts.time()
                return pd.Timestamp(ts).time()
    except Exception:
        return None
    return None


def pass_sop_hard_filters(context, stock, date, sector_counts):
    p = context.p
    boards = calc_board_count(stock, date)
    if not (p['连板下限'] <= boards <= p['连板上限']):
        return False, '连板%d不在%d-%d' % (boards, p['连板下限'], p['连板上限'])

    cap, turn = get_float_cap_and_turnover(stock, date)
    if cap is None or turn is None:
        return False, '缺少市值/换手'
    if cap > p['流通市值硬剔除亿']:
        return False, '市值过大'
    if cap > p['流通市值上限亿']:
        return False, '超过100亿'
    if turn < p['换手下限']:
        return False, '换手不足'
    if cap <= p['小市值亿'] and turn > p['小市值换手上限']:
        return False, '小市值高换手'

    seal_t = first_seal_time(stock, date)
    if seal_t is None:
        # 分钟线缺失时，用“收盘仍封住”近似通过，但不给开阳满分
        hist = get_price(
            stock, end_date=date, frequency='daily',
            fields=['close', 'high', 'pre_close'], count=1, skip_paused=True
        )
        if hist is None or len(hist) == 0:
            return False, '无价格'
        pre = float(hist['pre_close'][-1])
        thr = 0.195 if stock[:3] in ('300', '301', '688') else 0.095
        if float(hist['close'][-1]) / pre - 1 < thr * 0.98:
            return False, '未封住收盘'
    elif seal_t > p['最晚封板时点']:
        return False, '封板过晚'

    # 行业
    try:
        info = get_industry(stock, date=date)
        sector = '未分类'
        if info and stock in info:
            block = info[stock]
            for key in ('sw_l1', 'sw_l2', 'jq_l1', 'jq_l2'):
                if key in block and block[key].get('industry_name'):
                    sector = block[key]['industry_name']
                    break
    except Exception:
        sector = '未分类'
    if sector_counts.get(sector, 0) < p['板块最少涨停']:
        return False, '板块涨停不足'

    return True, ''


# ===================== 三套评分 =====================
def score_sop_seven_star(context, stock, date, sector_counts, market_zt_count):
    """七星代理分（0-100）。"""
    hist = get_price(
        stock, end_date=date, frequency='daily',
        fields=['close', 'high', 'low', 'open', 'volume', 'money', 'pre_close'],
        count=20, skip_paused=True
    )
    if hist is None or len(hist) < 2:
        return 0

    latest = hist.iloc[-1]
    pre = float(latest['pre_close'])
    amount = float(latest['money']) if 'money' in hist.columns else 0.0
    # 封单无直接字段：用收盘封板强度近似（收盘/最高接近1 + 成交额）
    close_seal = 1.0 if float(latest['close']) >= float(latest['high']) * 0.995 else 0.4
    seal_ratio = close_seal

    # 资金流
    try:
        mf = get_money_flow(
            security_list=[stock], start_date=date, end_date=date,
            fields=['net_mf_amount', 'buy_elg_amount', 'sell_elg_amount']
        )
        if mf is not None and len(mf) > 0:
            buy_elg = float(mf.iloc[0].get('buy_elg_amount', 0) or 0)
            sell_elg = float(mf.iloc[0].get('sell_elg_amount', 0) or 0)
            total = buy_elg + sell_elg
            if total > 0:
                seal_ratio = max(seal_ratio, (buy_elg - sell_elg) / total)
    except Exception:
        pass

    boards = calc_board_count(stock, date)
    _, turn = get_float_cap_and_turnover(stock, date)
    turn = float(turn or 0)
    seal_t = first_seal_time(stock, date)
    first_min = 15 * 60
    if seal_t is not None:
        first_min = seal_t.hour * 60 + seal_t.minute

    try:
        info = get_industry(stock, date=date)
        sector = '未分类'
        if info and stock in info:
            block = info[stock]
            for key in ('sw_l1', 'sw_l2', 'jq_l1', 'jq_l2'):
                if key in block and block[key].get('industry_name'):
                    sector = block[key]['industry_name']
                    break
    except Exception:
        sector = '未分类'
    sector_count = int(sector_counts.get(sector, 0))

    # 天枢15
    if seal_ratio >= 0.8:
        tian_shu = 15
    elif seal_ratio >= 0.35:
        tian_shu = 12
    elif seal_ratio >= 0.15:
        tian_shu = 8
    else:
        tian_shu = 4

    # 天璇15
    if sector_count >= 6:
        tian_xuan = 15
    elif sector_count >= 4:
        tian_xuan = 12
    elif sector_count >= 3:
        tian_xuan = 9
    else:
        tian_xuan = 3

    # 天玑10
    if market_zt_count >= 80:
        tian_ji = 8
    elif market_zt_count >= 50:
        tian_ji = 9
    elif market_zt_count >= 30:
        tian_ji = 7
    else:
        tian_ji = 3
    if close_seal >= 0.9:
        tian_ji = min(10, tian_ji + 1)

    # 天权15
    resonance = 0
    if 5 <= turn <= 25:
        resonance += 1
    if seal_ratio >= 0.35:
        resonance += 1
    if first_min < 14 * 60:
        resonance += 1
    if close_seal >= 0.9:
        resonance += 1
    tian_quan = {0: 3, 1: 6, 2: 10, 3: 13, 4: 15}[resonance]

    # 玉衡20
    if boards == 2:
        yu_heng = 16
    elif boards == 3:
        yu_heng = 14
    elif boards == 4:
        yu_heng = 10
    else:
        yu_heng = 4
    if amount >= 2e8:
        yu_heng = min(20, yu_heng + 2)

    # 开阳15
    if first_min <= 600:
        kai_yang = 15
    elif first_min <= 660:
        kai_yang = 12
    elif first_min < 14 * 60:
        kai_yang = 8
    else:
        kai_yang = 2

    # 摇光10
    if close_seal >= 0.9 and boards in (2, 3):
        yao_guang = 9
    elif close_seal >= 0.9:
        yao_guang = 7
    else:
        yao_guang = 3

    return float(min(100, tian_shu + tian_xuan + tian_ji + tian_quan + yu_heng + kai_yang + yao_guang))


def score_relay(context, stock, date, sector_counts):
    """经典涨停接力代理分（0-100）。"""
    score = 40.0
    hist = get_price(
        stock, end_date=date, frequency='daily',
        fields=['close', 'high', 'open', 'pre_close', 'money'],
        count=5, skip_paused=True
    )
    if hist is None or len(hist) == 0:
        return 0
    latest = hist.iloc[-1]
    boards = calc_board_count(stock, date)
    seal_t = first_seal_time(stock, date)
    first_min = 15 * 60 if seal_t is None else seal_t.hour * 60 + seal_t.minute
    unbroken = float(latest['close']) >= float(latest['high']) * 0.995

    try:
        info = get_industry(stock, date=date)
        sector = '未分类'
        if info and stock in info:
            block = info[stock]
            for key in ('sw_l1', 'sw_l2', 'jq_l1', 'jq_l2'):
                if key in block and block[key].get('industry_name'):
                    sector = block[key]['industry_name']
                    break
    except Exception:
        sector = '未分类'
    sector_count = int(sector_counts.get(sector, 0))

    if sector_count >= 3:
        score += max(0.0, 22.0 - max(0, 8 - sector_count) * 2.0)
    elif sector_count > 0:
        score += 8.0
    else:
        score -= 6.0

    if first_min <= 600:
        score += 18.0
    elif first_min <= 660:
        score += 12.0
    elif first_min <= 810:
        score += 5.0
    else:
        score -= 8.0

    score += 12.0 if unbroken else -6.0

    if boards == 1:
        score += 10.0
    elif boards == 2:
        score += 14.0
    elif boards == 3:
        score += 8.0
    elif boards == 4:
        score += 2.0
    else:
        score -= 8.0

    if stock[:3] in ('300', '301', '688'):
        score -= 3.0

    return float(max(1.0, min(99.0, score)))


def score_v31_reverse(context, stock, date):
    """V31反向多因子（0-100）。"""
    score = 0.0
    price_df = get_price(
        stock, end_date=date, frequency='daily',
        fields=['close', 'volume', 'money', 'high', 'low', 'pre_close', 'open'],
        count=25, skip_paused=True
    )
    if price_df is None or len(price_df) < 2:
        return 0

    # 资金
    try:
        mf = get_money_flow(
            security_list=[stock], start_date=date, end_date=date,
            fields=['net_mf_amount', 'buy_elg_amount', 'sell_elg_amount',
                    'buy_lg_amount', 'sell_lg_amount']
        )
        if mf is not None and len(mf) > 0:
            row = mf.iloc[0]
            buy_elg = float(row.get('buy_elg_amount', 0) or 0)
            sell_elg = float(row.get('sell_elg_amount', 0) or 0)
            total_elg = buy_elg + sell_elg
            elg_ratio = ((buy_elg - sell_elg) / total_elg * 100) if total_elg > 0 else 0
            score += max(min(elg_ratio / 20 * 12 + 12, 24), 0)
            net_mf = float(row.get('net_mf_amount', 0) or 0)
            buy_lg = float(row.get('buy_lg_amount', 0) or 0)
            sell_lg = float(row.get('sell_lg_amount', 0) or 0)
            total_mf = buy_lg + sell_lg + total_elg
            mf_ratio = (net_mf / total_mf * 100) if total_mf > 0 else 0
            score += max(min(mf_ratio / 20 * 10 + 10, 20), 0)
            score += 8 if net_mf > 0 else 4
        else:
            score += 20
    except Exception:
        score += 20

    # 量能（反向：突然放量）
    try:
        latest_vol = float(price_df['volume'][-1])
        avg_vol_5 = float(price_df['volume'][-5:].mean()) if len(price_df) >= 5 else float(price_df['volume'].mean())
        turnover_approx = latest_vol / avg_vol_5 if avg_vol_5 > 0 else 1
        score += 8 if turnover_approx > 3 else (6 if turnover_approx > 1.5 else 3)
        vol_ratio = latest_vol / float(price_df['volume'][-2]) if len(price_df) >= 2 else 1
        score += 8 if vol_ratio > 2 else (6 if vol_ratio > 1 else 3)
        if vol_ratio > 2:
            score += 4
        elif vol_ratio > 1.5:
            score += 3
        elif vol_ratio > 1:
            score += 2
    except Exception:
        score += 10

    # 波动率（反向：高波动）
    try:
        if len(price_df) >= 20:
            returns = price_df['close'].pct_change().dropna()
            vol_20d = float(returns.std() * np.sqrt(250) * 100)
            if vol_20d > 50:
                score += 8
            elif vol_20d > 35:
                score += 6
            elif vol_20d > 25:
                score += 4
            elif vol_20d > 15:
                score += 2
        else:
            score += 5
        latest = price_df.iloc[-1]
        t_amp = (float(latest['high']) - float(latest['low'])) / float(latest['close']) * 100
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

    # 形态
    try:
        lianban = calc_board_count(stock, date)
        score += 8 if lianban >= 3 else (5 if lianban >= 2 else 3)
        latest_high = float(price_df['high'][-1])
        latest_close = float(price_df['close'][-1])
        is_zhaban = latest_high >= latest_close * 1.02
        score += 5 if not is_zhaban else 2
        pre_c = float(price_df['pre_close'][-1])
        is_yizi = float(price_df['open'][-1]) >= pre_c * 1.095
        score += 2 if is_yizi else 0
    except Exception:
        score += 8

    # 位置（反向：突破/正乖离）
    try:
        if len(price_df) >= 20:
            high_20 = float(price_df['high'][-20:].max())
            low_20 = float(price_df['low'][-20:].min())
            current = float(price_df['close'][-1])
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
        if len(price_df) >= 5:
            ma5 = float(price_df['close'][-5:].mean())
            bias = (float(price_df['close'][-1]) - ma5) / ma5 * 100
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

    # 行业占位
    score += 8
    return float(min(100, int(score)))


def calc_fused_score(context, stock, date, sector_counts, market_zt_count):
    p = context.p
    sop = score_sop_seven_star(context, stock, date, sector_counts, market_zt_count)
    relay = score_relay(context, stock, date, sector_counts)
    reverse = score_v31_reverse(context, stock, date)
    if sop < p['SOP底线'] or relay < p['接力底线'] or reverse < p['反向底线']:
        return None
    fused = (
        sop * p['SOP权重'] +
        relay * p['接力权重'] +
        reverse * p['反向权重']
    )
    return {
        '融合分': float(min(100, fused)),
        'SOP': float(sop),
        '接力': float(relay),
        '反向': float(reverse),
    }


# ===================== 盯盘实时交易 =====================
def _trading_hold_days(context, buy_date):
    """按交易日计持有天数（买入日=0）。"""
    try:
        days = get_trade_days(start_date=buy_date, end_date=context.current_dt.date())
        return max(0, len(days) - 1)
    except Exception:
        return max(0, (context.current_dt.date() - buy_date).days)


def try_buy_intraday(context):
    """买入窗口内按最新价盯盘建仓（可多分钟重试，直到买到或窗口结束）。"""
    weekday = context.current_dt.weekday()
    if weekday not in (0, 1, 2, 3):
        return
    if context.market_state == 'weak':
        return
    if context.cooldown_days > 0:
        return
    if len(context.holdings) >= context.p['最大持仓数']:
        return

    today_str = context.current_dt.strftime('%Y-%m-%d')
    if context.last_buy_date == today_str:
        return
    if not context.selected_stock:
        return

    portfolio_value = context.portfolio.total_value
    current_position_value = portfolio_value - context.portfolio.available_cash
    if portfolio_value > 0 and current_position_value / portfolio_value >= context.p['总仓位上限']:
        return

    stock = context.selected_stock
    try:
        current_data = get_current_data()[stock]
        if current_data.paused:
            return
        # 盯盘用最新价；开盘瞬间 last_price 可能仍接近开盘价
        px = float(current_data.last_price or 0)
        if px <= 0:
            px = float(current_data.day_open or 0)
        if px <= 0:
            return

        try:
            price_df = get_price(
                stock, end_date=context.previous_date,
                frequency='daily', fields=['close'],
                count=1, skip_paused=True
            )
            pre_close = float(price_df['close'][-1]) if price_df is not None and len(price_df) else px / 1.05
        except Exception:
            pre_close = px / 1.05

        chg = (px - pre_close) / pre_close
        if chg > context.p['开盘买入上限'] or chg < context.p['开盘买入下限']:
            # 窗口内继续盯，下一分钟可能回落到区间
            return

        # 涨停买不进则放弃本分钟
        if getattr(current_data, 'high_limit', None) and px >= float(current_data.high_limit) * 0.999:
            return

        available_cash = context.portfolio.available_cash * 0.98
        target_value = min(portfolio_value * context.p['单只仓位'], available_cash)
        buy_price = px * 1.002  # 轻微滑点
        shares = int(target_value / buy_price / 100) * 100
        if shares <= 0:
            return
        actual_value = shares * buy_price
        if actual_value > context.portfolio.available_cash:
            shares = int(context.portfolio.available_cash * 0.97 / buy_price / 100) * 100
            if shares <= 0:
                return
            actual_value = shares * buy_price

        order(stock, shares)
        context.holdings[stock] = {
            'cost': buy_price,
            'buy_date': context.current_dt.date(),
            'half_sold': False,
            'initial_shares': shares,
        }
        context.last_buy_date = today_str
        context.buy_attempted_today = True
        log.info(
            '★ 盯盘买入 %s @ %.2f (现价涨跌%.2f%%) 股数:%d 金额:%.0f %s 时间:%s (持仓%d/%d)' % (
                stock, buy_price, chg * 100, shares, actual_value,
                context.selected_detail,
                context.current_dt.strftime('%H:%M'),
                len(context.holdings), context.p['最大持仓数']
            )
        )
    except Exception as e:
        log.error('盯盘买入失败 %s: %s' % (stock, e))


def sync_holdings(context):
    actual = set()
    for stock, pos in context.portfolio.positions.items():
        if pos.total_amount > 0:
            actual.add(stock)
            if stock not in context.holdings:
                context.holdings[stock] = {
                    'cost': pos.avg_cost,
                    'buy_date': context.current_dt.date(),
                    'half_sold': False,
                    'initial_shares': pos.total_amount,
                }
                log.info('⚠ 同步遗漏持仓: %s' % stock)
    for stock in list(context.holdings.keys()):
        if stock not in actual:
            del context.holdings[stock]


def _mark_loss_and_maybe_cooldown(context, pnl_pct):
    if pnl_pct < 0:
        context.consecutive_losses += 1
        if context.consecutive_losses >= context.p['连亏触发次数']:
            context.cooldown_days = context.p['连亏冷却天数']
            log.info('触发连亏冷却,%d天' % context.cooldown_days)
    else:
        context.consecutive_losses = 0


def monitor_positions(context):
    """每分钟盯盘：按最新价触发止损/止盈/到期；周五指定时点后强制清仓。"""
    if not context.holdings and not context.portfolio.positions:
        return
    sync_holdings(context)
    if not context.holdings:
        return

    now_t = context.current_dt.time()
    is_friday = context.current_dt.weekday() == 4
    force_friday_clear = is_friday and now_t >= context.p['周五清仓时点']

    # 冷却：一旦触发，盘中立即清仓（不等到收盘）
    if context.cooldown_days > 0 and len(context.holdings) > 0:
        log.info('⚡ 冷却盯盘清仓 %d只 @ %s' % (
            len(context.holdings), context.current_dt.strftime('%H:%M')
        ))
        for stock in list(context.holdings.keys()):
            _force_exit(context, stock, '冷却清仓')
        return

    for stock in list(context.holdings.keys()):
        try:
            holding = context.holdings[stock]
            current_data = get_current_data()[stock]
            if current_data.paused:
                continue
            current_price = float(current_data.last_price or 0)
            if current_price <= 0:
                continue
            pos = context.portfolio.positions.get(stock)
            if pos is None or pos.total_amount == 0:
                context.holdings.pop(stock, None)
                continue
            # T+1：当日买入不可卖
            sellable = pos.sellable_amount
            if sellable <= 0:
                continue

            cost = pos.avg_cost
            pnl_pct = (current_price - cost) / cost if cost else 0.0
            holding['cost'] = cost
            hold_days = _trading_hold_days(context, holding['buy_date'])

            # 周五尾盘强制清仓（盘中仍优先走止盈止损）
            if force_friday_clear:
                order_target(stock, 0)
                log.info(
                    '□ 周五盯盘清仓 %s @ %.2f 盈亏:%.2f%% 持有%d日 %s' % (
                        stock, current_price, pnl_pct * 100, hold_days,
                        context.current_dt.strftime('%H:%M')
                    )
                )
                _mark_loss_and_maybe_cooldown(context, pnl_pct)
                context.holdings.pop(stock, None)
                continue

            if pnl_pct <= context.p['止损线']:
                order_target(stock, 0)
                log.info(
                    '× 盯盘止损 %s @ %.2f 盈亏:%.2f%% %s' % (
                        stock, current_price, pnl_pct * 100,
                        context.current_dt.strftime('%H:%M')
                    )
                )
                _mark_loss_and_maybe_cooldown(context, pnl_pct)
                context.holdings.pop(stock, None)
                continue

            if pnl_pct >= context.p['止盈线1'] and not holding['half_sold']:
                half_shares = (sellable // 2 // 100) * 100
                if half_shares > 0:
                    order(stock, -half_shares)
                    holding['half_sold'] = True
                    log.info(
                        '◇ 盯盘止盈卖半 %s @ %.2f 盈亏:%.2f%% %s' % (
                            stock, current_price, pnl_pct * 100,
                            context.current_dt.strftime('%H:%M')
                        )
                    )
                continue

            if pnl_pct >= context.p['止盈线2']:
                order_target(stock, 0)
                log.info(
                    '○ 盯盘止盈清仓 %s @ %.2f 盈亏:%.2f%% %s' % (
                        stock, current_price, pnl_pct * 100,
                        context.current_dt.strftime('%H:%M')
                    )
                )
                context.consecutive_losses = 0
                context.holdings.pop(stock, None)
                continue

            if hold_days >= context.p['最大持有交易日']:
                order_target(stock, 0)
                log.info(
                    '□ 盯盘到期清仓 %s @ %.2f 盈亏:%.2f%% 持有%d日 %s' % (
                        stock, current_price, pnl_pct * 100, hold_days,
                        context.current_dt.strftime('%H:%M')
                    )
                )
                _mark_loss_and_maybe_cooldown(context, pnl_pct)
                context.holdings.pop(stock, None)
                continue
        except Exception as e:
            log.error('盯盘卖出检查失败 %s: %s' % (stock, e))


def _force_exit(context, stock, tag):
    try:
        current_data = get_current_data()[stock]
        if current_data.paused:
            return
        pos = context.portfolio.positions.get(stock)
        if pos is None or pos.total_amount == 0:
            context.holdings.pop(stock, None)
            return
        if pos.sellable_amount <= 0:
            return
        px = float(current_data.last_price or 0)
        order_target(stock, 0)
        log.info('  ⚡ %s %s @ %.2f %s' % (
            tag, stock, px, context.current_dt.strftime('%H:%M')
        ))
        context.holdings.pop(stock, None)
    except Exception as e:
        log.error('%s失败 %s: %s' % (tag, stock, e))


def after_trading_end(context):
    sync_holdings(context)
    if context.holdings:
        log.info('当前持仓: %d只' % len(context.holdings))
        for stock, h in context.holdings.items():
            pos = context.portfolio.positions.get(stock)
            if pos and pos.total_amount > 0:
                pnl = (pos.price - h['cost']) / h['cost'] * 100
                log.info(
                    '  %s 成本:%.2f 现价:%.2f 盈亏:%+.2f%% 股数:%d' % (
                        stock, h['cost'], pos.price, pnl, pos.total_amount
                    )
                )
    else:
        log.info('空仓')
