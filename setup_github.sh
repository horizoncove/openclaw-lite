#!/bin/bash
# OpenClaw Lite GitHub一键配置脚本
# 使用方法：
# 1. 先在GitHub创建账号和仓库 openclaw-lite
# 2. 修改下面的 GITHUB_USERNAME 和 GITHUB_EMAIL
# 3. 运行：bash setup_github.sh

# ========== 配置区（请修改）==========
GITHUB_USERNAME="yourusername"      # 你的GitHub用户名
GITHUB_EMAIL="your-email@example.com"  # 你的邮箱
REPO_NAME="openclaw-lite"           # 仓库名
# =====================================

echo "🚀 OpenClaw Lite GitHub配置脚本"
echo "================================"
echo ""

# 检查配置是否修改
if [ "$GITHUB_USERNAME" = "yourusername" ]; then
    echo "❌ 错误：请先修改脚本中的 GITHUB_USERNAME"
    exit 1
fi

if [ "$GITHUB_EMAIL" = "your-email@example.com" ]; then
    echo "❌ 错误：请先修改脚本中的 GITHUB_EMAIL"
    exit 1
fi

# 1. 安装Git
echo "📦 步骤1：安装Git..."
if ! command -v git &> /dev/null; then
    apt-get update -qq
    apt-get install -y git
fi
echo "✅ Git已安装"

# 2. 配置Git身份
echo "📦 步骤2：配置Git身份..."
git config --global user.name "$GITHUB_USERNAME"
git config --global user.email "$GITHUB_EMAIL"
echo "✅ Git身份已配置"

# 3. 进入项目目录
cd /root/.openclaw/workspace/openclaw-lite

# 4. 初始化Git仓库
echo "📦 步骤3：初始化Git仓库..."
if [ -d ".git" ]; then
    echo "ℹ️ Git仓库已存在，跳过初始化"
else
    git init
    echo "✅ Git仓库已初始化"
fi

# 5. 添加所有文件
echo "📦 步骤4：添加文件到Git..."
git add .
echo "✅ 文件已添加"

# 6. 提交代码
echo "📦 步骤5：提交代码..."
git commit -m "Initial commit: OpenClaw Lite v1.0

- 量化交易助手 (Alex)
- 剧本创作助手 (Shakespeare)
- RSS订阅监控
- 双AI引擎 (DeepSeek + 通义千问)
- 定时任务调度
- Excel自动化报告

功能完整，文档齐全，开箱即用。"
echo "✅ 代码已提交"

# 7. 关联远程仓库
echo "📦 步骤6：关联远程仓库..."
# 先删除已存在的remote（如果有）
git remote remove origin 2>/dev/null || true
# 添加新的remote
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo "✅ 远程仓库已关联"

# 8. 推送代码
echo "📦 步骤7：推送代码到GitHub..."
echo "📝 提示：如果提示输入密码，请输入GitHub个人访问令牌(PAT)"
echo "   获取方式：GitHub → Settings → Developer settings → Personal access tokens"
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "================================"
    echo "🎉 上传成功！"
    echo ""
    echo "📎 项目地址："
    echo "   https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    echo ""
    echo "📋 下一步建议："
    echo "   1. 去GitHub完善项目描述"
    echo "   2. 添加Topics标签（python, ai, trading等）"
    echo "   3. 发布Release版本"
    echo "================================"
else
    echo ""
    echo "❌ 推送失败，可能原因："
    echo "   1. 仓库不存在（请先在GitHub创建）"
    echo "   2. 用户名或仓库名错误"
    echo "   3. 需要GitHub Token（不是密码）"
    echo ""
    echo "💡 解决："
    echo "   - 访问 https://github.com/new 创建仓库"
    echo "   - 或使用SSH方式（更安全）"
fi