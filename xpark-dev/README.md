# Xpark 街区官网 — HTML 研发工程

## 项目结构

```
xpark-dev/
├── css/
│   ├── xpark-shared.css      # 共享设计系统（tokens + 组件 + 语义回退）
│   ├── page-index.css         # 首页私有样式
│   ├── page-brands.css        # 入驻品牌页私有样式
│   ├── page-events.css        # 活动日历页私有样式
│   └── page-vi.css            # VI 视觉识别系统页私有样式
├── pages/
│   ├── index.html             # 首页
│   ├── brands.html            # 入驻品牌
│   ├── events.html            # 活动日历
│   └── vi.html                # VI 视觉识别系统
├── js/
│   ├── xpark-shared.js        # 主题切换 + 导航交互
│   └── page-events.js         # 活动日历逻辑
├── assets/                    # 品牌图片素材（11 张 + hero）
└── README.md
```

## 技术栈

- HTML5 + CSS3（CSS Custom Properties / 设计 Token）
- Tailwind CSS v4（CDN 引入，utility-first）
- 字体：Space Grotesk（标题/Display）+ Noto Sans SC（正文）

## 快速开始

直接用浏览器打开任意 `pages/*.html` 即可预览。如需本地服务器：

```bash
cd xpark-dev
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080/pages/index.html
```

## 设计 Token 体系

所有颜色、字体、间距、圆角、阴影均通过 CSS 变量定义在 `css/xpark-shared.css` 的 `:root` 中：

| Token 类别 | 前缀 | 主色值 | 用途 |
|---|---|---|---|
| 主色（酸橙绿） | `--xpark-primary-*` | `#A0E828` (500) | CTA、强调、活跃状态 |
| 辅色（珊瑚红） | `--xpark-coral-*` | `#FF5436` (500) | 危险/限量标识 |
| 墨色（文字/深色面） | `--xpark-ink-*` | `#1A1918` (800) | 正文文字、深色背景 |
| 奶油色（背景） | `--xpark-cream-*` | `#FEFCF8` (50) | 页面背景、浅色面 |
| 成功 | `--xpark-success-*` | `#22B43C` (500) | 成功状态 |
| 警告 | `--xpark-warning-*` | `#F0B020` (500) | 警告状态 |
| 错误 | `--xpark-error-*` | `#F03030` (500) | 错误状态 |
| 信息 | `--xpark-info-*` | `#2078F0` (500) | 信息提示 |

语义别名（直接映射到上述色阶）：

| 别名 | 映射 | 说明 |
|---|---|---|
| `--bg` | `--xpark-cream-50` | 页面背景 |
| `--fg` | `--xpark-ink-800` | 正文文字 |
| `--surface` | `--xpark-cream-100` | 卡片面 |
| `--accent` | `--xpark-primary-500` | 强调色 |
| `--secondary` | `--xpark-coral-500` | 辅助色 |
| `--muted-foreground` | `--xpark-ink-400` | 次要文字 |
| `--color-border` | `--xpark-ink-100` | 边框 |

## 组件库

共享组件定义在 `css/xpark-shared.css`：

| 组件 | 类名 | 变体 |
|---|---|---|
| 按钮 | `.btn` | `.primary` / `.secondary` / `.ghost` / `.danger` |
| 徽章 | `.badge` | `.lime` / `.coral` / `.ink-outline` |
| 卡片 | `.card` | `.card-vert` |
| CTA 链接 | `.cta-link` | — |
| 输入框 | `.input` | — |
| 导航 | `.nav` | `.nav--condensed` |

## 排版系统

| 级别 | 类名 | 字号 | 字重 | 字体 |
|---|---|---|---|---|
| Display | `.xpark-display` | 56px | 300 | Space Grotesk |
| H1 | `.xpark-h1` | 40px | 300 | Space Grotesk |
| H2 | `.xpark-h2` | 32px | 400 | Space Grotesk |
| H3 | `.xpark-h3` | 24px | 500 | Space Grotesk |
| H4 | `.xpark-h4` | 20px | 500 | Space Grotesk |
| Body | `.xpark-body` | 16px | 400 | Noto Sans SC |
| Lead | `.xpark-lead` | 18px | 400 | Noto Sans SC |
| Caption | `.xpark-caption` | 12px | 400 | Noto Sans SC |
| Eyebrow | `.xpark-eyebrow` | 11px | 600 | Noto Sans SC |

## 开发规范

1. **颜色**：必须使用 Token 变量（如 `var(--accent)`），禁止硬编码色值
2. **间距**：使用 `--space-1` 到 `--space-8`（4px / 8px / 12px / 16px / 24px / 32px / 48px / 64px）
3. **圆角**：使用 `--radius-sm` (4px) / `--radius-md` (8px) / `--radius-lg` (12px) / `--radius-full`
4. **阴影**：使用 `--shadow-1` 到 `--shadow-5`（从轻到重）
5. **修改 Token**：编辑 `css/xpark-shared.css` 的 `:root`
6. **修改组件**：编辑 `css/xpark-shared.css` 的组件区块
7. **修改页面样式**：编辑对应的 `css/page-*.css`
8. **Tailwind 配置**：保留在 HTML `<head>` 内的 `<style type="text/tailwindcss">` 块中

## 页间导航

```
首页 ──→ 入驻品牌 ──→ 首页
  │         │
  ↓         ↓
活动日历 ←──┘
  │
  ↓
VI 系统 ──→ 首页 / 入驻品牌 / 活动日历
```

## 暗色模式

已内置 `.dark` 主题切换（在 `<html>` 标签添加/移除 `dark` class 即可）。暗色模式下所有语义别名自动映射到深色色阶。点击导航栏 🌙 按钮可切换。
