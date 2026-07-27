import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as jsonDb from "./db.mjs";
import * as repo from "./db/repo.mjs";
import { checkDb } from "./db/pool.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadCenterSeed() {
  return JSON.parse(readFileSync(join(__dirname, "data", "center-seed.json"), "utf8"));
}

function loadAllianceSeed() {
  return JSON.parse(readFileSync(join(__dirname, "data", "alliance-seed.json"), "utf8"));
}

function mergeCenterExtras(base, seed) {
  return {
    ...base,
    tokenModels: seed.tokenModels ?? [],
    tokenPackages: seed.tokenPackages ?? [],
    tokenWallet: base.tokenWallet ?? seed.tokenWallet ?? {
      balance: 0,
      usedThisMonth: 0,
      monthlyQuota: 100000,
      apiKey: `xd-center-sk-${Math.random().toString(36).slice(2, 10)}`,
      transactions: [],
    },
  };
}

function mergeAllianceExtras(base, seed) {
  return {
    ...base,
    works: base.works?.length ? base.works : seed.works ?? [],
    venues: base.venues?.length ? base.venues : seed.venues ?? [],
    deals: base.deals?.length ? base.deals : seed.deals ?? [],
    orgWallets: base.orgWallets?.length ? base.orgWallets : seed.orgWallets ?? [],
    bids: base.bids?.length ? base.bids : seed.bids ?? [],
    disputes: base.disputes?.length ? base.disputes : seed.disputes ?? [],
    scenePackages: seed.scenePackages ?? base.scenePackages ?? [],
  };
}

let usePostgres = null;

export async function initStore() {
  if (usePostgres !== null) return usePostgres;
  const forceJson = process.env.STORAGE === "json";
  const forcePg = process.env.STORAGE === "postgres" || process.env.DATABASE_URL;
  if (forceJson) {
    usePostgres = false;
    console.log("[store] using JSON file storage");
    return false;
  }
  if (forcePg) {
    try {
      const ok = await checkDb();
      if (ok) {
        usePostgres = true;
        console.log("[store] using PostgreSQL");
        return true;
      }
    } catch {
      /* fall through */
    }
  }
  usePostgres = false;
  console.log("[store] PostgreSQL unavailable, falling back to JSON");
  return false;
}

export function isPostgres() {
  return usePostgres === true;
}

function loadSeed(portal) {
  return JSON.parse(readFileSync(join(__dirname, "data", `${portal}-seed.json`), "utf8"));
}

function patchJson(portal, key, id, patch) {
  const db = jsonDb.loadDb(portal);
  const idx = db[key].findIndex((x) => x.id === id);
  if (idx < 0) return null;
  db[key][idx] = { ...db[key][idx], ...patch };
  jsonDb.saveDb(portal, db);
  return db[key][idx];
}

function upsertJsonList(portal, key, item) {
  const db = jsonDb.loadDb(portal);
  const idx = db[key].findIndex((x) => x.id === item.id);
  if (idx >= 0) db[key][idx] = item;
  else db[key].unshift(item);
  jsonDb.saveDb(portal, db);
  return item;
}

// ── Alliance ──────────────────────────────────────────────

export async function getAllianceState() {
  const seed = loadAllianceSeed();
  if (usePostgres) {
    const base = await repo.getAllianceState();
    const extras = await repo.getAllianceExtras();
    return mergeAllianceExtras({ ...base, ...extras }, seed);
  }
  return mergeAllianceExtras(jsonDb.loadDb("alliance"), seed);
}

export async function resetAllianceState() {
  if (usePostgres) return repo.resetAllianceState(loadSeed("alliance"));
  return jsonDb.resetDb("alliance");
}

export async function getAllianceStats() {
  if (usePostgres) return repo.getAllianceStats();
  const db = jsonDb.loadDb("alliance");
  return {
    members: db.members.filter((m) => m.status === "有效").length,
    openOrders: db.orders.filter((o) => !["完结", "关闭"].includes(o.status)).length,
    events: db.events.filter((e) => e.status !== "已结束").length,
    matches: db.matches.filter((m) => ["开放", "撮合中"].includes(m.status)).length,
  };
}

