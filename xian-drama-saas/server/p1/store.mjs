import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.P1_DB_PATH || join(__dirname, "../data/p1-db.json");
const seedPath = join(__dirname, "../data/p1-seed.json");

function clone(x) {
  return structuredClone(x);
}

function loadSeed() {
  return JSON.parse(readFileSync(seedPath, "utf8"));
}

export function loadP1() {
  if (!existsSync(dbPath)) {
    const seed = loadSeed();
    mkdirSync(dirname(dbPath), { recursive: true });
    writeFileSync(dbPath, JSON.stringify(seed, null, 2));
    return clone(seed);
  }
  return JSON.parse(readFileSync(dbPath, "utf8"));
}

export function saveP1(data) {
  mkdirSync(dirname(dbPath), { recursive: true });
  writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function resetP1() {
  const data = clone(loadSeed());
  saveP1(data);
  return data;
}

export function nowIso() {
  return new Date().toISOString();
}

export function today() {
  return nowIso().slice(0, 10);
}

export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
}

export function findUser(db, userId) {
  return db.users.find((u) => u.id === userId) || null;
}

export function getWallet(db, orgId) {
  return db.wallets.find((w) => w.orgId === orgId) || null;
}

export function appendLedger(db, entry) {
  db.ledger.unshift(entry);
}

export function chargeWallet(db, orgId, cost, note, ref) {
  const wallet = getWallet(db, orgId);
  if (!wallet) throw Object.assign(new Error("钱包不存在"), { status: 404 });
  if (wallet.balance < cost) {
    throw Object.assign(new Error("余额不足"), { status: 402, code: "INSUFFICIENT_BALANCE" });
  }
  wallet.balance -= cost;
  wallet.usedThisMonth += cost;
  appendLedger(db, {
    id: newId("ld"),
    orgId,
    type: "消耗",
    amount: -cost,
    balance: wallet.balance,
    note,
    ref,
    createdAt: nowIso(),
  });
  return wallet;
}

export function creditWallet(db, orgId, amount, note) {
  const wallet = getWallet(db, orgId);
  if (!wallet) throw Object.assign(new Error("钱包不存在"), { status: 404 });
  wallet.balance += amount;
  appendLedger(db, {
    id: newId("ld"),
    orgId,
    type: "充值",
    amount,
    balance: wallet.balance,
    note,
    createdAt: nowIso(),
  });
  return wallet;
}

export function workspaceSummary(db, user) {
  const orgId = user.orgId;
  const myProjects = orgId ? db.projects.filter((p) => p.orgId === orgId) : db.projects;
  const myTasks = db.tasks.filter((t) => t.assigneeId === user.id);
  const overdue = myTasks.filter(
    (t) => !["done", "cancelled"].includes(t.status) && t.dueAt < today(),
  );
  const blocked = myTasks.filter((t) => t.status === "blocked");
  const unreadNotices = db.notices.filter(
    (n) => !db.receipts.some((r) => r.noticeId === n.id && r.userId === user.id),
  );
  const openDemands = db.demands.filter((d) => ["published", "matching"].includes(d.status));
  const pendingApps = db.applications.filter((a) => {
    if (a.status !== "pending") return false;
    const demand = db.demands.find((d) => d.id === a.demandId);
    return demand && demand.orgId === orgId;
  });
  const myJobs = orgId ? db.jobs.filter((j) => j.orgId === orgId) : [];
  return {
    projectCount: myProjects.length,
    taskTodo: myTasks.filter((t) => ["todo", "doing", "blocked"].includes(t.status)).length,
    overdueTasks: overdue,
    blockedTasks: blocked,
    unreadNoticeCount: unreadNotices.length,
    openDemandCount: openDemands.length,
    pendingApplicationCount: pendingApps.length,
    activeJobs: myJobs.filter((j) => ["queued", "running"].includes(j.status)).length,
    wallet: orgId ? getWallet(db, orgId) : null,
  };
}
