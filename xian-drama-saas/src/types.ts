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
  /** 建议对接的供给方 */
  suggestedPartner?: string;
  /** 关联场景包 */
  sceneId?: string;
  /** 成交后的项目 Deal */
  dealId?: string;
  /** 需求方设定的支付机制 */
  preferredPayMechanism?: PayMechanism;
  /** 需求方对支付机制的说明 */
  payMechanismNote?: string;
}

/** 支付机制：需求方可设，供应方应征时可要求变更 */
export type PayMechanism = "预付" | "过程支付" | "验收后支付";

export interface MatchBid {
  id: string;
  matchId: string;
  supplierOrg: string;
  /** 是否接受需求方原机制 */
  acceptBuyerMechanism: boolean;
  /** 供应方主张的机制（可与需求方不同） */
  proposedPayMechanism: PayMechanism;
  /** 变更机制的理由 / 应征说明 */
  note: string;
  /** 可选：供应方报价（Tokens，覆盖场景包默认） */
  quoteTokens?: number;
  status: "待审" | "已采纳" | "已拒绝" | "撤回";
  createdAt: string;
}

export type DealStatus = "待确认" | "预算已开" | "履约中" | "已结算" | "暂停";
export type DealPhase =
  | "要约中"
  | "待双边确认"
  | "托管中"
  | "履约中"
  | "结算中"
  | "已闭环";
export type DealLedgerType =
  | "开预算"
  | "托管锁定"
  | "消耗"
  | "撮合费"
  | "供给激励"
  | "中心保留"
  | "补预算"
  | "退款"
  | "确认";
export type ParticipantRole = "buyer" | "supplier" | "broker" | "center";

export interface DealMilestone {
  id: string;
  title: string;
  weight: number;
  status: "未开始" | "进行中" | "已完成";
  releaseTokens: number;
  released: number;
}

export interface DealLedgerEntry {
  id: string;
  type: DealLedgerType;
  amount: number;
  actor: string;
  actorRole: ParticipantRole;
  model?: string;
  note: string;
  createdAt: string;
}

export interface DealProject {
  id: string;
  matchId: string;
  title: string;
  sceneId: string;
  sceneName: string;
  /** 交易标的（人话） */
  consideration: string;
  /** 最终成交采用的支付机制 */
  payMechanism: PayMechanism;
  /** 机制来自谁的主张 */
  payMechanismSource: "buyer" | "supplier" | "negotiated";
  payMechanismNote?: string;
  buyerOrg: string;
  supplierOrg: string;
  broker: string;
  center: string;
  status: DealStatus;
  phase: DealPhase;
  buyerAccepted: boolean;
  supplierAccepted: boolean;
  budget: number;
  /** 托管池剩余（未消耗） */
  escrow: number;
  /** 过程支付：尚未冻结进托管的剩余额度 */
  unfunded: number;
  spent: number;
  brokerEarned: number;
  supplierEarned: number;
  centerRetained: number;
  /** 验收后支付：暂存未释放的撮合费/激励 */
  heldBroker: number;
  heldSupplier: number;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  nextActionBuyer: string;
  nextActionSupplier: string;
  nextActionBroker: string;
  nextActionCenter: string;
  milestones: DealMilestone[];
  ledger: DealLedgerEntry[];
}

export interface ScenePackage {
  id: string;
  name: string;
  tokens: number;
  center: string;
  brokerFeeRate: number;
  supplierShare: number;
  desc: string;
  forBuyer: string;
  forSupplier: string;
  forBroker: string;
  forCenter: string;
  /** 交易标的模板 */
  consideration: string;
  milestones: string[];
}

export interface OrgWallet {
  org: string;
  /** 可自由支配 */
  balance: number;
  /** 已进入项目托管、尚未消耗/退回 */
  locked: number;
  role: "buyer" | "supplier" | "broker" | "mixed";
}

export type WorkGenre = "甜宠" | "逆袭" | "古装" | "悬疑" | "文旅" | "都市" | "校园";
export type WorkStatus = "热播" | "筹备" | "已完结" | "待上线";

export interface MemberWork {
  id: string;
  org: string;
  title: string;
  genre: WorkGenre;
  episodes: number;
  status: WorkStatus;
  platform?: string;
  coverColor: string;
  summary: string;
  playCount?: string;
  featured: boolean;
  updatedAt: string;
}

export type VenueType = "影棚" | "景区" | "文创园" | "演播厅";
export type VenueStatus = "可预约" | "紧张" | "维护";

export interface Venue {
  id: string;
  name: string;
  district: string;
  type: VenueType;
  area: string;
  price: string;
  tags: string[];
  contact: string;
  phone: string;
  featured: boolean;
  status: VenueStatus;
  summary: string;
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
  dealId?: string;
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
  works: MemberWork[];
  venues: Venue[];
  deals: DealProject[];
  orgWallets: OrgWallet[];
  scenePackages: ScenePackage[];
  bids: MatchBid[];
}

export type TokenModelCategory = "chat" | "embedding" | "image" | "video";
export type TokenModelStatus = "可用" | "限流" | "维护";
export type TokenTxType = "充值" | "消耗" | "退款" | "项目划拨" | "激励到账";

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
  dealId?: string;
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