export async function listMembers() {
  if (usePostgres) return repo.listMembers();
  return jsonDb.loadDb("alliance").members;
}

export async function upsertMember(item) {
  if (usePostgres) return repo.upsertMember(item);
  return upsertJsonList("alliance", "members", item);
}

export async function patchMember(id, patch) {
  if (usePostgres) return repo.patchMember(id, patch);
  return patchJson("alliance", "members", id, patch);
}

export async function listEvents() {
  if (usePostgres) return repo.listEvents();
  return jsonDb.loadDb("alliance").events;
}

export async function upsertEvent(item) {
  if (usePostgres) return repo.upsertEvent(item);
  return upsertJsonList("alliance", "events", item);
}

export async function patchEvent(id, patch) {
  if (usePostgres) return repo.patchEvent(id, patch);
  return patchJson("alliance", "events", id, patch);
}

export async function saveMatch(item) {
  if (usePostgres) return repo.saveMatch(item);
  return upsertJsonList("alliance", "matches", item);
}

export async function listMatches() {
  if (usePostgres) return repo.listMatches();
  return jsonDb.loadDb("alliance").matches;
}

export async function patchMatch(id, patch) {
  if (usePostgres) return repo.patchMatch(id, patch);
  return patchJson("alliance", "matches", id, patch);
}

export async function listAllianceOrders() {
  if (usePostgres) return repo.listOrders("alliance");
  return jsonDb.loadDb("alliance").orders;
}

export async function upsertAllianceOrder(item) {
  if (usePostgres) return repo.upsertOrder(item);
  return upsertJsonList("alliance", "orders", item);
}

export async function patchAllianceOrder(id, patch) {
  if (usePostgres) return repo.patchOrder(id, patch);
  return patchJson("alliance", "orders", id, patch);
}

export async function listWorks() {
  const state = await getAllianceState();
  return state.works;
}

export async function upsertWork(item) {
  if (usePostgres) return repo.upsertWork(item);
  return upsertJsonList("alliance", "works", item);
}

export async function patchWork(id, patch) {
  if (usePostgres) return repo.patchWork(id, patch);
  return patchJson("alliance", "works", id, patch);
}

export async function listVenues() {
  const state = await getAllianceState();
  return state.venues;
}

export async function patchVenue(id, patch) {
  if (usePostgres) return repo.patchVenue(id, patch);
  return patchJson("alliance", "venues", id, patch);
}

async function persistAllianceLoop(state) {
  if (usePostgres) {
    await repo.saveAllianceExtras("deals", state.deals);
    await repo.saveAllianceExtras("orgWallets", state.orgWallets);
    await repo.saveAllianceExtras("works", state.works ?? []);
    await repo.saveAllianceExtras("venues", state.venues ?? []);
    await repo.saveAllianceExtras("bids", state.bids ?? []);
    await repo.saveAllianceExtras("disputes", state.disputes ?? []);
    for (const m of state.matches ?? []) await repo.patchMatch(m.id, m);
    for (const o of state.orders ?? []) {
      if (o.center === "联盟" || o.dealId) await repo.upsertOrder(o);
    }
  } else {
    const db = jsonDb.loadDb("alliance");
    db.deals = state.deals;
    db.orgWallets = state.orgWallets;
    db.matches = state.matches;
    db.orders = state.orders;
    db.bids = state.bids ?? [];
    db.disputes = state.disputes ?? [];
    jsonDb.saveDb("alliance", db);
  }
}

