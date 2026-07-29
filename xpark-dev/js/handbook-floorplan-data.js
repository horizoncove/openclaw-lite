window.HANDBOOK_FLOORPLAN = {
  viewBox: { w: 1000, h: 707 },
  categories: {
    '茶饮咖啡': { color: '#A0E828', label: '茶饮咖啡' },
    '快餐轻食': { color: '#FF5436', label: '快餐轻食' },
    '运动奥莱': { color: '#1A1918', label: '运动奥莱' },
    '零售': { color: '#2D8CFF', label: '零售' },
    '正餐聚餐': { color: '#FF8C42', label: '正餐聚餐' },
    '夜间经济': { color: '#7B61FF', label: '夜间经济' },
    '文体娱': { color: '#FF5C8A', label: '文体娱乐' },
    '生活配套': { color: '#6B7280', label: '生活配套' },
    '钩子业态': { color: '#F5C518', label: '钩子/外摆' },
    '公共': { color: '#94A3B8', label: '广场/公共' },
  },
  plans: {
    master: {
      label: '总平面',
      caption: '功能分区示意 · 商业 / 广场 / 创客中心 / 办公',
      zones: [
        { id: 'm-retail', name: '商业街区', category: '零售', shape: 'rect', x: 12, y: 6, w: 76, h: 52, area: '~4800㎡', anchors: ['蜜雪冰城', '瑞幸', '好特卖'], note: '康定路临街 + 内街铺位集群' },
        { id: 'm-plaza', name: '中心广场', category: '公共', shape: 'rect', x: 72, y: 10, w: 22, h: 28, area: '~800㎡', anchors: ['外摆美食市集'], note: '东北角广场 · 活动/外摆' },
        { id: 'm-office', name: '8# / 9# 办公', category: '生活配套', shape: 'rect', x: 2, y: 28, w: 18, h: 38, area: '塔楼', anchors: ['罗森', '唐久/每一天'], note: '办公客群 · 便利店配套' },
        { id: 'm-maker', name: '1# / 2# 创客中心', category: '正餐聚餐', shape: 'rect', x: 22, y: 58, w: 74, h: 38, area: '裙楼+塔楼', anchors: ['麦当劳', '滔搏/胜道体育（多品牌奥莱店）'], note: '东南/西南锚点 · 大店落位' },
      ],
    },
    '1f': {
      label: '1F',
      caption: '一层业态规划示意 · 临街引流 + 端头锚点 + 奥莱集群',
      zones: [
        { id: '1f-street', name: '康定路临街带', category: '茶饮咖啡', shape: 'rect', x: 10, y: 2, w: 80, h: 12, area: '~600㎡', anchors: ['蜜雪冰城', '瑞幸', '库迪'], note: '高客流临街 · 小面积快周转' },
        { id: '1f-plaza', name: '东北广场', category: '钩子业态', shape: 'rect', x: 72, y: 12, w: 24, h: 22, area: '~800㎡', anchors: ['外摆美食市集'], note: '周末市集 / 季节外摆' },
        { id: '1f-north', name: '北侧商业内街', category: '快餐轻食', shape: 'rect', x: 18, y: 16, w: 52, h: 24, area: '~1200㎡', anchors: ['魏家凉皮', '塔斯汀', '华莱士'], note: '学生快餐主力带' },
        { id: '1f-west', name: '8# / 9# 裙楼', category: '生活配套', shape: 'rect', x: 2, y: 24, w: 14, h: 32, area: '~400㎡', anchors: ['罗森', '唐久/每一天', '怡康/老百姓大药房'], note: '办公+社区刚需配套' },
        { id: '1f-center', name: '中庭零售区', category: '零售', shape: 'rect', x: 22, y: 42, w: 46, h: 18, area: '~900㎡', anchors: ['好特卖', '嗨特购', '名创优品'], note: '折扣零售 / 冲动消费' },
        { id: '1f-anchor-se', name: '东南端头锚点', category: '运动奥莱', shape: 'rect', x: 58, y: 58, w: 38, h: 36, area: '400–600㎡', anchors: ['滔搏/胜道体育（多品牌奥莱店）', '麦当劳'], note: '一层端头 · 目的性消费引流' },
        { id: '1f-anchor-sw', name: '西南裙楼商业', category: '快餐轻食', shape: 'rect', x: 18, y: 60, w: 36, h: 34, area: '250–350㎡', anchors: ['肯德基', '麦当劳'], note: '与东南端头形成双锚点' },
      ],
    },
    '2f': {
      label: '2F',
      caption: '二层业态规划示意 · 餐饮聚餐 + 夜经济 + 文体娱乐',
      zones: [
        { id: '2f-dining', name: '餐饮聚餐区', category: '正餐聚餐', shape: 'rect', x: 20, y: 18, w: 48, h: 32, area: '~1500㎡', anchors: ['海底捞（校园店/嗨捞）', '马路边边', '九田家'], note: '二层主力 · 社团聚餐/家庭客' },
        { id: '2f-ent', name: '东北端头娱乐', category: '文体娱', shape: 'rect', x: 68, y: 16, w: 28, h: 26, area: '500–800㎡', anchors: ['魅KTV', '连锁台球俱乐部（星牌/乔氏）'], note: '二层端头 · 大空间娱乐' },
        { id: '2f-night', name: '夜经济带', category: '夜间经济', shape: 'rect', x: 20, y: 54, w: 42, h: 28, area: '300–400㎡', anchors: ['海伦司', 'COMMUNE公社'], note: '学生夜消费 · 二层外摆潜力' },
        { id: '2f-sports', name: '运动 / 培训', category: '文体娱', shape: 'rect', x: 58, y: 52, w: 36, h: 30, area: '~800㎡', anchors: ['乐刻', '电竞馆/网咖（杰拉/网鱼）'], note: '抗假期 · 社区+学生' },
        { id: '2f-terrace', name: '露台外摆区', category: '钩子业态', shape: 'rect', x: 72, y: 8, w: 24, h: 14, area: '弹性', anchors: ['外摆美食市集', '社区精酿酒吧'], note: '夏季夜间外摆 · 提升坪效' },
      ],
    },
  },
  mixSummary: [
    { floor: '1F', area: '~5200㎡', focus: '临街茶饮 · 快餐 · 运动奥莱 · 折扣零售', ratio: '约 65%' },
    { floor: '2F', area: '~2800㎡', focus: '正餐聚餐 · 夜经济 · KTV/健身', ratio: '约 35%' },
  ],
};
