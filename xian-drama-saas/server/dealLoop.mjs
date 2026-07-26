/** Server-side deal loop helpers (mirrors src/utils/dealLoop.ts) */

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function findScene(packages, sceneId) {
  return packages.find((s) => s.id === sceneId) ?? packages[0];
}

export function suggestScene(packages, match) {
  const text = `${match.need}${match.offer}`;
  if (/出海|译制|配音|北美|东南亚|中东/.test(text)) return packages.find((p) => p.id === "SCENE-OVERSEAS") ?? packages[0];
  if (/备案|合规|送审/.test(text)) return packages.find((p) => p.id === "SCENE-APPROVAL") ?? packages[0];
  if (/投流|冷启动|素材|投放/.test(text)) return packages.find((p) => p.id === "SCENE-DIST") ?? packages[0];
  if (/剧本|AI|虚拟|数字人|分镜/.test(text)) return packages.find((p) => p.id === "SCENE-AI") ?? packages[0];
  if (/场地|影棚|拍摄|许可|景区/.test(text)) return packages.find((p) => p.id === "SCENE-VENUE") ?? packages[0];
  return packages[0];
}

export function buildDealFromMatch({ match, supplierOrg, scene, dealIndex }) {
  const id = `DEAL-${String(dealIndex).padStart(3, "0")}`;
  const orderId = `WO-DEAL-${String(dealIndex).padStart(3, "0")}`;
  const createdAt = today();
  const due = new Date();
  due.setDate(due.getDate() + 7);

  const deal = {
    id,
    matchId: match.id,
    title: `${match.org} × ${supplierOrg}`,
    sceneId: scene.id,
    sceneName: scene.name,
    buyerOrg: match.org,
    supplierOrg,
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
    ledger: [
      {
        id: `${id}-L01`,
        type: "开预算",
        amount: scene.tokens,
        actor: "联盟秘书处",
        actorRole: "broker",
        note: `成交开立「${scene.name}」，锁定项目预算`,
        createdAt,
      },
    ],
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
    status: "新建",
    assignee,
    createdAt,
    dueAt: due.toISOString().slice(0, 10),
    summary: `撮合成交 ${match.id}：${match.need} ←→ ${supplierOrg}`,
    dealId: id,
  };

  return { deal, order };
}

export function applyConsume(deal, amount, actor, note, model, scene) {
  const spend = Math.min(amount, Math.max(0, deal.budget - deal.spent));
  if (spend <= 0) return deal;
  const brokerCut = Math.round(spend * (scene?.brokerFeeRate ?? 0.08));
  const supplierCut = Math.round(spend * (scene?.supplierShare ?? 0.1));
  const nextSpent = deal.spent + spend;
  const status = nextSpent >= deal.budget ? "已结算" : "履约中";
  const ledger = [
    {
      id: `${deal.id}-L${String(deal.ledger.length + 1).padStart(2, "0")}`,
      type: "消耗",
      amount: -spend,
      actor,
      actorRole: "center",
      model,
      note,
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
      note: `从本次履约计提撮合服务费 ${Math.round((scene?.brokerFeeRate ?? 0) * 100)}%`,
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
      note: `供给方履约激励 ${Math.round((scene?.supplierShare ?? 0) * 100)}%`,
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

export function debitWallet(wallets, org, amount) {
  const idx = wallets.findIndex((w) => w.org === org);
  if (idx < 0 || wallets[idx].balance < amount) return null;
  const next = structuredClone(wallets);
  next[idx].balance -= amount;
  return next;
}

export function creditWallet(wallets, org, amount, role = "supplier") {
  const next = structuredClone(wallets);
  const idx = next.findIndex((w) => w.org === org);
  if (idx < 0) next.unshift({ org, balance: amount, role });
  else next[idx].balance += amount;
  return next;
}