export async function closeMatchDeal({
  matchId,
  supplierOrg,
  sceneId,
  bidId,
  payMechanism,
  payMechanismSource,
  payMechanismNote,
  budgetOverride,
}) {
  const { buildDealFromMatch, findScene, lockEscrow, today } = await import("./dealLoop.mjs");
  const state = await getAllianceState();
  const match = state.matches.find((m) => m.id === matchId);
  if (!match) throw new Error("供需不存在");
  if (match.status === "已成交" && match.dealId) throw new Error("该供需已成交并开立项目");

  const scene = findScene(state.scenePackages, sceneId || match.sceneId);
  if (!scene) throw new Error("场景包不存在");

  let partner = supplierOrg || match.suggestedPartner;
  let mechanism = payMechanism || match.preferredPayMechanism || "预付";
  let mechSource = payMechanismSource || "buyer";
  let mechNote = payMechanismNote || match.payMechanismNote;
  let quote;
  let bids = [...(state.bids || [])];

  if (bidId) {
    const bid = bids.find((b) => b.id === bidId && b.matchId === matchId);
    if (!bid) throw new Error("应征不存在");
    if (bid.status === "撤回" || bid.status === "已拒绝") throw new Error("该应征不可采纳");
    partner = bid.supplierOrg;
    mechanism = bid.proposedPayMechanism;
    mechSource = bid.acceptBuyerMechanism ? "buyer" : "supplier";
    mechNote = bid.note || mechNote;
    quote = bid.quoteTokens;
    bids = bids.map((b) => {
      if (b.id === bidId) return { ...b, status: "已采纳" };
      if (b.matchId === matchId && b.status === "待审") return { ...b, status: "已拒绝" };
      return b;
    });
  } else if (payMechanism && payMechanism !== match.preferredPayMechanism) {
    mechSource = payMechanismSource || "negotiated";
  }

  if (!partner) throw new Error("请指定供给方");

  const dealIndex = state.deals.length + 1;
  const preview = buildDealFromMatch({
    match,
    supplierOrg: partner,
    scene,
    dealIndex,
    autoAccept: true,
    payMechanism: mechanism,
    payMechanismSource: mechSource,
    payMechanismNote: mechNote,
    budgetOverride: budgetOverride || quote,
  });

  let wallets = lockEscrow(state.orgWallets, match.org, preview.lockAmount);
  if (!wallets) {
    throw new Error(
      `需求方「${match.org}」可用余额不足（需冻结 ${preview.lockAmount.toLocaleString()}，机制「${mechanism}」），请先充值`,
    );
  }

  const { deal, order } = preview;

  const matches = state.matches.map((m) =>
    m.id === matchId
      ? {
          ...m,
          status: "已成交",
          dealId: deal.id,
          suggestedPartner: partner,
          sceneId: scene.id,
          preferredPayMechanism: mechanism,
          updatedAt: today(),
        }
      : m,
  );
  const deals = [deal, ...state.deals];
  const orders = [order, ...state.orders];

  const next = { ...state, matches, deals, orders, orgWallets: wallets, bids };
  await persistAllianceLoop(next);

  if (order.center !== "联盟") {
    try {
      if (usePostgres) await repo.upsertOrder(order);
      else {
        const cdb = jsonDb.loadDb("center");
        const idx = cdb.orders.findIndex((x) => x.id === order.id);
        if (idx >= 0) cdb.orders[idx] = order;
        else cdb.orders.unshift(order);
        jsonDb.saveDb("center", cdb);
      }
    } catch {
      /* ignore */
    }
  }

  return getAllianceState();
}

