/** Phase 1 domain types — member hub + API router + compute */

export type MemberRole = "org_admin" | "member" | "secretariat" | "ops";

export interface P1User {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  orgId: string | null;
  orgName: string;
}

export interface P1Org {
  id: string;
  name: string;
  tier: "核心会员" | "专业会员" | "观察会员";
  tags: string[];
  contact: string;
}

export type ProjectStatus = "planning" | "in_production" | "post" | "distributing" | "closed";
export type TaskStatus = "todo" | "doing" | "blocked" | "done" | "cancelled";

export interface P1Project {
  id: string;
  orgId: string;
  title: string;
  type: string;
  status: ProjectStatus;
  ownerId: string;
  ownerName: string;
  progress: number;
  summary: string;
  updatedAt: string;
}

export interface P1Task {
  id: string;
  projectId: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  status: TaskStatus;
  dueAt: string;
  blockedReason?: string;
}

export type DemandStatus = "draft" | "published" | "matching" | "deal" | "closed";

export interface P1Demand {
  id: string;
  orgId: string;
  orgName: string;
  title: string;
  need: string;
  offer: string;
  category: string;
  budget: string;
  dueAt: string;
  status: DemandStatus;
  visibility: "alliance";
  contact: string;
  createdAt: string;
}

export interface P1DemandApplication {
  id: string;
  demandId: string;
  orgId: string;
  orgName: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface P1Opportunity {
  id: string;
  title: string;
  kind: string;
  summary: string;
  deadline: string;
  tags: string[];
}

export interface P1OpportunityInterest {
  id: string;
  opportunityId: string;
  orgId: string;
  orgName: string;
  note: string;
  createdAt: string;
}

export interface P1Notice {
  id: string;
  title: string;
  body: string;
  audience: string;
  forceRead: boolean;
  createdAt: string;
}

export interface P1NoticeReceipt {
  noticeId: string;
  userId: string;
  readAt: string;
}

export interface P1Wallet {
  orgId: string;
  balance: number;
  usedThisMonth: number;
  apiKey: string;
}

export interface P1LedgerEntry {
  id: string;
  orgId: string;
  type: "充值" | "消耗" | "退款" | "调账";
  amount: number;
  balance: number;
  note: string;
  ref?: string;
  createdAt: string;
}

export interface P1Package {
  id: string;
  name: string;
  tokens: number;
  price: number;
  bonus: number;
  desc: string;
  popular?: boolean;
}

export interface P1Model {
  id: string;
  provider: string;
  name: string;
  modelKey: string;
  modality: "chat" | "image" | "video";
  inputPrice: number;
  outputPrice: number;
  status: "可用" | "限流" | "维护";
  tags: string[];
}

export type ComputeJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface P1ComputeJob {
  id: string;
  orgId: string;
  projectId: string | null;
  jobType: string;
  priority: "low" | "normal" | "high";
  status: ComputeJobStatus;
  payload: Record<string, unknown>;
  cost: number;
  error?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface P1State {
  orgs: P1Org[];
  users: P1User[];
  projects: P1Project[];
  tasks: P1Task[];
  demands: P1Demand[];
  applications: P1DemandApplication[];
  opportunities: P1Opportunity[];
  interests: P1OpportunityInterest[];
  notices: P1Notice[];
  receipts: P1NoticeReceipt[];
  wallets: P1Wallet[];
  ledger: P1LedgerEntry[];
  packages: P1Package[];
  models: P1Model[];
  jobs: P1ComputeJob[];
}
