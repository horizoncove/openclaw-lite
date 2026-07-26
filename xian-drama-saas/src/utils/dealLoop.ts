import type {
  DealLedgerEntry,
  DealProject,
  MatchNeed,
  OrgWallet,
  ScenePackage,
  WorkOrder,
} from "../types";

export const SCENE_PACKAGES: ScenePackage[] = [
  {
    id: "SCENE-OVERSEAS",
    name: "出海译制履约包",
    tokens: 80000,
    center: "出海",
    brokerFeeRate: 0.08,
    supplierShare: 0.1,
    desc: "多语种译制、合规审查与海外选品诊断",
    forBuyer: "按项目锁定额度，译制节点清晰可见",
    forSupplier: "交付后获得激励 Token，沉淀履约信用",
    forBroker: "成交即计提撮合服务费",
    forCenter: "出海中心按任务扣费，避免超支",
  },
  {
    id: "SCENE-APPROVAL",
    name: "备案预检履约包",
    tokens: 20000,
    center: "审批",
    brokerFeeRate: 0.06,
    supplierShare: 0.05,
    desc: "材料预检、风险会诊与送审建议",
    forBuyer: "先预检再送审，少走冤枉路",
    forSupplier: "剧本/材料协作方可获微量激励",
    forBroker: "促成预检服务并记录链路",
    forCenter: "审批中心每次预检提交扣费",
  },
  {
    id: "SCENE-DIST",
    name: "投流冷启动包",
    tokens: 50000,
    center: "发行投流",
    brokerFeeRate: 0.07,
    supplierShare: 0.12,
    desc: "新剧体检、素材工厂与冷启动复盘",
    forBuyer: "预算与 ROI 同屏，知道钱花在哪",
    forSupplier: "投放实验室按效果结算激励",
    forBroker: "对接投放产能并跟进阶段",
    forCenter: "发行中心按复盘任务扣减",
  },
  {
    id: "SCENE-AI",
    name: "剧本/素材 AI 包",
    tokens: 30000,
    center: "AI",
    brokerFeeRate: 0.05,
    supplierShare: 0.08,
    desc: "分集大纲、素材产能与合规辅助",
    forBuyer: "按产线用量扣费，可随时补预算",
    forSupplier: "AIGC 能力方共享激励",
    forBroker: "推荐垂类模型与产能方",
    forCenter: "AI 中心跑批即扣",
  },
  {
    id: "SCENE-VENUE",
    name: "场地协调包",
    tokens: 15000,
    center: "联盟",
    brokerFeeRate: 0.1,
    supplierShare: 0.15,
    desc: "影棚/景区排期协调与联名拍摄支持",
    forBuyer: "锁档期前先锁协调预算",
    forSupplier: "场地方/协调方获得激励",
    forBroker: "场地撮合费清晰可查",
    forCenter: "联盟侧协调工单跟进",
  },
];

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function findScene(sceneId: string) {
  return SCENE_PACKAGES.find((s) => s.id === sceneId);
}

export function suggestScene(match: MatchNeed): ScenePackage {
  const text = `${match.need}${match.offer}`;
  if (/出海|译制|配音|北美|东南亚|中东/.test(text)) return SCENE_PACKAGES[0];
  if (/备案|合规|送审/.test(text)) return SCENE_PACKAGES[1];
  if (/投流|冷启动|素材|投放/.test(text)) return SCENE_PACKAGES[2];
  if (/剧本|AI|虚拟|数字人|分镜/.test(text)) return SCENE_PACKAGES[3];
  if (/场地|影棚|拍摄|许可|景区/.test(text)) return SCENE_PACKAGES[4];
  return SCENE_PACKAGES[0];
}