export async function placeMatchBid(body) {
  const { today } = await import("./dealLoop.mjs");
  const state = await getAllianceState();
  const {
    matchId,
    supplierOrg,
    acceptBuyerMechanism = true,
    proposedPayMechanism,
    note = "",
    quoteTokens,
  } = body || {};
  if (!matchId || !supplierOrg) throw new Error("缺少 matchId 或 supplierOrg");
  const match = state.matches.find((m) => m.id === matchId);
  if (!match) throw new Error("供需不存在");
  if (!["开放", "撮合中"].includes(match.status)) throw new Error("该供需已不可应征");
  if (match.org === supplierOrg) throw new Error("不能应征自己的供需");

  const buyerMech = match.preferredPayMechanism || "预付";
  const proposed = proposedPayMechanism || buyerMech;
  const accept = !!acceptBuyerMechanism && proposed === buyerMech;

  const existing = (state.bids || []).find(
    (b) => b.matchId === matchId && b.supplierOrg === supplierOrg && b.status === "待审",
  );
  if (existing) throw new Error("已有待审应征，请先撤回或等待审核");

  const bid = {
    id: `BID-${String((state.bids?.length || 0) + 1).padStart(3, "0")}`,
    matchId,
    supplierOrg,
    acceptBuyerMechanism: accept,
    proposedPayMechanism: proposed,
    note: note || (accept ? "接受需求方支付机制" : `要求改为「${proposed}」`),
    quoteTokens: quoteTokens > 0 ? Number(quoteTokens) : undefined,
    status: "待审",
    createdAt: today(),
  };

  const bids = [bid, ...(state.bids || [])];
  const matches = state.matches.map((m) =>
    m.id === matchId && m.status === "开放" ? { ...m, status: "撮合中", updatedAt: today() } : m,
  );
  await persistAllianceLoop({ ...state, bids, matches });
  return getAllianceState();
}

export async function reviewMatchBid({ bidId, action }) {
  const state = await getAllianceState();
  const bid = (state.bids || []).find((b) => b.id === bidId);
  if (!bid) throw new Error("应征不存在");
  if (bid.status !== "待审") throw new Error("应征已处理");

  if (action === "reject") {
    const bids = state.bids.map((b) => (b.id === bidId ? { ...b, status: "已拒绝" } : b));
    await persistAllianceLoop({ ...state, bids });
    return getAllianceState();
  }
  if (action === "withdraw") {
    const bids = state.bids.map((b) => (b.id === bidId ? { ...b, status: "撤回" } : b));
    await persistAllianceLoop({ ...state, bids });
    return getAllianceState();
  }
  if (action === "accept") {
    return closeMatchDeal({ matchId: bid.matchId, bidId });
  }
  throw new Error("action 须为 accept / reject / withdraw");
}

export async function consumeDealTokens({ dealId, amount, actor, note, model }) {
  const {
    applyConsume,
    findScene,
    creditWallet,
    releaseBuyerLocked,
    topUpEscrow,
    today,
  } = await import("./dealLoop.mjs");
  const state = await getAllianceState();
  let deal = state.deals.find((d) => d.id === dealId);
  if (!deal) throw new Error("项目不存在");
  if (deal.status === "已结算" || deal.phase === "已闭环") throw new Error("项目已结算");
  if (deal.status === "待确认") throw new Error("双方尚未确认，托管未生效");
  if (deal.status === "暂停") throw new Error("项目争议暂停中，须仲裁结案后才能继续履约");

  const scene = findScene(state.scenePackages, deal.sceneId);
  let want = Number(amount) || 0;
  if (want <= 0) throw new Error("扣费金额无效");

  let wallets = state.orgWallets;
  // 过程支付：托管不足时从 unfunded 追加冻结
  if (deal.escrow < want && (deal.unfunded || 0) > 0) {
    const gap = Math.min(want - deal.escrow, deal.unfunded);
    const topped = topUpEscrow(deal, wallets, gap);
    if (!topped) throw new Error(`过程支付追加冻结失败：买方可用余额不足（需 ${gap.toLocaleString()}）`);
    deal = topped.deal;
    wallets = topped.wallets;
  }

  const spend = Math.min(want, deal.escrow ?? 0);
  if (spend <= 0) throw new Error("扣费金额无效或托管已耗尽");

  const beforeBroker = deal.brokerEarned || 0;
  const beforeSupplier = deal.supplierEarned || 0;
  const updated = applyConsume(deal, spend, actor || "中心专员", note || "履约扣费", model, scene);
  const brokerDelta = (updated.brokerEarned || 0) - beforeBroker;
  const supplierDelta = (updated.supplierEarned || 0) - beforeSupplier;

  wallets = releaseBuyerLocked(wallets, deal.buyerOrg, spend);
  if (brokerDelta > 0) wallets = creditWallet(wallets, "联盟秘书处", brokerDelta, "broker");
  if (supplierDelta > 0) wallets = creditWallet(wallets, deal.supplierOrg, supplierDelta, "supplier");

  const deals = state.deals.map((d) => (d.id === dealId ? updated : d));
  const orders = state.orders.map((o) =>
    o.dealId === dealId
      ? {
          ...o,
          status: updated.status === "已结算" ? "完结" : "处理中",
          summary: `${String(o.summary).split("｜")[0]}｜托管剩余 ${updated.escrow}/${updated.budget}`,
        }
      : o,
  );

  await persistAllianceLoop({ ...state, deals, orgWallets: wallets, orders });

  try {
    const center = await getCenterState();
    const wallet = structuredClone(center.tokenWallet);
    wallet.usedThisMonth += spend;
    wallet.balance = Math.max(0, wallet.balance - Math.round(spend * 0.15));
    wallet.transactions.unshift({
      id: `TX-${Date.now()}`,
      type: "消耗",
      amount: -spend,
      balance: wallet.balance,
      model,
      note: note || `项目 ${dealId} 自托管池释放`,
      createdAt: today(),
      dealId,
    });
    if (usePostgres) await repo.saveTokenWallet(wallet);
    else {
      const cdb = jsonDb.loadDb("center");
      cdb.tokenWallet = wallet;
      jsonDb.saveDb("center", cdb);
    }
  } catch {
    /* ignore */
  }

  return getAllianceState();
}

