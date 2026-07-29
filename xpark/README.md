# Xpark 官网首页复刻

基于 [Xpark 官方网站](https://www.xpark.com.tw/) 首页的高保真静态复刻，用于学习与设计参考。

> 本项目为教育/归档用途，非 Xpark 官方站点。图片与品牌资源引用自原站 CDN。

## 页面结构

| 区块 | 说明 |
|------|------|
| Header | Logo、快捷导航、语言切换、移动端侧栏菜单 |
| Hero Banner | 6 张轮播大图（PC / 移动端双版本） |
| Calendar | FullCalendar 营业日历 + 当日营业时间弹层 |
| NEWS | 最新消息列表（6 条） |
| Guide | 关于 Xpark / 票價 / 導覽 / Xcafe / 加價活動 |
| Scenarios | 「如何享受不同的 Xpark 場景」标签 + 图片轮播 |
| Social | YouTube / Instagram / Facebook |
| Facilities | Xpark 周邊設施 |
| Footer | 站点地图、版权、隐私政策 |

## 设计 Token

```css
--blue: #21B7CE;
--dark_blue: #0A284D;
--yel: #FEE100;
--base: #707070;
--bg-light: #f8feff;
```

字体：`Noto Sans TC`（正文）、`Noto Serif`（装饰标题）

## 快速预览

```bash
cd xpark
python3 -m http.server 8080
```

浏览器打开 http://localhost:8080

## 目录

```
xpark/
├── index.html      # 首页
├── css/style.css   # 样式
├── js/main.js      # 轮播、日历、菜单交互
└── README.md
```

## 技术栈

- 纯 HTML / CSS / JavaScript（无构建步骤）
- FullCalendar 6（CDN）— 营业日历
- Google Fonts — Noto Sans TC / Noto Serif

## 注意事项

- 购票链接指向官方 [Fonticket](https://xpark.fonticket.com/)
- 部分交互（如日历节目单 API）为简化实现，视觉与布局对齐原站
- 请勿将本复刻用于冒充官方或商业用途
