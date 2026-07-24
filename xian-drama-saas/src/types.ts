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

export interface CenterState {
  user: CenterUser | null;
  orders: WorkOrder[];
  approvals: ApprovalCase[];
  overseas: OverseasProject[];
  distributions: DistributionCase[];
  copyrights: CopyrightCase[];
  ais: AIProject[];
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

/* ── 微短剧出海服务中心 SaaS ── */

export type OverseasRole = "ops" | "client";
export type OsStage = "选品" | "合规" | "译制" | "谈判" | "上线" | "结算";
export type OsPriority = "高" | "中" | "低";

export interface OverseasUser {
  id: string;
  name: string;
  role: OverseasRole;
  org: string;
}

export interface OsProject {
  id: string;
  title: string;
  org: string;
  market: string;
  stage: OsStage;
  score: number;
  owner: string;
  updatedAt: string;
  genre: string;
  episodes: number;
  languages: string[];
  platforms: string[];
  priority: OsPriority;
  revenueEst: string;
  progress: number;
  summary: string;
}

export interface LocalizationJob {
  id: string;
  projectId: string;
  title: string;
  language: string;
  type: "字幕" | "配音" | "本土化改编";
  status: "排队" | "进行中" | "质检" | "已交付";
  vendor: string;
  dueAt: string;
  progress: number;
}

export interface PlatformPartner {
  id: string;
  name: string;
  region: string;
  model: "分成" | "买断" | "混合";
  status: "合作中" | "洽谈中" | "暂停";
  contact: string;
  titlesLive: number;
  monthlyRevenue: string;
}

export interface OverseasDeal {
  id: string;
  projectId: string;
  title: string;
  platform: string;
  type: "授权" | "分账" | "买断" | "联合发行";
  stage: "意向" | "条款" | "签约" | "履约" | "完结";
  amount: string;
  owner: string;
  updatedAt: string;
}

export interface SettlementRecord {
  id: string;
  projectId: string;
  title: string;
  platform: string;
  period: string;
  gross: string;
  share: string;
  status: "待核对" | "已确认" | "已打款";
  updatedAt: string;
}

export interface MarketInsight {
  id: string;
  market: string;
  trend: string;
  hotGenres: string[];
  avgCpm: string;
  note: string;
  updatedAt: string;
}

export interface IntakeRequest {
  id: string;
  org: string;
  contact: string;
  title: string;
  market: string;
  need: string;
  status: "新建" | "评估中" | "已立项" | "关闭";
  createdAt: string;
}

export interface OverseasHubState {
  user: OverseasUser | null;
  projects: OsProject[];
  localizations: LocalizationJob[];
  platforms: PlatformPartner[];
  deals: OverseasDeal[];
  settlements: SettlementRecord[];
  markets: MarketInsight[];
  intakes: IntakeRequest[];
}

export const OVERSEAS_ROLE_LABEL: Record<OverseasRole, string> = {
  ops: "出海运营",
  client: "制片方客户",
};