export async function settleDealProject(dealId) {
  const { settleDeal, unlockEscrow, creditWallet } = await import("./dealLoop.mjs");
  const state = await getAllianceState();
  const deal = state.deals.find((d) => d.id === dealId);
  if (!deal) throw new Error("项目不存在");
  if (deal.phase === "已闭环") throw new Error("项目已闭环");
  if (deal.status === "暂停") throw new Error("争议暂停中，请先完成仲裁再结算");

  const { deal: updated, refund, releasedBroker, releasedSupplier } = settleDeal(deal);
  let wallets = state.orgWallets;
  if (refund > 0) wallets = unlockEscrow(wallets, deal.buyerOrg, refund);
  if (releasedBroker > 0) wallets = creditWallet(wallets, "联盟秘书处", releasedBroker, "broker");
  if (releasedSupplier > 0) wallets = creditWallet(wallets, deal.supplierOrg, releasedSupplier, "supplier");

  const deals = state.deals.map((d) => (d.id === dealId ? updated : d));
  const orders = state.orders.map((o) =>
    o.dealId === dealId ? { ...o, status: "完结" } : o,
  );
  await persistAllianceLoop({ ...state, deals, orgWallets: wallets, orders });
  return getAllianceState();
}

export async function raiseDispute({ dealId, raisedBy, raisedRole = "buyer", reason, claimTokens }) {
  const { today } = await import("./dealLoop.mjs");
  const state = await getAllianceState();
  const deal = state.deals.find((d) => d.id === dealId);
  if (!deal) throw new Error("项目不存在");
  if (deal.phase === "已闭环" || deal.status === "已结算") throw new Error("已闭环项目不可提起争议");
  if (deal.status === "暂停") throw new Error("已有进行中的争议");
  const open = (state.disputes || []).find((d) => d.dealId === dealId && d.status === "调解中");
  if (open) throw new Error("该项目已有调解中争议");

  const claim = Math.max(0, Number(claimTokens) || 0);
  const disputeId = `DSP-${String((state.disputes?.length || 0) + 1).padStart(3, "0")}`;
  const orderId = `AL-DSP-${disputeId.slice(4)}`;
  const createdAt = today();

  const order = {
    id: orderId,
    product: `【争议】${deal.id} ${deal.sceneName}`,
    center: "联盟",
    org: deal.buyerOrg,
    contact: raisedBy || deal.buyerOrg,
    priority: "高",
    status: "处理中",
    assignee: "联盟-陈希",
    createdAt,
    dueAt: createdAt,
    summary: reason || "履约争议待调解",
    dealId: deal.id,
  };

  const dispute = {
    id: disputeId,
    dealId,
    raisedBy: raisedBy || deal.buyerOrg,
    raisedRole,
    reason: reason || "交付或分账争议",
    claimTokens: claim,
    status: "调解中",
    orderId,
    createdAt,
    updatedAt: createdAt,
  };

  const ledger = [
    {
      id: `${deal.id}-L${String((deal.ledger?.length || 0) + 1).padStart(2, "0")}`,
      type: "仲裁",
      amount: 0,
      actor: raisedBy || deal.buyerOrg,
      actorRole: raisedRole,
      note: `提起争议 ${disputeId}：${dispute.reason}${claim ? ` · 诉请 ${claim.toLocaleString()} Tokens` : ""}`,
      createdAt,
    },
    ...(deal.ledger || []),
  ];

  const updatedDeal = {
    ...deal,
    status: "暂停",
    updatedAt: createdAt,
    ledger,
    nextActionBuyer: "争议调解中，补充证据并等待秘书处裁决",
    nextActionSupplier: "争议调解中，准备交付证据与说明",
    nextActionBroker: `主持调解 ${disputeId}；必要时出具 Token 调整裁定`,
    nextActionCenter: "项目已暂停，停止新的托管消耗",
  };

  await persistAllianceLoop({
    ...state,
    deals: state.deals.map((d) => (d.id === dealId ? updatedDeal : d)),
    disputes: [dispute, ...(state.disputes || [])],
    orders: [order, ...state.orders],
  });
  return getAllianceState();
}