export function suggestSupplier(match: MatchNeed, members: { name: string; tags: string[] }[]): string {
  const text = `${match.need}${match.offer}`;
  const scored = members
    .filter((m) => m.name !== match.org)
    .map((m) => {
      const tags = m.tags.join("");
      let score = 0;
      if (/出海|译制|配音/.test(text) && /出海|译制|配音/.test(tags)) score += 3;
      if (/投流|素材/.test(text) && /投流|素材/.test(tags)) score += 3;
      if (/剧本|古装/.test(text) && /剧本|古装|IP/.test(tags)) score += 3;
      if (/场地|虚拟|拍摄/.test(text) && /AIGC|虚拟|文旅|景区/.test(tags)) score += 3;
      if (/发行|渠道/.test(text) && /出海|发行|投放/.test(tags)) score += 2;
      return { name: m.name, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.name || "丝路视界传媒";
}

export function buildDealFromMatch(opts: {
  match: MatchNeed;
  supplierOrg: string;
  sceneId: string;
  dealIndex: number;
}): { deal: DealProject; order: WorkOrder } {
  const scene = findScene(opts.sceneId) ?? SCENE_PACKAGES[0];
  const id = `DEAL-${String(opts.dealIndex).padStart(3, "0")}`;
  const orderId = `WO-DEAL-${String(opts.dealIndex).padStart(3, "0")}`;
  const createdAt = today();
  const due = new Date();
  due.setDate(due.getDate() + 7);

  const openEntry: DealLedgerEntry = {
    id: `${id}-L01`,
    type: "开预算",
    amount: scene.tokens,
    actor: "联盟秘书处",
    actorRole: "broker",
    note: `成交开立「${scene.name}」，锁定项目预算`,
    createdAt,
  };

  const deal: DealProject = {
    id,
    matchId: opts.match.id,
    title: `${opts.match.org} × ${opts.supplierOrg}`,
    sceneId: scene.id,
    sceneName: scene.name,
    buyerOrg: opts.match.org,
    supplierOrg: opts.supplierOrg,
    broker: "联盟秘书处",
    center: scene.center,
    status: "预算已开",
    budget: scene.tokens,
    spent: 0,
    brokerEarned: 0,
    supplierEarned: 0,
    orderId,
    createdAt,
    updatedAt: createdAt,
    nextActionBuyer: "确认项目预算并关注履约节点；余额不足时可一键补购场景包",
    nextActionSupplier: "按约定交付能力，完成节点后领取激励 Token",
    nextActionBroker: "跟进双方对接节奏，必要时升级中心工单优先级",
    nextActionCenter: `${scene.center === "联盟" ? "联盟协调" : scene.center + "中心"}开始履约并按任务扣费`,
    ledger: [openEntry],
  };

  const order: WorkOrder = {
    id: orderId,
    product: scene.name,
    center: scene.center === "联盟" ? "联盟" : scene.center,
    org: opts.match.org,
    contact: opts.match.org,
    priority: "高",
    status: "新建",
    assignee: scene.center === "出海" ? "出海-韩磊" : scene.center === "审批" ? "审批-刘芳" : scene.center === "发行投流" ? "投流-苏晚" : scene.center === "AI" ? "AI-蒋一" : "联盟-陈希",
    createdAt,
    dueAt: due.toISOString().slice(0, 10),
    summary: `撮合成交 ${opts.match.id}：${opts.match.need} ←→ ${opts.supplierOrg}`,
    dealId: id,
  };

  return { deal, order };
}

export function applyConsume(
  deal: DealProject,
  amount: number,
  actor: string,
  note: string,
  model?: string,
): DealProject {
  const scene = findScene(deal.sceneId);
  const spend = Math.min(amount, Math.max(0, deal.budget - deal.spent));
  if (spend <= 0) return deal;
  const brokerCut = Math.round(spend * (scene?.brokerFeeRate ?? 0.08));
  const supplierCut = Math.round(spend * (scene?.supplierShare ?? 0.1));
  const nextSpent = deal.spent + spend;
  const status = nextSpent >= deal.budget ? "已结算" : "履约中";
  const entry: DealLedgerEntry = {
    id: `${deal.id}-L${String(deal.ledger.length + 1).padStart(2, "0")}`,
    type: "消耗",
    amount: -spend,
    actor,
    actorRole: "center",
    model,
    note,
    createdAt: today(),
  };
  const ledger = [entry, ...deal.ledger];
  if (brokerCut > 0) {
    ledger.unshift({
      id: `${deal.id}-L${String(ledger.length + 1).padStart(2, "0")}`,
      type: "撮合费",
      amount: brokerCut,
      actor: deal.broker,
      actorRole: "broker",
      note: `从本次履约计提撮合服务费 ${(scene?.brokerFeeRate ?? 0) * 100}%`,
      createdAt: today(),
    });
  }
  if (supplierCut > 0) {
    ledger.unshift({
      id: `${deal.id}-L${String(ledger.length + 1).padStart(2, "0")}`,
      type: "供给激励",
      amount: supplierCut,
      actor: deal.supplierOrg,
      actorRole: "supplier",
      note: `供给方履约激励 ${(scene?.supplierShare ?? 0) * 100}%`,
      createdAt: today(),
    });
  }
  return {
    ...deal,
    spent: nextSpent,
    brokerEarned: deal.brokerEarned + brokerCut,
    supplierEarned: deal.supplierEarned + supplierCut,
    status,
    updatedAt: today(),
    nextActionBuyer: status === "已结算" ? "项目已结算，可评价合作并复购场景包" : "履约进行中，关注剩余预算",
    nextActionSupplier: status === "已结算" ? "激励已到账，可继续承接同类需求" : "继续交付下一节点",
    nextActionBroker: status === "已结算" ? "归档案例并沉淀供需标签" : "盯防逾期与双方沟通摩擦",
    nextActionCenter: status === "已结算" ? "关闭关联工单并复盘消耗" : "继续按任务扣费推进",
    ledger,
  };
}

export function topUpOrgWallet(wallets: OrgWallet[], org: string, amount: number): OrgWallet[] {
  const idx = wallets.findIndex((w) => w.org === org);
  if (idx < 0) {
    return [{ org, balance: amount, role: "buyer" }, ...wallets];
  }
  const next = [...wallets];
  next[idx] = { ...next[idx], balance: next[idx].balance + amount };
  return next;
}

export function debitOrgWallet(wallets: OrgWallet[], org: string, amount: number): OrgWallet[] | null {
  const idx = wallets.findIndex((w) => w.org === org);
  if (idx < 0 || wallets[idx].balance < amount) return null;
  const next = [...wallets];
  next[idx] = { ...next[idx], balance: next[idx].balance - amount };
  return next;
}

export function creditOrgWallet(wallets: OrgWallet[], org: string, amount: number, role?: OrgWallet["role"]): OrgWallet[] {
  const idx = wallets.findIndex((w) => w.org === org);
  if (idx < 0) return [{ org, balance: amount, role: role ?? "supplier" }, ...wallets];
  const next = [...wallets];
  next[idx] = { ...next[idx], balance: next[idx].balance + amount };
  return next;
}
