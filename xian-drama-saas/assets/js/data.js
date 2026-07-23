/* ============================================================
   Mock 数据层 — 西安微短剧产业联盟服务中心
   覆盖：联盟成员 / 短剧项目 / 版权 / 订单 / 资源 / 通知 / 统计
   ============================================================ */
const DB = {
  /* ---------- 顶部 KPI ---------- */
  kpis: [
    { label: "在管短剧项目", val: "248", ico: "🎬", grad: "linear-gradient(135deg,#6366f1,#8b5cf6)", trend: "+12.5%", up: true, sub: "本月新增 28 个" },
    { label: "联盟成员机构", val: "86", ico: "🤝", grad: "linear-gradient(135deg,#0ea5e9,#2563eb)", trend: "+4", up: true, sub: "覆盖制作/MCN/平台" },
    { label: "累计上线作品", val: "1,326", ico: "📺", grad: "linear-gradient(135deg,#f59e0b,#f97316)", trend: "+8.4%", up: true, sub: "国内+海外渠道" },
    { label: "平台 GMV (万元)", val: "3,820", ico: "💰", grad: "linear-gradient(135deg,#10b981,#059669)", trend: "+18.2%", up: true, sub: "本季度分账收入" },
    { label: "AI 生成内容 (次)", val: "5,742", ico: "✨", grad: "linear-gradient(135deg,#d4af37,#b8941f)", trend: "+42%", up: true, sub: "剧本/文案/分镜" },
    { label: "出海覆盖地区", val: "37", ico: "🌏", grad: "linear-gradient(135deg,#ec4899,#8b5cf6)", trend: "+6", up: true, sub: "东南亚/北美/中东" },
  ],

  /* ---------- 联盟成员 ---------- */
  members: [
    { id: "M-1001", name: "长安光影影视文化", type: "制作公司", level: "理事单位", contact: "王启明", phone: "139****6601", email: "qi@cgcine.cn", join: "2024-03-12", status: "正常", projects: 18, color:"#6366f1" },
    { id: "M-1002", name: "曲江盛唐短剧工场", type: "制作公司", level: "理事单位", contact: "李婉清", phone: "138****2208", email: "wq@qjdrama.com", join: "2024-03-15", status: "正常", projects: 22, color:"#6366f1" },
    { id: "M-1003", name: "丝路快看传媒", type: "MCN 机构", level: "骨干单位", contact: "赵恒", phone: "137****8819", email: "heng@silklook.com", join: "2024-04-02", status: "正常", projects: 31, color:"#0ea5e9" },
    { id: "M-1004", name: "西部红石榴 MCN", type: "MCN 机构", level: "骨干单位", contact: "马晓燕", phone: "135****4521", email: "xy@hongshiliu.cn", join: "2024-04-20", status: "待年审", projects: 9, color:"#0ea5e9" },
    { id: "M-1005", name: "抖剧·短剧分发平台", type: "平台方", level: "理事单位", contact: "孙浩然", phone: "186****0098", email: "hr@douju.tv", join: "2024-03-20", status: "正常", projects: 0, color:"#f59e0b" },
    { id: "M-1006", name: "出海啦 ReelGo", type: "平台方", level: "战略单位", contact: "周敏", phone: "188****7733", email: "min@reelgo.io", join: "2024-05-08", status: "正常", projects: 0, color:"#f59e0b" },
    { id: "M-1007", name: "西安文创产业基金", type: "投资机构", level: "战略单位", contact: "陈志远", phone: "189****1024", email: "zy@xacwfund.com", join: "2024-03-28", status: "正常", projects: 0, color:"#10b981" },
    { id: "M-1008", name: "长安文投", type: "投资机构", level: "骨干单位", contact: "刘涛", phone: "133****5567", email: "tao@cainvest.cn", join: "2024-06-11", status: "正常", projects: 0, color:"#10b981" },
    { id: "M-1009", name: "西北大学戏剧影视学院", type: "高校院所", level: "合作单位", contact: "吴教授", phone: "029-8830**12", email: "wu@nwu.edu.cn", join: "2024-04-25", status: "正常", projects: 4, color:"#ec4899" },
    { id: "M-1010", name: "西安外国语大学翻译学院", type: "高校院所", level: "合作单位", contact: "郑院长", phone: "029-8531**08", email: "zheng@xisu.edu.cn", join: "2024-05-30", status: "正常", projects: 2, color:"#ec4899" },
    { id: "M-1011", name: "盛唐短剧联盟科技", type: "技术服务商", level: "骨干单位", contact: "黄磊", phone: "150****3390", email: "lei@sttech.cn", join: "2024-07-14", status: "正常", projects: 7, color:"#8b5cf6" },
    { id: "M-1012", name: "秦风数字资产", type: "技术服务商", level: "合作单位", contact: "秦工", phone: "152****6671", email: "gong@qinfeng.io", join: "2024-08-02", status: "已冻结", projects: 0, color:"#8b5cf6" },
  ],

  /* ---------- 短剧项目（全生命周期） ---------- */
  projectStage: ["立项", "备案", "制作", "审片", "发行", "上线", "复盘", "归档"],
  projects: [
    { id: "P-2025-0312", name: "长安十二时辰·暗夜", genre: "古风悬疑", eps: 80, epLen: "1.5min", stage: "上线", owner: "长安光影影视文化", director: "王启明", budget: 38, ROI: 1.82, views: "3,240万", compliance: 92, update: "2025-07-20", cover: "🏯", color:"#6366f1" },
    { id: "P-2025-0318", name: "丝路情·胡商记", genre: "历史传奇", eps: 60, epLen: "2min", stage: "发行", owner: "曲江盛唐短剧工场", director: "李婉清", budget: 52, ROI: 0, views: "—", compliance: 88, update: "2025-07-19", cover: "🐫", color:"#f59e0b" },
    { id: "P-2025-0321", name: "我的兵马俑男友", genre: "甜宠奇幻", eps: 100, epLen: "1.5min", stage: "制作", owner: "丝路快看传媒", director: "赵恒", budget: 28, ROI: 0, views: "—", compliance: 0, update: "2025-07-22", cover: "🗿", color:"#ec4899" },
    { id: "P-2025-0325", name: "大唐外卖侠", genre: "都市轻喜", eps: 90, epLen: "2min", stage: "审片", owner: "长安光影影视文化", director: "周敏", budget: 24, ROI: 0, views: "—", compliance: 90, update: "2025-07-21", cover: "🍜", color:"#10b981" },
    { id: "P-2025-0328", name: "华清池·女官秘史", genre: "宫廷权谋", eps: 70, epLen: "2min", stage: "上线", owner: "曲江盛唐短剧工场", director: "李婉清", budget: 46, ROI: 2.35, views: "5,180万", compliance: 95, update: "2025-07-18", cover: "🪷", color:"#8b5cf6" },
    { id: "P-2025-0330", name: "回民街的夏天", genre: "都市美食", eps: 60, epLen: "1.5min", stage: "复盘", owner: "丝路快看传媒", director: "马晓燕", budget: 18, ROI: 1.45, views: "1,860万", compliance: 91, update: "2025-07-15", cover: "🍢", color:"#ef4444" },
    { id: "P-2025-0335", name: "修仙在终南山", genre: "玄幻修真", eps: 120, epLen: "2min", stage: "备案", owner: "盛唐短剧联盟科技", director: "黄磊", budget: 64, ROI: 0, views: "—", compliance: 0, update: "2025-07-22", cover: "⛰️", color:"#0ea5e9" },
    { id: "P-2025-0338", name: "白鹿原·风起", genre: "年代乡土", eps: 50, epLen: "3min", stage: "立项", owner: "长安光影影视文化", director: "王启明", budget: 42, ROI: 0, views: "—", compliance: 0, update: "2025-07-23", cover: "🌾", color:"#a16207" },
    { id: "P-2025-0340", name: "我在西安送外卖", genre: "都市现实", eps: 80, epLen: "1.5min", stage: "上线", owner: "西部红石榴 MCN", director: "马晓燕", budget: 22, ROI: 1.92, views: "2,780万", compliance: 89, update: "2025-07-17", cover: "🛵", color:"#06b6d4" },
    { id: "P-2025-0344", name: "长安琴师录", genre: "古风音乐", eps: 60, epLen: "2min", stage: "审片", owner: "曲江盛唐短剧工场", director: "周敏", budget: 30, ROI: 0, views: "—", compliance: 86, update: "2025-07-21", cover: "🎵", color:"#64748b" },
  ],

  /* ---------- 版权 ---------- */
  copyrights: [
    { id: "CR-501", work: "长安十二时辰·暗夜", type: "剧本著作权", holder: "长安光影影视文化", cert: "陕作登字-2025-F-00128", block: "0x4f2a…c8b1", status: "已确权", time: "2025-04-10" },
    { id: "CR-502", work: "丝路情·胡商记", type: "作品存证", holder: "曲江盛唐短剧工场", cert: "陕作登字-2025-F-00155", block: "0x9b1e…3f07", status: "已确权", time: "2025-04-22" },
    { id: "CR-503", work: "大唐外卖侠", type: "改编权", holder: "长安光影影视文化", cert: "陕作登字-2025-F-00188", block: "0x2d77…a4c9", status: "审查中", time: "2025-05-06" },
    { id: "CR-504", work: "华清池·女官秘史", type: "剧本著作权", holder: "曲江盛唐短剧工场", cert: "陕作登字-2025-F-00210", block: "0x7c3b…e1d5", status: "已确权", time: "2025-05-19" },
    { id: "CR-505", work: "回民街的夏天", type: "信息网络传播权", holder: "丝路快看传媒", cert: "陕作登字-2025-F-00244", block: "0x1f8a…9b20", status: "已确权", time: "2025-06-02" },
    { id: "CR-506", work: "长安琴师录", type: "音乐著作权", holder: "曲江盛唐短剧工场", cert: "陕作登字-2025-F-00278", block: "0xa06e…7c33", status: "已确权", time: "2025-06-15" },
    { id: "CR-507", work: "修仙在终南山", type: "作品存证", holder: "盛唐短剧联盟科技", cert: "陕作登字-2025-F-00301", block: "0xb5d4…1e9f", status: "审查中", time: "2025-07-01" },
  ],
  infringements: [
    { id: "IN-022", work: "长安十二时辰·暗夜", platform: "某盗版短剧站", url: "d*****ma.tv/p/8821", found: "2025-07-19", status: "已发函", confidence: 96 },
    { id: "IN-023", work: "华清池·女官秘史", platform: "社交账号搬运", url: "douy***/@u_8821", found: "2025-07-20", status: "监测中", confidence: 88 },
    { id: "IN-024", work: "我在西安送外卖", platform: "海外聚合 App", url: "re**go/p/1290", found: "2025-07-21", status: "待处理", confidence: 91 },
  ],

  /* ---------- 订单 / 财务 ---------- */
  orders: [
    { id: "SO-20250720-001", member: "长安光影影视文化", product: "AI 剧本创作·专业版", amount: 12800, cycle: "年付", pay: "已支付", date: "2025-07-20", channel: "对公转账" },
    { id: "SO-20250719-014", member: "曲江盛唐短剧工场", product: "备案辅导服务包", amount: 6800, cycle: "单次", pay: "已支付", date: "2025-07-19", channel: "对公转账" },
    { id: "SO-20250719-008", member: "丝路快看传媒", product: "投流代运营·季度", amount: 36000, cycle: "季付", pay: "已支付", date: "2025-07-19", channel: "在线支付" },
    { id: "SO-20250718-021", member: "西部红石榴 MCN", product: "出海本地化翻译", amount: 4500, cycle: "单次", pay: "待支付", date: "2025-07-18", channel: "在线支付" },
    { id: "SO-20250717-006", member: "抖剧·短剧分发平台", product: "平台入驻·年度", amount: 24000, cycle: "年付", pay: "已支付", date: "2025-07-17", channel: "对公转账" },
    { id: "SO-20250716-019", member: "盛唐短剧联盟科技", product: "版权存证·批量包", amount: 8800, cycle: "单次", pay: "已支付", date: "2025-07-16", channel: "对公转账" },
    { id: "SO-20250715-031", member: "西安文创产业基金", product: "数据洞察·年度", amount: 56000, cycle: "年付", pay: "已支付", date: "2025-07-15", channel: "对公转账" },
    { id: "SO-20250715-027", member: "长安光影影视文化", product: "智能分镜生成", amount: 3600, cycle: "单次", pay: "已退款", date: "2025-07-15", channel: "在线支付" },
  ],

  /* ---------- 资源库 ---------- */
  actors: [
    { id: "A-201", name: "苏念安", gender: "女", age: 24, tags: ["古风","清冷","女主脸"], works: 12, rating: 4.8, status: "档期可约", avail: "8月" },
    { id: "A-202", name: "顾辞", gender: "男", age: 27, tags: ["霸总","古装","剑眉"], works: 18, rating: 4.9, status: "档期可约", avail: "8月" },
    { id: "A-203", name: "林晚", gender: "女", age: 22, tags: ["甜妹","校园","元气"], works: 7, rating: 4.6, status: "拍摄中", avail: "9月" },
    { id: "A-204", name: "霍行舟", gender: "男", age: 30, tags: ["硬汉","年代","反差"], works: 21, rating: 4.7, status: "档期可约", avail: "8月" },
    { id: "A-205", name: "白鹿", gender: "女", age: 26, tags: ["宫廷","权谋","古典"], works: 15, rating: 4.8, status: "档期可约", avail: "9月" },
  ],
  locations: [
    { id: "L-301", name: "唐风影视基地·西市", type: "古装街景", area: "曲江新区", price: "8,000/日", feat: ["盛唐街景","可夜拍"], status: "可预订", avail: "8-10月" },
    { id: "L-302", name: "现代都市棚·曲江", type: "现代场景", area: "曲江新区", price: "5,500/日", feat: ["一居/办公/咖啡"], status: "可预订", avail: "全年" },
    { id: "L-303", name: "白鹿原影视城", type: "年代场景", area: "蓝田县", price: "6,200/日", feat: ["关中民居","乡土"], status: "可预订", avail: "8-11月" },
    { id: "L-304", name: "西安城墙·南门段", type: "实景", area: "碑林区", price: "需审批", feat: ["城墙实景","夜灯"], status: "需报批", avail: "协调中" },
  ],
  equipments: [
    { id: "E-401", name: "RED V-RAPTOR 套机", type: "摄影机", price: "3,500/日", status: "在库", avail: 2 },
    { id: "E-402", name: "大疆如影 RS3 Pro", type: "稳定器", price: "600/日", status: "在库", avail: 5 },
    { id: "E-403", name: "爱图仕 600D×3 灯组", type: "灯光", price: "1,200/日", status: "在库", avail: 3 },
    { id: "E-404", name: "现场收音套件", type: "录音", price: "800/日", status: "部分出借", avail: 1 },
  ],

  /* ---------- 通知 ---------- */
  notifications: [
    { t: "AI 合规预警", c: "《修仙在终南山》剧本检测到 3 处高风险表述，请复核", time: "10分钟前", type: "warn" },
    { t: "版权存证完成", c: "《长安琴师录》区块链存证成功，证书已生成", time: "1小时前", type: "ok" },
    { t: "新成员入驻", c: "秦风数字资产 提交了入驻申请，等待审核", time: "3小时前", type: "info" },
    { t: "投流数据日报", c: "《长安十二时辰·暗夜》昨日 ROI 1.82，超出预期", time: "昨天", type: "ok" },
    { t: "订单待支付", c: "西部红石榴 MCN 的出海翻译订单待支付", time: "昨天", type: "warn" },
  ],

  /* ---------- 五大服务中心 ---------- */
  centers: [
    { id: "overseas", name: "出海服务中心", en: "Global Distribution Hub", ico: "🌏", grad: "linear-gradient(135deg,#0ea5e9,#2563eb)", summary: "对接海外平台与本地化团队，助力长安故事走向全球。", metrics: [{k:"出海作品",v:"186"},{k:"覆盖地区",v:"37"},{k:"本地化语种",v:"12"},{k:"海外分账(万)",v:"860"}] },
    { id: "approval", name: "审批中心", en: "Content Compliance Center", ico: "✅", grad: "linear-gradient(135deg,#10b981,#059669)", summary: "贯通备案辅导、材料预审与政策解读，缩短立项到上线周期。", metrics: [{k:"备案通过",v:"312"},{k:"平均周期",v:"18天"},{k:"预审项目",v:"44"},{k:"合规率",v:"96%"}] },
    { id: "distribution", name: "发行投流中心", en: "Release & Growth Center", ico: "🚀", grad: "linear-gradient(135deg,#f59e0b,#f97316)", summary: "整合宣发资源与精准投流，提升作品曝光与转化效率。", metrics: [{k:"投流项目",v:"58"},{k:"总曝光",v:"4.2亿"},{k:"平均ROI",v:"1.76"},{k:"达人合作",v:"240"}] },
    { id: "copyright", name: "版权服务中心", en: "Copyright Service Center", ico: "🛡️", grad: "linear-gradient(135deg,#8b5cf6,#6366f1)", summary: "从确权存证到授权交易，构建微短剧版权全链条服务。", metrics: [{k:"确权作品",v:"428"},{k:"存证上链",v:"402"},{k:"侵权监测",v:"156"},{k:"维权成功",v:"73"}] },
    { id: "ai", name: "AI 研发中心", en: "AI Research & Creation Lab", ico: "✨", grad: "linear-gradient(135deg,#d4af37,#b8941f)", summary: "面向剧本、分镜、配音与宣发，沉淀可用 AI 工具链与行业模型。", metrics: [{k:"AI生成(次)",v:"5,742"},{k:"行业模型",v:"6"},{k:"接入机构",v:"52"},{k:"节省工时",v:"8,600h"}] },
  ],

  /* ---------- 统计图表数据 ---------- */
  charts: {
    // 近6月上线作品 & GMV
    trend: { labels: ["2月","3月","4月","5月","6月","7月"], works: [120, 168, 210, 244, 286, 312], gmv: [420, 580, 760, 920, 1180, 1520] },
    // 题材分布
    genre: { labels: ["古风","甜宠","都市","玄幻","年代","其他"], data: [28, 24, 19, 14, 9, 6] },
    // 出海地区
    overseas: { labels: ["东南亚","北美","中东","日韩","欧洲","拉美"], data: [42, 23, 12, 10, 8, 5] },
    // 项目阶段漏斗
    funnel: { labels: ["立项","备案","制作","审片","发行","上线"], data: [248, 206, 168, 142, 118, 96] },
  },
};

window.DB = DB;
