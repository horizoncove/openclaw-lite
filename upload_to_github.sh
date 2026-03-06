#!/bin/bash
# ============================================================
# OpenClaw Lite - GitHub上传一键脚本
# 使用方法：
# 1. 先注册GitHub账号：https://github.com/signup
# 2. 创建仓库：https://github.com/new （仓库名：openclaw-lite）
# 3. 修改下面的 USERNAME 和 EMAIL
# 4. 运行：bash upload_to_github.sh
# ============================================================

# ========== 修改这里 ==========
USERNAME="你的GitHub用户名"      # 例如：zhangsan
EMAIL="你的GitHub邮箱"           # 例如：zhangsan@qq.com
# ==============================

echo ""
echo "🚀 OpenClaw Lite GitHub上传脚本"
echo "================================"
echo ""

# 检查是否修改了配置
if [ "$USERNAME" = "你的GitHub用户名" ]; then
    echo "❌ 请先修改脚本中的 USERNAME"
    echo "   用编辑器打开此文件，替换'你的GitHub用户名'"
    exit 1
fi

if [ "$EMAIL" = "你的GitHub邮箱" ]; then
    echo "❌ 请先修改脚本中的 EMAIL"
    exit 1
fi

echo "📋 配置信息："
echo "   用户名: $USERNAME"
echo "   邮箱: $EMAIL"
echo "   仓库: openclaw-lite"
echo ""

# 步骤1：配置Git
echo "步骤 1/5: 配置Git身份..."
git config --global user.name "$USERNAME"
git config --global user.email "$EMAIL"
echo "✅ Git身份配置完成"
echo ""

# 步骤2：进入目录
echo "步骤 2/5: 进入项目目录..."
cd /root/.openclaw/workspace/openclaw-lite
echo "✅ 已进入目录"
echo ""

# 步骤3：初始化Git
echo "步骤 3/5: 初始化Git仓库..."
if [ -d ".git" ]; then
    echo "ℹ️  Git仓库已存在，跳过"
else
    git init
    echo "✅ Git仓库初始化完成"
fi
echo ""

# 步骤4：添加并提交代码
echo "步骤 4/5: 添加文件并提交..."
git add .
git commit -m "Initial commit: OpenClaw Lite v1.0

个人AI管家系统，功能包括：
- 量化交易助手 (Alex)
- 剧本创作助手 (Shakespeare)  
- RSS订阅监控
- 双AI引擎 (DeepSeek + 通义千问)
- 定时任务调度
- Excel自动化报告

开箱即用，文档齐全。"
echo "✅ 代码已提交"
echo ""

# 步骤5：推送到GitHub
echo "步骤 5/5: 推送到GitHub..."
echo "📝 提示：如果要求输入密码，请使用GitHub Token（不是登录密码）"
echo "   获取Token：GitHub → Settings → Developer settings → Personal access tokens"
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/$USERNAME/openclaw-lite.git
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "================================"
    echo "🎉 上传成功！"
    echo ""
    echo "📎 项目地址："
    echo "   https://github.com/$USERNAME/openclaw-lite"
    echo ""
    echo "📋 建议下一步："
    echo "   1. 访问上方链接查看项目"
    echo "   2. 点击 ⚙️ Settings → 添加Topics标签"
    echo "      建议标签：python ai trading screenplay automation"
    echo "   3. 点击 📎 Releases → Create a new release"
    echo "      版本号：v1.0.0"
    echo "================================"
else
    echo ""
    echo "❌ 上传失败，可能原因："
    echo "   1. GitHub账号未注册"
    echo "   2. 仓库 openclaw-lite 未创建"
    echo "   3. 使用了密码而非Token"
    echo ""
    echo "💡 解决步骤："
    echo "   1. 访问 https://github.com/signup 注册"
    echo "   2. 访问 https://github.com/new 创建仓库"
    echo "   3. 访问 https://github.com/settings/tokens 创建Token"
    echo "   4. 重新运行此脚本"
fi