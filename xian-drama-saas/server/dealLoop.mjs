/** Server-side deal loop — mirrors src/utils/dealLoop.ts (escrow + phase) */

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function findScene(packages, sceneId) {
  return packages.find((s) => s.id === sceneId) ?? packages[0];
}

function ensureLocked(w) {
  return { ...w, locked: w.locked ?? 0 };
}

export function lockEscrow(wallets, org, amount) {
  const next = wallets.map(ensureLocked);
  const idx = next.findIndex((w) => w.org === org);
  if (idx < 0 || next[idx].balance < amount) return null;
  next[idx].balance -= amount;
  next[idx].locked += amount;
  return next;
}

export function unlockEscrow(wallets, org, amount) {
  const next = wallets.map(ensureLocked);
  let idx = next.findIndex((w) => w.org === org);
  if (idx < 0) {
    next.unshift({ org, balance: amount, locked: 0, role: "buyer" });
    return next;
  }
  const unlock = Math.min(amount, next[idx].locked);
  next[idx].locked -= unlock;
  next[idx].balance += unlock;
  return next;
}

export function creditWallet(wallets, org, amount, role = "supplier") {
  const next = wallets.map(ensureLocked);
  const idx = next.findIndex((w) => w.org === org);
  if (idx < 0) next.unshift({ org, balance: amount, locked: 0, role });
  else next[idx].balance += amount;
  return next;
}

export function releaseBuyerLocked(wallets, org, amount) {
  const next = wallets.map(ensureLocked);
  const idx = next.findIndex((w) => w.org === org);
  if (idx < 0) return next;
  next[idx].locked = Math.max(0, next[idx].locked - amount);
  return next;
}

function buildMilestones(scene) {
  const titles = scene.milestones?.length ? scene.milestones : ["履约节点"];
  const n = titles.length;
  const base = Math.floor(scene.tokens / n);
  let remain = scene.tokens;
  return titles.map((title, i) => {
    const releaseTokens = i === n - 1 ? remain : base;
    remain -= releaseTokens;
    return {
      id: `MS${i + 1}`,
      title,
      weight: Math.round((releaseTokens / scene.tokens) * 100),
      status: i === 0 ? "进行中" : "未开始",
      releaseTokens,
      released: 0,
    };
  });
}