export async function decideDispute({
  disputeId,
  decision,
  decidedBy = "联盟秘书处",
  adjustBuyerRefund = 0,
  adjustSupplierClawback = 0,
}) {
  const { today, unlockEscrow, creditWallet } = await import("./dealLoop.mjs");
  const state = await getAllianceState();
  const dispute = (state.disputes || []).find((d) => d.id === disputeId);
  if (!dispute) throw new Error("争议不存在");
  if (dispute.status !== "调解中") throw new Error("争议已处理");

  const deal = state.deals.find((d) => d.id === dispute.dealId);
  if (!deal) throw new Error("关联项目不存在");

  const refund = Math.min(Math.max(0, Number(adjustBuyerRefund) || 0), deal.escrow || 0);
  let clawback = Math.max(0, Number(adjustSupplierClawback) || 0);
  const held = deal.heldSupplier || 0;
  const earned = deal.supplierEarned || 0;
  const fromHeld = Math.min(clawback, held);
  let fromEarned = Math.min(Math.max(0, clawback - fromHeld), earned);
  clawback = fromHeld + fromEarned;

  let wallets = state.orgWallets.map((w) => ({ ...w, locked: w.locked ?? 0 }));
  if (refund > 0) wallets = unlockEscrow(wallets, deal.buyerOrg, refund);

  if (fromEarned > 0) {
    const idx = wallets.findIndex((w) => w.org === deal.supplierOrg);
    if (idx >= 0) {
      const take = Math.min(fromEarned, wallets[idx].balance);
      wallets[idx].balance -= take;
      // 扣回部分退入买方可用
      wallets = creditWallet(wallets, deal.buyerOrg, take, "buyer");
      fromEarned = take;
    } else {
      fromEarned = 0;
    }
  }

  const createdAt = today();
  const ledger = [...(deal.ledger || [])];
  if (refund > 0) {
    ledger.unshift({
      id: `${deal.id}-L${String(ledger.length + 1).padStart(2, "0")}`,
      type: "仲裁",
      amount: refund,
      actor: decidedBy,
      actorRole: "broker",
      note: `仲裁裁决 · 托管退回买方 ${refund.toLocaleString()}`,
      createdAt,
    });
  }
  if (fromHeld > 0 || fromEarned > 0) {
    ledger.unshift({
      id: `${deal.id}-L${String(ledger.length + 1).padStart(2, "0")}`,
      type: "仲裁",
      amount: -(fromHeld + fromEarned),
      actor: decidedBy,
      actorRole: "broker",
      note: `仲裁裁决 · 扣回供给激励 暂挂${fromHeld.toLocaleString()}/已入账${fromEarned.toLocaleString()}`,
      createdAt,
    });
  }
  ledger.unshift({
    id: `${deal.id}-L${String(ledger.length + 1).padStart(2, "0")}`,
    type: "仲裁",
    amount: 0,
    actor: decidedBy,
    actorRole: "broker",
    note: `争议 ${disputeId} 裁决：${decision || "按证据部分支持买方，恢复履约"}`,
    createdAt,
  });

  const resumeStatus = deal.spent > 0 ? "履约中" : "预算已开";
  const resumePhase = deal.spent > 0 ? "履约中" : "托管中";
  const updatedDeal = {
    ...deal,
    escrow: Math.max(0, (deal.escrow || 0) - refund),
    heldSupplier: Math.max(0, held - fromHeld),
    supplierEarned: Math.max(0, earned - fromEarned),
    status: resumeStatus,
    phase: resumePhase,
    updatedAt: createdAt,
    ledger,
    nextActionBuyer: "仲裁已执行，可继续验收或申请结算",
    nextActionSupplier: "按裁决调整后继续交付剩余节点",
    nextActionBroker: "监督裁决执行，推动收尾结算",
    nextActionCenter: "可恢复从托管池履约扣费",
  };

  const updatedDispute = {
    ...dispute,
    status: "已执行",
    decision: decision || "部分支持买方诉求并恢复履约",
    decidedBy,
    adjustBuyerRefund: refund,
    adjustSupplierClawback: fromHeld + fromEarned,
    updatedAt: createdAt,
  };

  const orders = state.orders.map((o) =>
    o.id === dispute.orderId || (o.dealId === deal.id && String(o.product).startsWith("【争议】"))
      ? { ...o, status: "完结", summary: `已裁决：${updatedDispute.decision}` }
      : o,
  );

  await persistAllianceLoop({
    ...state,
    deals: state.deals.map((d) => (d.id === deal.id ? updatedDeal : d)),
    disputes: (state.disputes || []).map((d) => (d.id === disputeId ? updatedDispute : d)),
    orgWallets: wallets,
    orders,
  });
  return getAllianceState();
}

