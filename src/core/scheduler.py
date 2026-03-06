"""
定时任务调度器
管理所有定时任务
"""

import schedule
import time
import threading
from datetime import datetime

class TaskScheduler:
    """任务调度器"""
    
    def __init__(self):
        self.running = False
        self.thread = None
        
    def setup_default_tasks(self):
        """设置默认定时任务"""
        # 早盘报告 - 每天9:00
        schedule.every().day.at("09:00").do(self._morning_report)
        
        # 收盘复盘 - 每天16:00
        schedule.every().day.at("16:00").do(self._daily_review)
        
        # RSS监控 - 每2小时
        schedule.every(2).hours.do(self._rss_monitor)
        
        print("✅ 定时任务已设置")
        
    def _morning_report(self):
        """早盘报告任务"""
        print(f"[{datetime.now()}] 执行早盘报告...")
        try:
            from agents.alex import Alex
            alex = Alex()
            alex.generate_morning_report()
        except Exception as e:
            print(f"❌ 早盘报告失败: {e}")
    
    def _daily_review(self):
        """收盘复盘任务"""
        print(f"[{datetime.now()}] 执行收盘复盘...")
        try:
            from agents.alex import Alex
            alex = Alex()
            alex.generate_daily_review()
        except Exception as e:
            print(f"❌ 收盘复盘失败: {e}")
    
    def _rss_monitor(self):
        """RSS监控任务"""
        print(f"[{datetime.now()}] 执行RSS监控...")
        try:
            from tools.rss_monitor import run_rss_monitor
            run_rss_monitor()
        except Exception as e:
            print(f"❌ RSS监控失败: {e}")
    
    def start(self):
        """启动调度器"""
        self.setup_default_tasks()
        self.running = True
        self.thread = threading.Thread(target=self._run)
        self.thread.daemon = True
        self.thread.start()
        
    def _run(self):
        """运行循环"""
        while self.running:
            schedule.run_pending()
            time.sleep(60)  # 每分钟检查一次
    
    def stop(self):
        """停止调度器"""
        self.running = False
        if self.thread:
            self.thread.join()