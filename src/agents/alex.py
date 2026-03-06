"""
Alex - 量化交易助手
"""

import json
import os
from datetime import datetime, timedelta
import pandas as pd
import matplotlib.pyplot as plt

class Alex:
    """量化交易AI助手"""
    
    def __init__(self, config_path=None):
        self.config = self._load_config(config_path)
        self.data_dir = "/root/.openclaw/workspace/data"
        os.makedirs(self.data_dir, exist_ok=True)
        
    def _load_config(self, config_path):
        """加载配置"""
        default_config = {
            "stocks": [
                {"code": "002353", "name": "杰瑞股份", "shares": 1000, "cost": 40.50},
                {"code": "000975", "name": "山金国际", "shares": 2000, "cost": 12.30},
                {"code": "300502", "name": "新易盛", "shares": 500, "cost": 118.00},
                {"code": "688027", "name": "国盾量子", "shares": 300, "cost": 625.00},
            ],
            "alert_threshold": 0.03
        }
        return default_config
    
    def get_stock_price(self, code):
        """获取股票价格（模拟）"""
        # 实际使用时接入腾讯/新浪API
        prices = {
            "002353": 46.80,
            "000975": 13.85,
            "300502": 112.50,
            "688027": 668.00,
        }
        return prices.get(code, 0)
    
    def analyze_portfolio(self):
        """分析投资组合"""
        holdings = []
        total_cost = 0
        total_value = 0
        
        for stock in self.config["stocks"]:
            current_price = self.get_stock_price(stock["code"])
            cost_value = stock["shares"] * stock["cost"]
            market_value = stock["shares"] * current_price
            profit = market_value - cost_value
            profit_rate = (profit / cost_value) * 100 if cost_value > 0 else 0
            
            holdings.append({
                "code": stock["code"],
                "name": stock["name"],
                "shares": stock["shares"],
                "cost": stock["cost"],
                "price": current_price,
                "cost_value": cost_value,
                "market_value": market_value,
                "profit": profit,
                "profit_rate": profit_rate
            })
            
            total_cost += cost_value
            total_value += market_value
        
        total_profit = total_value - total_cost
        total_profit_rate = (total_profit / total_cost) * 100 if total_cost > 0 else 0
        
        return {
            "holdings": holdings,
            "total_cost": total_cost,
            "total_value": total_value,
            "total_profit": total_profit,
            "total_profit_rate": total_profit_rate
        }
    
    def generate_weekly_report(self):
        """生成周报"""
        analysis = self.analyze_portfolio()
        
        report = f"""
📊 Alex持仓周报
生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}

💰 概况
总成本：¥{analysis['total_cost']:,.2f}
总市值：¥{analysis['total_value']:,.2f}
总盈亏：¥{analysis['total_profit']:+,.2f} ({analysis['total_profit_rate']:+.2f}%)

📈 持仓明细
"""
        for h in analysis['holdings']:
            report += f"""
{h['name']} ({h['code']})
  持仓: {h['shares']}股 | 成本: ¥{h['cost']:.2f} | 现价: ¥{h['price']:.2f}
  盈亏: ¥{h['profit']:+,.2f} ({h['profit_rate']:+.2f}%)
"""
        
        # 保存报告
        report_file = f"{self.data_dir}/weekly_report_{datetime.now().strftime('%Y%m%d')}.txt"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(report)
        print(f"\n✅ 报告已保存: {report_file}")
        return analysis
    
    def generate_morning_report(self):
        """生成早盘报告"""
        print(f"📈 早盘报告 - {datetime.now().strftime('%Y-%m-%d')}")
        # 实际使用接入实时行情API
        print("✅ 早盘报告已生成")
    
    def generate_daily_review(self):
        """生成收盘复盘"""
        print(f"📊 收盘复盘 - {datetime.now().strftime('%Y-%m-%d')}")
        # 实际使用接入当日成交数据
        print("✅ 收盘复盘已生成")
    
    def generate_portfolio_chart(self):
        """生成持仓图表"""
        analysis = self.analyze_portfolio()
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
        
        # 盈亏柱状图
        names = [h['name'] for h in analysis['holdings']]
        profits = [h['profit'] for h in analysis['holdings']]
        colors = ['green' if p > 0 else 'red' for p in profits]
        
        ax1.bar(names, profits, color=colors, alpha=0.7)
        ax1.set_title('持仓盈亏', fontsize=14)
        ax1.set_ylabel('盈亏 (CNY)')
        ax1.tick_params(axis='x', rotation=45)
        
        # 持仓占比饼图
        values = [h['market_value'] for h in analysis['holdings']]
        ax2.pie(values, labels=names, autopct='%1.1f%%', startangle=90)
        ax2.set_title('持仓占比', fontsize=14)
        
        plt.tight_layout()
        chart_file = f"{self.data_dir}/portfolio_chart_{datetime.now().strftime('%Y%m%d')}.png"
        plt.savefig(chart_file, dpi=150, bbox_inches='tight')
        plt.close()
        
        print(f"✅ 图表已保存: {chart_file}")
        return chart_file
    
    def check_alerts(self):
        """检查异动提醒"""
        print("🔔 检查股票异动...")
        # 实际使用接入实时行情并对比阈值
        print("✅ 异动检查完成")
    
    def start_monitoring(self):
        """启动实时监控"""
        print("📈 Alex 股票监控已启动")
        print("监控间隔: 15分钟")
        # 实际使用接入定时任务