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
    jsonDb.saveDb("alliance", db);
  }
}

export async function closeMatchDeal({ matchId, supplierOrg, sceneId }) {
  const { buildDealFromMatch, findScene, debitWallet, today } = await import("./dealLoop.mjs");
  const state = await getAllianceState();
  const match = state.matches.find((m) => m.id === matchId);
  if (!match) throw new Error("供需不存在");
  if (match.status === "已成交" && match.dealId) throw new Error("该供需已成交并开立项目");

  const scene = findScene(state.scenePackages, sceneId || match.sceneId);
  if (!scene) throw new Error("场景包不存在");

  const partner = supplierOrg || match.suggestedPartner;
  if (!partner) throw new Error("请指定供给方");

  let wallets = debitWallet(state.orgWallets, match.org, scene.tokens);
  if (!wallets) throw new Error(`需求方「${match.org}」Token 余额不足，请先充值场景包额度`);

  const dealIndex = state.deals.length + 1;
  const { deal, order } = buildDealFromMatch({
    match,
    supplierOrg: partner,
    scene,
    dealIndex,
  });

  const matches = state.matches.map((m) =>
    m.id === matchId
      ? { ...m, status: "已成交", dealId: deal.id, suggestedPartner: partner, sceneId: scene.id, updatedAt: today() }
      : m
  );
  const deals = [deal, ...state.deals];
  const orders = [order, ...state.orders];

  const next = { ...state, matches, deals, orders, orgWallets: wallets };
  await persistAllianceLoop(next);

  // Mirror center order for non-alliance centers
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
      /* ignore mirror failure in demo */
    }
  }

  return getAllianceState();
}

export async function consumeDealTokens({ dealId, amount, actor, note, model }) {
  const { applyConsume, findScene, creditWallet, today } = await import("./dealLoop.mjs");
  const state = await getAllianceState();
  const deal = state.deals.find((d) => d.id === dealId);
  if (!deal) throw new Error("项目不存在");
  if (deal.status === "已结算") throw new Error("项目已结算");

  const scene = findScene(state.scenePackages, deal.sceneId);
  const spend = Math.min(Number(amount) || 0, deal.budget - deal.spent);
  if (spend <= 0) throw new Error("扣费金额无效或预算已耗尽");

  const beforeBroker = deal.brokerEarned;
  const beforeSupplier = deal.supplierEarned;
  const updated = applyConsume(deal, spend, actor || "中心专员", note || "履约扣费", model, scene);
  const brokerDelta = updated.brokerEarned - beforeBroker;
  const supplierDelta = updated.supplierEarned - beforeSupplier;

  let wallets = state.orgWallets;
  if (brokerDelta > 0) wallets = creditWallet(wallets, "联盟秘书处", brokerDelta, "broker");
  if (supplierDelta > 0) wallets = creditWallet(wallets, deal.supplierOrg, supplierDelta, "supplier");

  const deals = state.deals.map((d) => (d.id === dealId ? updated : d));
  const orders = state.orders.map((o) =>
    o.dealId === dealId
      ? {
          ...o,
          status: updated.status === "已结算" ? "完结" : "处理中",
          summary: `${o.summary.split("｜")[0]}｜已耗 ${updated.spent}/${updated.budget} Tokens`,
        }
      : o
  );

  await persistAllianceLoop({ ...state, deals, orgWallets: wallets, orders });

  // Sync center wallet usage
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
      note: note || `项目 ${dealId} 履约扣费`,
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

export async function topUpOrgWallet({ org, amount }) {
  const { creditWallet, today } = await import("./dealLoop.mjs");
  const state = await getAllianceState();
  const credit = Number(amount) || 0;
  if (!org || credit <= 0) throw new Error("充值参数无效");
  const wallets = creditWallet(state.orgWallets, org, credit, "buyer");
  await persistAllianceLoop({ ...state, orgWallets: wallets });
  return {
    org,
    balance: wallets.find((w) => w.org === org)?.balance ?? 0,
    credited: credit,
    at: today(),
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