export async function confirmDealProject({ dealId, side, actor }) {
  const { confirmDealSide } = await import("./dealLoop.mjs");
  if (!["buyer", "supplier"].includes(side)) throw new Error("side 须为 buyer 或 supplier");
  const state = await getAllianceState();
  const deal = state.deals.find((d) => d.id === dealId);
  if (!deal) throw new Error("项目不存在");
  const updated = confirmDealSide(deal, side, actor || (side === "buyer" ? deal.buyerOrg : deal.supplierOrg));
  const deals = state.deals.map((d) => (d.id === dealId ? updated : d));
  await persistAllianceLoop({ ...state, deals });
  return getAllianceState();
}

export async function topUpOrgWallet({ org, amount }) {
  const state = await getAllianceState();
  const credit = Number(amount) || 0;
  if (!org || credit <= 0) throw new Error("充值参数无效");
  const wallets = structuredClone(state.orgWallets).map((w) => ({ ...w, locked: w.locked ?? 0 }));
  const idx = wallets.findIndex((w) => w.org === org);
  if (idx < 0) wallets.unshift({ org, balance: credit, locked: 0, role: "buyer" });
  else wallets[idx].balance += credit;
  await persistAllianceLoop({ ...state, orgWallets: wallets });
  return {
    org,
    balance: wallets.find((w) => w.org === org)?.balance ?? 0,
    locked: wallets.find((w) => w.org === org)?.locked ?? 0,
    credited: credit,
  };
}

