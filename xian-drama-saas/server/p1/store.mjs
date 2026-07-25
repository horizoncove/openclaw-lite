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

/** 监管者监督视角：联盟秘书处 / 运维看全网飞轮健康与待介入队列 */
export function supervisionOverview(db) {
  const openDemands = db.demands.filter((d) => ["published", "matching"].includes(d.status));
  const dealDemands = db.demands.filter((d) => d.status === "deal");
  const pendingApps = db.applications.filter((a) => a.status === "pending");
  const acceptedApps = db.applications.filter((a) => a.status === "accepted");
  const matchOrders = db.matchOrders || [];
  const disputedOrders = matchOrders.filter((o) => o.status === "disputed");
  const escrowedOrders = matchOrders.filter((o) =>
    ["escrowed", "in_progress"].includes(o.status),
  );
  const releasedOrders = matchOrders.filter((o) => o.status === "released");

  // 适配风险：开放需求超过 3 天仍无应征，或有应征但发布方未确认
  const silentDemands = openDemands
    .filter((d) => {
      const apps = db.applications.filter((a) => a.demandId === d.id);
      return apps.length === 0;
    })
    .map((d) => ({
      id: d.id,
      title: d.title,
      orgName: d.orgName,
      category: d.category,
      status: d.status,
      dueAt: d.dueAt,
      signal: "无应征",
      severity: "amber",
    }));

  const pendingConfirm = pendingApps.map((a) => {
    const d = db.demands.find((x) => x.id === a.demandId);
    return {
      id: a.id,
      demandId: a.demandId,
      title: d?.title || a.demandId,
      publisherOrg: d?.orgName || "—",
      applicantOrg: a.orgName,
      message: a.message,
      createdAt: a.createdAt,
      signal: "待确认成交",
      severity: "red",
    };
  });

  const overdueTasks = db.tasks.filter(
    (t) => !["done", "cancelled"].includes(t.status) && t.dueAt < today(),
  );
  const failedJobs = db.jobs.filter((j) => j.status === "failed");
  const activeJobs = db.jobs.filter((j) => ["queued", "running"].includes(j.status));

  const memberOrgs = db.orgs.filter((o) => o.id !== "org-alliance");
  const walletRows = (db.wallets || [])
    .filter((w) => w.orgId !== "org-alliance")
    .map((w) => {
      const org = db.orgs.find((o) => o.id === w.orgId);
      return {
        orgId: w.orgId,
        orgName: org?.name || w.orgId,
        balance: w.balance,
        usedThisMonth: w.usedThisMonth || 0,
      };
    });

  const totalBalance = walletRows.reduce((s, w) => s + (w.balance || 0), 0);
  const totalUsed = walletRows.reduce((s, w) => s + (w.usedThisMonth || 0), 0);

  // 主轮健康：有开放需求、有待确认、有成交痕迹 → 简化评分
  const flywheelScore = (() => {
    let score = 40;
    if (openDemands.length > 0) score += 15;
    if (pendingApps.length > 0) score += 10; // 有应征说明适配在动
    if (dealDemands.length + releasedOrders.length > 0) score += 20;
    if (silentDemands.length === 0 && openDemands.length > 0) score += 10;
    if (disputedOrders.length > 0) score -= Math.min(20, disputedOrders.length * 5);
    if (failedJobs.length > 2) score -= 10;
    return Math.max(0, Math.min(100, score));
  })();

  return {
    roleView: "regulator",
    generatedAt: nowIso(),
    northStar: {
      matchCompatibility: "撮合适配保障",
      trustGuarantee: "信任保障",
    },
    flywheel: {
      score: flywheelScore,
      openDemands: openDemands.length,
      pendingApplications: pendingApps.length,
      deals: dealDemands.length + acceptedApps.length,
      escrowedOrders: escrowedOrders.length,
      releasedOrders: releasedOrders.length,
      disputedOrders: disputedOrders.length,
    },
    queues: {
      pendingConfirm,
      silentDemands,
      disputedOrders: disputedOrders.map((o) => ({
        id: o.id,
        demandId: o.demandId,
        status: o.status,
        signal: "争议中",
        severity: "red",
      })),
      overdueTasks: overdueTasks.slice(0, 12).map((t) => ({
        id: t.id,
        title: t.title,
        dueAt: t.dueAt,
        assigneeId: t.assigneeId,
        signal: "任务逾期",
        severity: "amber",
      })),
      failedJobs: failedJobs.slice(0, 8).map((j) => ({
        id: j.id,
        title: j.title || j.type || j.id,
        orgId: j.orgId,
        error: j.error,
        signal: "作业失败",
        severity: "amber",
      })),
    },
    capacity: {
      activeJobs: activeJobs.length,
      failedJobs: failedJobs.length,
      memberOrgCount: memberOrgs.length,
      totalWalletBalance: totalBalance,
      totalUsedThisMonth: totalUsed,
      wallets: walletRows,
    },
    guardrails: {
      tokenResaleEnabled: false,
      peerTransferEnabled: false,
      freeFxEnabled: false,
      purchasedRedeemEnabled: false,
      notes: [
        "禁止挂单转售 / 会员互兑 / 浮动汇率",
        "订单放款须走托管状态机（目标）",
        "官方回收仅 earned（目标 P1.1）",
      ],
    },
    actions: [
      { id: "review-confirm", label: "催办待确认应征", href: "/app/demands", count: pendingConfirm.length },
      { id: "revive-silent", label: "激活无应征需求", href: "/app/demands", count: silentDemands.length },
      { id: "publish-notice", label: "发布治理通知", href: "/app/notices", count: 0 },
      { id: "ops-jobs", label: "处理失败作业", href: "/app/compute", count: failedJobs.length },
    ],
  };
}