function nextActions(deal) {
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

export function buildDealFromMatch({ match, supplierOrg, scene, dealIndex, autoAccept = true }) {
  const id = `DEAL-${String(dealIndex).padStart(3, "0")}`;
  const orderId = `WO-DEAL-${String(dealIndex).padStart(3, "0")}`;
  const createdAt = today();
  const due = new Date();
  due.setDate(due.getDate() + 7);
  const consideration = scene.consideration || scene.desc;

  const ledger = [
    {
      id: `${id}-L01`,
      type: "托管锁定",
      amount: scene.tokens,
      actor: "联盟秘书处",
      actorRole: "broker",
      note: `将对价冻结进托管池「${scene.name}」· 标的：${consideration}`,
      createdAt,
    },
  ];
  if (autoAccept) {
    ledger.unshift(
      {
        id: `${id}-L00b`,
        type: "确认",
        amount: 0,
        actor: supplierOrg,
        actorRole: "supplier",
        note: "供给方确认承接（演示自动）",
        createdAt,
      },
      {
        id: `${id}-L00a`,
        type: "确认",
        amount: 0,
        actor: match.org,
        actorRole: "buyer",
        note: "需求方确认交易标的（演示自动）",
        createdAt,
      },
    );
  }

  const status = autoAccept ? "预算已开" : "待确认";
  const phase = autoAccept ? "托管中" : "待双边确认";
  const actions = nextActions({
    status,
    phase,
    buyerAccepted: autoAccept,
    supplierAccepted: autoAccept,
    center: scene.center,
  });

  const deal = {
    id,
    matchId: match.id,
    title: `${match.org} × ${supplierOrg}`,
    sceneId: scene.id,
    sceneName: scene.name,
    consideration,
    buyerOrg: match.org,
    supplierOrg,
    broker: "联盟秘书处",
    center: scene.center,
    status,
    phase,
    buyerAccepted: autoAccept,
    supplierAccepted: autoAccept,
    budget: scene.tokens,
    escrow: autoAccept ? scene.tokens : 0,
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

  const assignee =
    scene.center === "出海"
      ? "出海-韩磊"
      : scene.center === "审批"
        ? "审批-刘芳"
        : scene.center === "发行投流"
          ? "投流-苏晚"
          : scene.center === "AI"
            ? "AI-蒋一"
            : "联盟-陈希";

  const order = {
    id: orderId,
    product: scene.name,
    center: scene.center === "联盟" ? "联盟" : scene.center,
    org: match.org,
    contact: match.org,
    priority: "高",
    status: autoAccept ? "新建" : "待客户",
    assignee,
    createdAt,
    dueAt: due.toISOString().slice(0, 10),
    summary: `交易标的：${consideration}｜撮合 ${match.id}`,
    dealId: id,
  };

  return { deal, order };
}

export function applyConsume(deal, amount, actor, note, model, scene) {
  if (deal.status === "待确认" || deal.phase === "待双边确认") return deal;
  if (deal.status === "已结算" || deal.phase === "已闭环") return deal;
  const spend = Math.min(Number(amount) || 0, Math.max(0, deal.escrow ?? deal.budget - deal.spent));
  if (spend <= 0) return deal;

  const brokerCut = Math.round(spend * (scene?.brokerFeeRate ?? 0.08));
  const supplierCut = Math.round(spend * (scene?.supplierShare ?? 0.1));
  const centerKeep = Math.max(0, spend - brokerCut - supplierCut);
  const nextSpent = deal.spent + spend;
  const nextEscrow = (deal.escrow ?? deal.budget - deal.spent) - spend;
  const settled = nextEscrow <= 0;
  const status = settled ? "已结算" : "履约中";
  const phase = settled ? "结算中" : "履约中";

  let milestones = (deal.milestones || []).map((m) => ({ ...m }));
  let left = spend;
  for (const m of milestones) {
    if (left <= 0) break;
    if (m.status === "已完成") continue;
    const room = (m.releaseTokens || 0) - (m.released || 0);
    if (room <= 0) {
      m.status = "已完成";
      continue;
    }
    const take = Math.min(room, left);
    m.released = (m.released || 0) + take;
    left -= take;
    m.status = m.released >= m.releaseTokens ? "已完成" : "进行中";
  }

  const ledger = [
    {
      id: `${deal.id}-L${String((deal.ledger?.length || 0) + 1).padStart(2, "0")}`,
      type: "消耗",
      amount: -spend,
      actor,
      actorRole: "center",
      model,
      note: `${note} · 自托管池释放`,
      createdAt: today(),
    },
    ...(deal.ledger || []),
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

  const partial = {
    ...deal,
    spent: nextSpent,
    escrow: nextEscrow,
    brokerEarned: (deal.brokerEarned || 0) + brokerCut,
    supplierEarned: (deal.supplierEarned || 0) + supplierCut,
    centerRetained: (deal.centerRetained || 0) + centerKeep,
    status,
    phase,
    milestones,
    ledger,
    updatedAt: today(),
  };
  return { ...partial, ...nextActions(partial) };
}

export function settleDeal(deal) {
  const refund = Math.max(0, deal.escrow || 0);
  const ledger = [...(deal.ledger || [])];
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
  const partial = {
    ...deal,
    escrow: 0,
    status: "已结算",
    phase: "已闭环",
    updatedAt: today(),
    ledger,
  };
  return { refund, deal: { ...partial, ...nextActions(partial) } };
}

export function confirmDealSide(deal, side, actor) {
  const buyerAccepted = side === "buyer" ? true : !!deal.buyerAccepted;
  const supplierAccepted = side === "supplier" ? true : !!deal.supplierAccepted;
  const both = buyerAccepted && supplierAccepted;
  const ledger = [
    {
      id: `${deal.id}-L${String((deal.ledger?.length || 0) + 1).padStart(2, "0")}`,
      type: "确认",
      amount: 0,
      actor,
      actorRole: side,
      note: side === "buyer" ? "需求方确认交易标的与对价" : "供给方确认承接交付",
      createdAt: today(),
    },
    ...(deal.ledger || []),
  ];
  const partial = {
    ...deal,
    buyerAccepted,
    supplierAccepted,
    status: both && (deal.escrow > 0 || deal.budget > 0) ? "预算已开" : "待确认",
    phase: both && deal.escrow > 0 ? "托管中" : "待双边确认",
    updatedAt: today(),
    ledger,
  };
  return { ...partial, ...nextActions(partial) };
}

/** @deprecated use lockEscrow */
export function debitWallet(wallets, org, amount) {
  return lockEscrow(wallets, org, amount);
}
