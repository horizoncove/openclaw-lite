import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as jsonDb from "./db.mjs";
import * as repo from "./db/repo.mjs";
import { checkDb } from "./db/pool.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  if (usePostgres) return repo.getAllianceState();
  return jsonDb.loadDb("alliance");
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

// ── Center ────────────────────────────────────────────────

export async function getCenterState() {
  if (usePostgres) return repo.getCenterState();
  return jsonDb.loadDb("center");
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

// ── Overseas Hub（出海服务中心，JSON 独立门户）──────────────

export async function getOverseasHubState() {
  return jsonDb.loadDb("overseas");
}

export async function resetOverseasHubState() {
  return jsonDb.resetDb("overseas");
}

export async function getOverseasHubStats() {
  const db = jsonDb.loadDb("overseas");
  return {
    projects: db.projects.length,
    activeProjects: db.projects.filter((p) => !["结算"].includes(p.stage)).length,
    localizations: db.localizations.filter((l) => l.status !== "已交付").length,
    platforms: db.platforms.filter((p) => p.status === "合作中").length,
    openDeals: db.deals.filter((d) => !["完结"].includes(d.stage)).length,
    pendingSettlements: db.settlements.filter((s) => s.status === "待核对").length,
    openIntakes: db.intakes.filter((i) => ["新建", "评估中"].includes(i.status)).length,
  };
}

export async function patchOsProject(id, patch) {
  return patchJson("overseas", "projects", id, patch);
}

export async function upsertOsProject(item) {
  return upsertJsonList("overseas", "projects", item);
}

export async function patchLocalization(id, patch) {
  return patchJson("overseas", "localizations", id, patch);
}

export async function patchDeal(id, patch) {
  return patchJson("overseas", "deals", id, patch);
}

export async function patchSettlement(id, patch) {
  return patchJson("overseas", "settlements", id, patch);
}

export async function patchIntake(id, patch) {
  return patchJson("overseas", "intakes", id, patch);
}

export async function upsertIntake(item) {
  return upsertJsonList("overseas", "intakes", item);
}
