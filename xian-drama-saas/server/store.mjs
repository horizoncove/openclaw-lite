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

function loadSeed() {
  return JSON.parse(readFileSync(join(__dirname, "data", "seed.json"), "utf8"));
}

export async function getState() {
  if (usePostgres) return repo.getState();
  return jsonDb.loadDb();
}

export async function resetState() {
  if (usePostgres) return repo.resetState(loadSeed());
  return jsonDb.resetDb();
}

export async function listMembers() {
  if (usePostgres) return repo.listMembers();
  return jsonDb.loadDb().members;
}

export async function upsertMember(item) {
  if (usePostgres) return repo.upsertMember(item);
  const db = jsonDb.loadDb();
  const idx = db.members.findIndex((x) => x.id === item.id);
  if (idx >= 0) db.members[idx] = item;
  else db.members.unshift(item);
  jsonDb.saveDb(db);
  return item;
}

export async function patchMember(id, patch) {
  if (usePostgres) return repo.patchMember(id, patch);
  const db = jsonDb.loadDb();
  const idx = db.members.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  db.members[idx] = { ...db.members[idx], ...patch };
  jsonDb.saveDb(db);
  return db.members[idx];
}

export async function listEvents() {
  if (usePostgres) return repo.listEvents();
  return jsonDb.loadDb().events;
}

export async function upsertEvent(item) {
  if (usePostgres) return repo.upsertEvent(item);
  const db = jsonDb.loadDb();
  const idx = db.events.findIndex((x) => x.id === item.id);
  if (idx >= 0) db.events[idx] = item;
  else db.events.unshift(item);
  jsonDb.saveDb(db);
  return item;
}

export async function listMatches() {
  if (usePostgres) return repo.listMatches();
  return jsonDb.loadDb().matches;
}

export async function patchMatch(id, patch) {
  if (usePostgres) return repo.patchMatch(id, patch);
  const db = jsonDb.loadDb();
  const idx = db.matches.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  db.matches[idx] = { ...db.matches[idx], ...patch };
  jsonDb.saveDb(db);
  return db.matches[idx];
}

export async function listOrders() {
  if (usePostgres) return repo.listOrders();
  return jsonDb.loadDb().orders;
}

export async function upsertOrder(item) {
  if (usePostgres) return repo.upsertOrder(item);
  const db = jsonDb.loadDb();
  const idx = db.orders.findIndex((x) => x.id === item.id);
  if (idx >= 0) db.orders[idx] = item;
  else db.orders.unshift(item);
  jsonDb.saveDb(db);
  return item;
}

export async function patchOrder(id, patch) {
  if (usePostgres) return repo.patchOrder(id, patch);
  const db = jsonDb.loadDb();
  const idx = db.orders.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  db.orders[idx] = { ...db.orders[idx], ...patch };
  jsonDb.saveDb(db);
  return db.orders[idx];
}

export async function listApprovals() {
  if (usePostgres) return repo.listApprovals();
  return jsonDb.loadDb().approvals;
}

export async function patchApproval(id, patch) {
  if (usePostgres) return repo.patchApproval(id, patch);
  const db = jsonDb.loadDb();
  const idx = db.approvals.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  db.approvals[idx] = { ...db.approvals[idx], ...patch };
  jsonDb.saveDb(db);
  return db.approvals[idx];
}

export async function listOverseas() {
  if (usePostgres) return repo.listOverseas();
  return jsonDb.loadDb().overseas;
}

export async function patchOverseas(id, patch) {
  if (usePostgres) return repo.patchOverseas(id, patch);
  const db = jsonDb.loadDb();
  const idx = db.overseas.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  db.overseas[idx] = { ...db.overseas[idx], ...patch };
  jsonDb.saveDb(db);
  return db.overseas[idx];
}

export async function listDistributions() {
  if (usePostgres) return repo.listDistributions();
  return jsonDb.loadDb().distributions;
}

export async function listCopyrights() {
  if (usePostgres) return repo.listCopyrights();
  return jsonDb.loadDb().copyrights;
}

export async function listAis() {
  if (usePostgres) return repo.listAis();
  return jsonDb.loadDb().ais;
}

export async function getStats() {
  if (usePostgres) return repo.getStats();
  const db = jsonDb.loadDb();
  const openOrders = db.orders.filter((o) => !["完结", "关闭"].includes(o.status));
  return {
    members: db.members.filter((m) => m.status === "有效").length,
    openOrders: openOrders.length,
    overseas: db.overseas.length,
    events: db.events.filter((e) => e.status !== "已结束").length,
    approvals: db.approvals.length,
    distributions: db.distributions.length,
    copyrights: db.copyrights.length,
    ais: db.ais.length,
  };
}
