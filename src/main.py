#!/usr/bin/env python3
"""
OpenClaw Lite - 个人AI管家
主入口程序
"""

import argparse
import sys
from pathlib import Path

# 添加src到路径
sys.path.insert(0, str(Path(__file__).parent))

from agents.alex import Alex
from agents.shakespeare import Shakespeare
from core.scheduler import TaskScheduler
from core.notifier import Notifier

class OpenClawLite:
    """OpenClaw Lite 主控制器"""
    
    def __init__(self):
        self.alex = Alex()
        self.shakespeare = Shakespeare()
        self.scheduler = TaskScheduler()
        self.notifier = Notifier()
        
    def start_all(self):
        """启动所有服务"""
        print("🚀 OpenClaw Lite 启动中...")
        print("="*50)
        
        # 启动定时任务
        self.scheduler.start()
        
        print("✅ 所有服务已启动")
        print("按 Ctrl+C 停止")
        
        try:
            while True:
                import time
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 正在停止...")
            self.scheduler.stop()
            
    def run_task(self, task_name):
        """运行单个任务"""
        tasks = {
            'morning_report': self.alex.generate_morning_report,
            'daily_review': self.alex.generate_daily_review,
            'weekly_report': self.alex.generate_weekly_report,
            'portfolio_chart': self.alex.generate_portfolio_chart,
            'rss_summary': self._run_rss_summary,
        }
        
        if task_name in tasks:
            print(f"🎯 执行任务: {task_name}")
            tasks[task_name]()
        else:
            print(f"❌ 未知任务: {task_name}")
            print(f"可用任务: {', '.join(tasks.keys())}")
    
    def _run_rss_summary(self):
        """运行RSS总结"""
        from tools.rss_monitor import run_rss_monitor
        run_rss_monitor()
    
    def create_script_blueprint(self, episode, theme, characters):
        """创建剧本大纲"""
        blueprint = self.shakespeare.create_blueprint(
            episode=episode,
            theme=theme,
            characters=characters
        )
        print(f"✅ 剧本大纲已生成: 第{episode}集")
        return blueprint

def main():
    parser = argparse.ArgumentParser(description='OpenClaw Lite - 个人AI管家')
    parser.add_argument('--start', action='store_true', help='启动所有服务')
    parser.add_argument('--task', type=str, help='运行指定任务')
    parser.add_argument('--script', action='store_true', help='创建剧本大纲')
    
    args = parser.parse_args()
    
    claw = OpenClawLite()
    
    if args.start:
        claw.start_all()
    elif args.task:
        claw.run_task(args.task)
    elif args.script:
        # 示例：创建剧本大纲
        claw.create_script_blueprint(
            episode=6,
            theme="真相大白，凶手揭晓，CP终成眷属",
            characters=["李诺", "林默", "苏晚"]
        )
    else:
        parser.print_help()

if __name__ == "__main__":
    main()