// ── Center ────────────────────────────────────────────────

export async function getCenterState() {
  const seed = loadCenterSeed();
  if (usePostgres) {
    const base = await repo.getCenterState();
    return mergeCenterExtras(base, seed);
  }
  return mergeCenterExtras(jsonDb.loadDb("center"), seed);
}

export async function purchaseCenterTokens(packageId) {
  const seed = loadCenterSeed();
  const pkg = (seed.tokenPackages ?? []).find((p) => p.id === packageId);
  if (!pkg) throw new Error("套餐不存在");

  const state = await getCenterState();
  const wallet = structuredClone(state.tokenWallet);
  const credit = pkg.tokens + (pkg.bonus ?? 0);
  wallet.balance += credit;
  wallet.transactions.unshift({
    id: `TX-${Date.now()}`,
    type: "充值",
    amount: credit,
    balance: wallet.balance,
    note: `购买${pkg.name}（${pkg.tokens.toLocaleString()} + 赠送 ${(pkg.bonus ?? 0).toLocaleString()}）`,
    createdAt: new Date().toISOString().slice(0, 10),
  });

  if (usePostgres) await repo.saveTokenWallet(wallet);
  else {
    const db = jsonDb.loadDb("center");
    db.tokenWallet = wallet;
    jsonDb.saveDb("center", db);
  }
  return getCenterState();
}

export async function regenerateCenterApiKey() {
  const state = await getCenterState();
  const wallet = structuredClone(state.tokenWallet);
  wallet.apiKey = `xd-center-sk-${Math.random().toString(36).slice(2, 6)}${Math.random().toString(36).slice(2, 6)}`;

  if (usePostgres) await repo.saveTokenWallet(wallet);
  else {
    const db = jsonDb.loadDb("center");
    db.tokenWallet = wallet;
    jsonDb.saveDb("center", db);
  }
  return wallet;
}

export async function resetCenterState() {
  if (usePostgres) return repo.resetCenterState(loadSeed("center"));
  return jsonDb.resetDb("center");
}

export async function getCenterStats() {
  if (usePostgres) return repo.getCenterStats();
  const db = jsonDb.loadDb("center");
  return {
    openOrders: db.orders.filter((o) => !["完结", "关闭"].includes(o.status)).length,
    approvals: db.approvals.length,
    overseas: db.overseas.length,
    distributions: db.distributions.length,
    copyrights: db.copyrights.length,
    ais: db.ais.length,
  };
}

export async function listApprovals() {
  if (usePostgres) return repo.listApprovals();
  return jsonDb.loadDb("center").approvals;
}

export async function patchApproval(id, patch) {
  if (usePostgres) return repo.patchApproval(id, patch);
  return patchJson("center", "approvals", id, patch);
}

export async function listOverseas() {
  if (usePostgres) return repo.listOverseas();
  return jsonDb.loadDb("center").overseas;
}

export async function patchOverseas(id, patch) {
  if (usePostgres) return repo.patchOverseas(id, patch);
  return patchJson("center", "overseas", id, patch);
}

export async function listDistributions() {
  if (usePostgres) return repo.listDistributions();
  return jsonDb.loadDb("center").distributions;
}

export async function listCopyrights() {
  if (usePostgres) return repo.listCopyrights();
  return jsonDb.loadDb("center").copyrights;
}

export async function listAis() {
  if (usePostgres) return repo.listAis();
  return jsonDb.loadDb("center").ais;
}

export async function listCenterOrders() {
  if (usePostgres) return repo.listOrders("center");
  return jsonDb.loadDb("center").orders;
}

export async function upsertCenterOrder(item) {
  if (usePostgres) return repo.upsertOrder(item);
  return upsertJsonList("center", "orders", item);
}

export async function patchCenterOrder(id, patch) {
  if (usePostgres) return repo.patchOrder(id, patch);
  return patchJson("center", "orders", id, patch);
}
