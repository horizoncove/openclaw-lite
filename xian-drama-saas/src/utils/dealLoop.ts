import type {
  DealLedgerEntry,
  DealMilestone,
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
    consideration: "译制产能 + 合规意见 + 海外选品诊断",
    milestones: ["选品诊断", "合规审查", "译制交付", "上线复盘"],
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
    consideration: "材料风险结论 + 送审建议",
    milestones: ["收件预检", "风险会诊", "意见出具"],
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
    consideration: "发行体检 + 素材策略 + 冷启动复盘",
    milestones: ["新剧体检", "素材冷启动", "数据复盘"],
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
    consideration: "大纲/素材 AI 产能时段",
    milestones: ["需求对齐", "产线跑批", "效果固化"],
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
    consideration: "档期与拍摄许可协调结果",
    milestones: ["档期确认", "许可协调", "拍摄支持"],
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

function buildMilestones(scene: ScenePackage): DealMilestone[] {
  const n = Math.max(scene.milestones.length, 1);
  const base = Math.floor(scene.tokens / n);
  let remain = scene.tokens;
  return scene.milestones.map((title, i) => {
    const releaseTokens = i === n - 1 ? remain : base;
    remain -= releaseTokens;
    return {
      id: `MS${i + 1}`,
      title,
      weight: Math.round((releaseTokens / scene.tokens) * 100),
      status: i === 0 ? ("进行中" as const) : ("未开始" as const),
      releaseTokens,
      released: 0,
    };
  });
}

function nextActions(deal: Pick<DealProject, "status" | "phase" | "buyerAccepted" | "supplierAccepted" | "center">) {
  if (deal.phase === "待双边确认" || deal.status === "待确认") {
    return {
      nextActionBuyer: deal.buyerAccepted ? "已确认，等待供给方确认后冻结对价" : "确认交易标的与场景包，点头后进入托管",
      nextActionSupplier: deal.supplierAccepted ? "已确认，等待需求方确认后开工" : "确认能否按节点交付，点头承接",
      nextActionBroker: "督促双方确认；超时可代理确认以推进托管",
      nextActionCenter: "等待托管生效后再接单，避免无预算空转",
    };
  }
  if (deal.status === "已结算" || deal.phase === "已闭环") {
    return {
      nextActionBuyer: "核对退回额度与交付物，可评价并复购场景包",
      nextActionSupplier: "激励已入可用余额，更新作品/案例库接下一单",
      nextActionBroker: "归档交易画像，沉淀供需标签与信用",
      nextActionCenter: "关闭工单并复盘消耗结构（费/激励/保留）",
    };
  }
  if (deal.status === "履约中" || deal.phase === "履约中") {
    return {
      nextActionBuyer: "盯节点与托管剩余；不满可申请暂停",
      nextActionSupplier: "按当前里程碑交付，激励随消耗计提",
      nextActionBroker: "防逾期、疏通双方摩擦，必要时调优先级",
      nextActionCenter: `${deal.center === "联盟" ? "联盟协调" : deal.center + "中心"}按任务从托管池扣费`,
    };
  }
  return {
    nextActionBuyer: "对价已冻结在项目托管池，关注开工与节点",
    nextActionSupplier: "准备首个里程碑交付物",
    nextActionBroker: "确认中心已接单，托管资金未被挪用",
    nextActionCenter: "从托管池按任务扣费，开始首个节点",
  };
}

export function buildDealFromMatch(opts: {
  match: MatchNeed;
  supplierOrg: string;
  sceneId: string;
  dealIndex: number;
  /** 演示可默认双边已确认并直接托管 */
  autoAccept?: boolean;
}): { deal: DealProject; order: WorkOrder } {
  const scene = findScene(opts.sceneId) ?? SCENE_PACKAGES[0];
  const id = `DEAL-${String(opts.dealIndex).padStart(3, "0")}`;
  const orderId = `WO-DEAL-${String(opts.dealIndex).padStart(3, "0")}`;
  const createdAt = today();
  const due = new Date();
  due.setDate(due.getDate() + 7);
  const auto = opts.autoAccept !== false;

  const ledger: DealLedgerEntry[] = [
    {
      id: `${id}-L01`,
      type: "托管锁定",
      amount: scene.tokens,
      actor: "联盟秘书处",
      actorRole: "broker",
      note: `将对价冻结进托管池「${scene.name}」· 标的：${scene.consideration}`,
      createdAt,
    },
  ];
  if (auto) {
    ledger.unshift(
      {
        id: `${id}-L00b`,
        type: "确认",
        amount: 0,
        actor: opts.supplierOrg,
        actorRole: "supplier",
        note: "供给方确认承接（演示自动）",
        createdAt,
      },
      {
        id: `${id}-L00a`,
        type: "确认",
        amount: 0,
        actor: opts.match.org,
        actorRole: "buyer",
        note: "需求方确认交易标的（演示自动）",
        createdAt,
      },
    );
  }

  const base = {
    status: (auto ? "预算已开" : "待确认") as DealProject["status"],
    phase: (auto ? "托管中" : "待双边确认") as DealProject["phase"],
    buyerAccepted: auto,
    supplierAccepted: auto,
    center: scene.center,
  };
  const actions = nextActions(base);

  const deal: DealProject = {
    id,
    matchId: opts.match.id,
    title: `${opts.match.org} × ${opts.supplierOrg}`,
    sceneId: scene.id,
    sceneName: scene.name,
    consideration: scene.consideration,
    buyerOrg: opts.match.org,
    supplierOrg: opts.supplierOrg,
    broker: "联盟秘书处",
    ...base,
    budget: scene.tokens,
    escrow: auto ? scene.tokens : 0,
    spent: 0,
    brokerEarned: 0,
    supplierEarned: 0,
    centerRetained: 0,
    orderId,
    createdAt,
    updatedAt: createdAt,
    ...actions,
    milestones: buildMilestones(scene),
    ledger,
  };

  const order: WorkOrder = {
    id: orderId,
    product: scene.name,
    center: scene.center === "联盟" ? "联盟" : scene.center,
    org: opts.match.org,
    contact: opts.match.org,
    priority: "高",
    status: auto ? "新建" : "待客户",
    assignee:
      scene.center === "出海"
        ? "出海-韩磊"
        : scene.center === "审批"
          ? "审批-刘芳"
          : scene.center === "发行投流"
            ? "投流-苏晚"
            : scene.center === "AI"
              ? "AI-蒋一"
              : "联盟-陈希",
    createdAt,
    dueAt: due.toISOString().slice(0, 10),
    summary: `交易标的：${scene.consideration}｜撮合 ${opts.match.id}`,
    dealId: id,
  };

  return { deal, order };
}

/** 从可用余额冻结到 locked，并填入 deal.escrow */
export function lockEscrow(wallets: OrgWallet[], org: string, amount: number): OrgWallet[] | null {
  const idx = wallets.findIndex((w) => w.org === org);
  if (idx < 0 || wallets[idx].balance < amount) return null;
  const next = structuredClone(wallets) as OrgWallet[];
  next[idx].balance -= amount;
  next[idx].locked = (next[idx].locked ?? 0) + amount;
  return next;
}

export function unlockEscrow(wallets: OrgWallet[], org: string, amount: number): OrgWallet[] {
  const next = ensureWallet(wallets, org, "buyer");
  const idx = next.findIndex((w) => w.org === org);
  const locked = next[idx].locked ?? 0;
  const unlock = Math.min(amount, locked);
  next[idx].locked = locked - unlock;
  next[idx].balance += unlock;
  return next;
}

function ensureWallet(wallets: OrgWallet[], org: string, role: OrgWallet["role"]): OrgWallet[] {
  const next = structuredClone(wallets) as OrgWallet[];
  if (!next.some((w) => w.org === org)) next.unshift({ org, balance: 0, locked: 0, role });
  return next.map((w) => ({ ...w, locked: w.locked ?? 0 }));
}

export function applyConsume(
  deal: DealProject,
  amount: number,
  actor: string,
  note: string,
  model?: string,
): DealProject {
  if (deal.status === "待确认" || deal.phase === "待双边确认") return deal;
  if (deal.status === "已结算" || deal.phase === "已闭环") return deal;

  const scene = findScene(deal.sceneId);
  const spend = Math.min(amount, Math.max(0, deal.escrow));
  if (spend <= 0) return deal;

  const brokerCut = Math.round(spend * (scene?.brokerFeeRate ?? 0.08));
  const supplierCut = Math.round(spend * (scene?.supplierShare ?? 0.1));
  const centerKeep = Math.max(0, spend - brokerCut - supplierCut);
  const nextSpent = deal.spent + spend;
  const nextEscrow = deal.escrow - spend;
  const settled = nextEscrow <= 0;
  const status = settled ? "已结算" : "履约中";
  const phase = settled ? "结算中" : "履约中";

  let milestones = deal.milestones.map((m) => ({ ...m }));
  let left = spend;
  for (const m of milestones) {
    if (left <= 0) break;
    if (m.status === "已完成") continue;
    const room = m.releaseTokens - m.released;
    if (room <= 0) {
      m.status = "已完成";
      continue;
    }
    const take = Math.min(room, left);
    m.released += take;
    left -= take;
    m.status = m.released >= m.releaseTokens ? "已完成" : "进行中";
  }
  const firstPending = milestones.find((m) => m.status !== "已完成");
  if (firstPending && firstPending.status === "未开始") firstPending.status = "进行中";

  const ledger: DealLedgerEntry[] = [
    {
      id: `${deal.id}-L${String(deal.ledger.length + 1).padStart(2, "0")}`,
      type: "消耗",
      amount: -spend,
      actor,
      actorRole: "center",
      model,
      note: `${note} · 自托管池释放`,
      createdAt: today(),
    },
    ...deal.ledger,
  ];
  if (brokerCut > 0) {
    ledger.unshift({
      id: `${deal.id}-L${String(ledger.length + 1).padStart(2, "0")}`,
      type: "撮合费",
      amount: brokerCut,
      actor: deal.broker,
      actorRole: "broker",
      note: `对价切割 ${Math.round((scene?.brokerFeeRate ?? 0) * 100)}% → 匹配/背书/盯单`,
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
      note: `对价切割 ${Math.round((scene?.supplierShare ?? 0) * 100)}% → 交付产能`,
      createdAt: today(),
    });
  }
  if (centerKeep > 0) {
    ledger.unshift({
      id: `${deal.id}-L${String(ledger.length + 1).padStart(2, "0")}`,
      type: "中心保留",
      amount: centerKeep,
      actor: `${deal.center}中心`,
      actorRole: "center",
      note: "对价切割剩余 → 中心履约成本",
      createdAt: today(),
    });
  }

  const updated: DealProject = {
    ...deal,
    spent: nextSpent,
    escrow: nextEscrow,
    brokerEarned: deal.brokerEarned + brokerCut,
    supplierEarned: deal.supplierEarned + supplierCut,
    centerRetained: deal.centerRetained + centerKeep,
    status,
    phase,
    updatedAt: today(),
    milestones,
    ledger,
    ...nextActions({ status, phase, buyerAccepted: deal.buyerAccepted, supplierAccepted: deal.supplierAccepted, center: deal.center }),
  };
  return updated;
}

/** 结算：未用托管退回买方可用余额 */
export function settleDeal(deal: DealProject): { deal: DealProject; refund: number } {
  const refund = Math.max(0, deal.escrow);
  const ledger = [...deal.ledger];
  if (refund > 0) {
    ledger.unshift({
      id: `${deal.id}-L${String(ledger.length + 1).padStart(2, "0")}`,
      type: "退款",
      amount: refund,
      actor: deal.buyerOrg,
      actorRole: "buyer",
      note: "结算退回未消耗托管",
      createdAt: today(),
    });
  }
  const status = "已结算" as const;
  const phase = "已闭环" as const;
  return {
    refund,
    deal: {
      ...deal,
      escrow: 0,
      status,
      phase,
      updatedAt: today(),
      ledger,
      ...nextActions({
        status,
        phase,
        buyerAccepted: true,
        supplierAccepted: true,
        center: deal.center,
      }),
    },
  };
}

export function confirmDealSide(
  deal: DealProject,
  side: "buyer" | "supplier",
  actor: string,
): DealProject {
  if (deal.phase === "已闭环" || deal.status === "已结算") return deal;
  const buyerAccepted = side === "buyer" ? true : deal.buyerAccepted;
  const supplierAccepted = side === "supplier" ? true : deal.supplierAccepted;
  const both = buyerAccepted && supplierAccepted;
  const ledger: DealLedgerEntry[] = [
    {
      id: `${deal.id}-L${String(deal.ledger.length + 1).padStart(2, "0")}`,
      type: "确认",
      amount: 0,
      actor,
      actorRole: side,
      note: side === "buyer" ? "需求方确认交易标的与对价" : "供给方确认承接交付",
      createdAt: today(),
    },
    ...deal.ledger,
  ];
  const status = both ? (deal.escrow > 0 || deal.budget > 0 ? "预算已开" : "待确认") : "待确认";
  const phase = both ? (deal.escrow > 0 ? "托管中" : "待双边确认") : "待双边确认";
  return {
    ...deal,
    buyerAccepted,
    supplierAccepted,
    status: both && deal.escrow > 0 ? "预算已开" : status,
    phase: both && deal.escrow > 0 ? "托管中" : phase,
    updatedAt: today(),
    ledger,
    ...nextActions({
      status: both && deal.escrow > 0 ? "预算已开" : "待确认",
      phase: both && deal.escrow > 0 ? "托管中" : "待双边确认",
      buyerAccepted,
      supplierAccepted,
      center: deal.center,
    }),
  };
}

export function topUpOrgWallet(wallets: OrgWallet[], org: string, amount: number): OrgWallet[] {
  const next = ensureWallet(wallets, org, "buyer");
  const idx = next.findIndex((w) => w.org === org);
  next[idx].balance += amount;
  return next;
}

export function debitOrgWallet(wallets: OrgWallet[], org: string, amount: number): OrgWallet[] | null {
  return lockEscrow(wallets, org, amount);
}

export function creditOrgWallet(
  wallets: OrgWallet[],
  org: string,
  amount: number,
  role?: OrgWallet["role"],
): OrgWallet[] {
  const next = ensureWallet(wallets, org, role ?? "supplier");
  const idx = next.findIndex((w) => w.org === org);
  next[idx].balance += amount;
  return next;
}

/** 履约消耗时同步减少买方 locked */
export function releaseBuyerLocked(wallets: OrgWallet[], org: string, amount: number): OrgWallet[] {
  const next = ensureWallet(wallets, org, "buyer");
  const idx = next.findIndex((w) => w.org === org);
  next[idx].locked = Math.max(0, (next[idx].locked ?? 0) - amount);
  return next;
}

export function explainSplit(spend: number, scene?: ScenePackage) {
  const brokerCut = Math.round(spend * (scene?.brokerFeeRate ?? 0.08));
  const supplierCut = Math.round(spend * (scene?.supplierShare ?? 0.1));
  const centerKeep = Math.max(0, spend - brokerCut - supplierCut);
  return { brokerCut, supplierCut, centerKeep };
}
