# 🏠 回家操作指南 - GitHub上传

> 总耗时：约10分钟 | 难度：⭐⭐（简单）

---

## 📱 第一步：注册GitHub账号（5分钟）

### 1. 访问注册页面
打开浏览器，访问：
```
https://github.com/signup
```

### 2. 填写注册信息
| 项目 | 填写内容 | 示例 |
|:---|:---|:---|
| **Username** | 用户名（唯一）| `openclaw` 或 `yourname` |
| **Email** | 邮箱 | 你的QQ邮箱 |
| **Password** | 密码 | 至少8位，包含大小写+数字 |

### 3. 验证邮箱
- 去邮箱查收GitHub的验证邮件
- 点击邮件中的验证链接

✅ **完成！记住你的用户名**

---

## 📁 第二步：创建仓库（2分钟）

### 1. 登录GitHub
访问：https://github.com/login
输入用户名和密码

### 2. 创建新仓库
点击右上角 **+** 号 → **New repository**

### 3. 填写仓库信息
| 项目 | 填写内容 |
|:---|:---|
| **Repository name** | `openclaw-lite` |
| **Description** | 个人AI管家系统 - 量化交易、剧本创作、RSS监控 |
| **Visibility** | 选择 `Public`（公开）或 `Private`（私有）|
| **Add a README** | ✅ 勾选 |

### 4. 点击创建
点击绿色按钮 **Create repository**

✅ **完成！仓库已创建**

---

## 🔑 第三步：创建Token（2分钟）

> Token用于代替密码登录，更安全

### 1. 进入设置
点击右上角头像 → **Settings**

### 2. 进入Token页面
左侧菜单 → **Developer settings** → **Personal access tokens** → **Tokens (classic)**

### 3. 生成Token
点击 **Generate new token (classic)**

### 4. 配置Token
| 项目 | 填写 |
|:---|:---|
| **Note** | OpenClaw Lite Upload |
| **Expiration** | 7 days（7天后过期）|
| **Select scopes** | ✅ 勾选 `repo` |

### 5. 生成并复制
点击 **Generate token**  
**⚠️ 重要：立即复制显示的Token（只显示一次！）**

✅ **完成！保存好这个Token**

---

## 🚀 第四步：运行上传脚本（1分钟）

### 1. 回到服务器终端
连接到你的服务器

### 2. 编辑脚本
```bash
# 编辑脚本，填入你的信息
nano /root/.openclaw/workspace/openclaw-lite/upload_to_github.sh
```

修改这两行：
```bash
USERNAME="你的GitHub用户名"      # 例如：zhangsan
EMAIL="你的GitHub邮箱"           # 例如：zhangsan@qq.com
```

按 `Ctrl+O` 保存，按 `Ctrl+X` 退出

### 3. 运行脚本
```bash
cd /root/.openclaw/workspace/openclaw-lite
bash upload_to_github.sh
```

### 4. 输入Token
当提示输入密码时，粘贴刚才复制的 **Token**（不是GitHub密码！）

---

## 🎉 完成！

如果看到以下信息，说明上传成功：

```
🎉 上传成功！

📎 项目地址：
   https://github.com/你的用户名/openclaw-lite
```

访问这个链接，就能看到你的项目了！

---

## 📋 上传后的优化（可选）

### 1. 添加Topics标签
- 进入项目页面
- 点击右侧 **⚙️ About** 旁边的齿轮
- 添加标签：`python` `ai` `trading` `screenplay` `automation`

### 2. 发布Release版本
- 点击右侧 **📎 Releases**
- 点击 **Create a new release**
- 版本号：`v1.0.0`
- 标题：`OpenClaw Lite 初始版本`
- 点击 **Publish release**

---

## ❓ 常见问题

### Q1: 提示 "Repository not found"
**原因**：仓库还没创建  
**解决**：先执行第二步创建仓库

### Q2: 提示 "Authentication failed"
**原因**：用了密码而不是Token  
**解决**：用Token作为密码输入

### Q3: 提示 "Permission denied"
**原因**：Token没有勾选repo权限  
**解决**：重新创建Token，记得勾选repo

---

## 🆘 遇到问题的求助方式

如果卡住了，告诉我：
1. 你在第几步？
2. 错误提示是什么？
3. 截图给我（如果有）

我会一步步帮你解决！

---

**祝你上传顺利！🚀**