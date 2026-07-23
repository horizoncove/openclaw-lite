export type AllianceRole = "alliance" | "member";
export type CenterRole = "approval" | "overseas" | "distribution" | "copyright" | "ai";

export type MemberTier = "核心会员" | "专业会员" | "观察会员";
export type MemberStatus = "有效" | "待审" | "退出";
export type OrderStatus = "新建" | "处理中" | "待客户" | "完结" | "关闭";
export type Priority = "高" | "中" | "低";

export interface AllianceUser {
  id: string;
  name: string;
  role: AllianceRole;
  org: string;
}

export interface CenterUser {
  id: string;
  name: string;
  role: CenterRole;
  org: string;
}

export interface Member {
  id: string;
  name: string;
  tier: MemberTier;
  type: string;
  tags: string[];
  contact: string;
  phone: string;
  status: MemberStatus;
  joinedAt: string;
  city: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  place: string;
  type: "对接会" | "路演" | "培训" | "联席会";
  status: "筹备" | "报名中" | "已结束";
  capacity: number;
  enrolled: number;
}

export interface MatchNeed {
  id: string;
  org: string;
  need: string;
  offer: string;
  status: "开放" | "撮合中" | "已成交" | "关闭";
  owner: string;
  updatedAt: string;
}

export interface WorkOrder {
  id: string;
  product: string;
  center: string;
  org: string;
  contact: string;
  priority: Priority;
  status: OrderStatus;
  assignee: string;
  createdAt: string;
  dueAt: string;
  summary: string;
}

export interface ApprovalCase {
  id: string;
  title: string;
  org: string;
  risk: "低" | "中" | "高";
  stage: "收件" | "预检中" | "会诊" | "已出具意见" | "已送审";
  result?: "通过建议" | "修改后送审" | "高风险暂缓";
  updatedAt: string;
}

export interface OverseasProject {
  id: string;
  title: string;
  market: string;
  stage: "选品" | "合规" | "译制" | "谈判" | "上线" | "结算";
  score: number;
  owner: string;
  updatedAt: string;
}

export interface DistributionCase {
  id: string;
  title: string;
  platform: string;
  budget: string;
  stage: "体检" | "冷启动" | "放量" | "复盘";
  roi?: string;
  owner: string;
}

export interface CopyrightCase {
  id: string;
  title: string;
  type: "确权" | "登记辅导" | "授权" | "维权";
  status: "进行中" | "已完成" | "转介";
  org: string;
  updatedAt: string;
}

export interface AIProject {
  id: string;
  org: string;
  line: "剧本辅助" | "译制提速" | "素材工厂" | "合规辅助";
  status: "接入中" | "试点" | "已固化" | "停用";
  lift?: string;
  owner: string;
}

export interface AllianceState {
  user: AllianceUser | null;
  members: Member[];
  events: EventItem[];
  matches: MatchNeed[];
  orders: WorkOrder[];
}

export type TokenModelCategory = "chat" | "embedding" | "image" | "video";
export type TokenModelStatus = "可用" | "限流" | "维护";
export type TokenTxType = "充值" | "消耗" | "退款";

export interface TokenModel {
  id: string;
  provider: string;
  name: string;
  category: TokenModelCategory;
  inputPrice: number;
  outputPrice: number;
  contextWindow: number;
  status: TokenModelStatus;
  tags: string[];
}

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  bonus: number;
  popular?: boolean;
  desc: string;
}

export interface TokenTransaction {
  id: string;
  type: TokenTxType;
  amount: number;
  balance: number;
  model?: string;
  note: string;
  createdAt: string;
}

export interface TokenWallet {
  balance: number;
  usedThisMonth: number;
  monthlyQuota: number;
  apiKey: string;
  transactions: TokenTransaction[];
}

export interface CenterPanoramaCenter {
  id: CenterRole;
  name: string;
  workload: number;
  active: number;
  alerts: number;
  link: string;
}

export interface CenterPanorama {
  summary: {
    openOrders: number;
    highPriority: number;
    tokenBalance: number;
    monthlyTokenUsage: number;
    totalWorkload: number;
  };
  centers: CenterPanoramaCenter[];
  ordersByCenter: Record<string, number>;
  tokenUsageTrend: { label: string; value: number }[];
  recentOrders: WorkOrder[];
  recentTransactions: TokenTransaction[];
}

export interface CenterState {
  user: CenterUser | null;
  orders: WorkOrder[];
  approvals: ApprovalCase[];
  overseas: OverseasProject[];
  distributions: DistributionCase[];
  copyrights: CopyrightCase[];
  ais: AIProject[];
  tokenModels: TokenModel[];
  tokenPackages: TokenPackage[];
  tokenWallet: TokenWallet;
}

export const ALLIANCE_ROLE_LABEL: Record<AllianceRole, string> = {
  alliance: "联盟秘书处",
  member: "会员单位",
};

export const CENTER_ROLE_LABEL: Record<CenterRole, string> = {
  approval: "审批中心",
  overseas: "出海中心",
  distribution: "发行投流中心",
  copyright: "版权中心",
  ai: "AI 研发中心",
};
