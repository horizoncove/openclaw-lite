#!/usr/bin/env python3
"""
OpenClaw Lite 安装脚本
"""

import os
import sys
from pathlib import Path

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 10):
        print("❌ 需要Python 3.10或更高版本")
        sys.exit(1)
    print(f"✅ Python版本: {sys.version_info.major}.{sys.version_info.minor}")

def install_dependencies():
    """安装依赖"""
    print("📦 安装依赖...")
    os.system(f"{sys.executable} -m pip install -r requirements.txt")
    print("✅ 依赖安装完成")

def setup_directories():
    """创建必要的目录"""
    dirs = [
        "data",
        "data/scripts",
        "data/reports",
        "logs",
        "config"
    ]
    
    for d in dirs:
        Path(d).mkdir(parents=True, exist_ok=True)
    
    print("✅ 目录结构创建完成")

def create_config():
    """创建配置文件"""
    config_file = Path("config/config.yaml")
    example_file = Path("config/config.example.yaml")
    
    if not config_file.exists() and example_file.exists():
        print("📝 创建配置文件...")
        import shutil
        shutil.copy(example_file, config_file)
        print("✅ 配置文件已创建: config/config.yaml")
        print("⚠️  请编辑 config/config.yaml 填入你的API Key")

def setup_cron():
    """设置定时任务"""
    print("\n⏰ 是否设置定时任务？(y/n)")
    choice = input().lower()
    
    if choice == 'y':
        cron_content = """# OpenClaw Lite 定时任务
0 9 * * 1-5 cd {cwd} && {python} src/main.py --task morning_report
0 16 * * 1-5 cd {cwd} && {python} src/main.py --task daily_review
0 21 * * 5 cd {cwd} && {python} src/main.py --task weekly_report
0 */2 * * * cd {cwd} && {python} src/tools/rss_monitor.py
""".format(cwd=Path.cwd(), python=sys.executable)
        
        print("请手动添加到crontab:")
        print(cron_content)

def main():
    print("🚀 OpenClaw Lite 安装程序")
    print("="*50)
    
    check_python_version()
    install_dependencies()
    setup_directories()
    create_config()
    
    print("\n" + "="*50)
    print("✅ 安装完成！")
    print("\n开始使用:")
    print("  1. 编辑 config/config.yaml 填入API Key")
    print("  2. 运行: python src/main.py --start")
    print("  3. 或运行单个任务: python src/main.py --task weekly_report")
    
    setup_cron()

if __name__ == "__main__":
    main()