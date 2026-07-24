import { Router } from "express";
import {
  loadP1,
  saveP1,
  resetP1,
  findUser,
  getWallet,
  chargeWallet,
  creditWallet,
  workspaceSummary,
  newId,
  nowIso,
  today,
} from "./store.mjs";

export const p1Router = Router();
export const v1Router = Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function requireUser(req, res, next) {
  const userId = req.header("x-user-id") || req.query.userId;
  if (!userId) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "缺少用户" } });
  const db = loadP1();
  const user = findUser(db, userId);
  if (!user) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "用户无效" } });
  req.db = db;
  req.user = user;
  next();
}

function persist(req) {
  saveP1(req.db);
}

// ── Auth ──────────────────────────────────────────────

p1Router.get(
  "/health",
  asyncHandler(async (_req, res) => {
    res.json({ ok: true, module: "p1", version: "1.0.0" });
  }),
);

p1Router.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const { userId, email } = req.body || {};
    const db = loadP1();
    const user =
      db.users.find((u) => u.id === userId) || db.users.find((u) => u.email === email) || null;
    if (!user) return res.status(400).json({ error: { message: "无效账号" } });
    res.json({ user, token: `p1-${user.id}` });
  }),
);

p1Router.get(
  "/auth/users",
  asyncHandler(async (_req, res) => {
    const db = loadP1();
    res.json(
      db.users.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        orgName: u.orgName,
        email: u.email,
      })),
    );
  }),
);

p1Router.post(
  "/reset",
  asyncHandler(async (_req, res) => {
    res.json(resetP1());
  }),
);

p1Router.use(requireUser);

p1Router.get(
  "/me",
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
);

p1Router.get(
  "/workspace/summary",
  asyncHandler(async (req, res) => {
    res.json(workspaceSummary(req.db, req.user));
  }),
);

// ── Projects & tasks ──────────────────────────────────

p1Router.get(
  "/projects",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    const list =
      user.role === "secretariat" || user.role === "ops"
        ? db.projects
        : db.projects.filter((p) => p.orgId === user.orgId);
    res.json(list);
  }),
);

p1Router.post(
  "/projects",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    if (!user.orgId) return res.status(403).json({ error: { message: "无机构" } });
    const body = req.body || {};
    const project = {
      id: newId("prj"),
      orgId: user.orgId,
      title: body.title || "未命名项目",
      type: body.type || "自制",
      status: body.status || "planning",
      ownerId: user.id,
      ownerName: user.name,
      progress: Number(body.progress || 0),
      summary: body.summary || "",
      updatedAt: today(),
    };
    db.projects.unshift(project);
    persist(req);
    res.status(201).json(project);
  }),
);

p1Router.patch(
  "/projects/:id",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    const p = db.projects.find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: { message: "未找到项目" } });
    if (user.role !== "secretariat" && user.role !== "ops" && p.orgId !== user.orgId) {
      return res.status(403).json({ error: { message: "无权修改" } });
    }
    Object.assign(p, req.body || {}, { updatedAt: today() });
    persist(req);
    res.json(p);
  }),
);

p1Router.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    const projectIds = new Set(
      (user.role === "secretariat" || user.role === "ops"
        ? db.projects
        : db.projects.filter((p) => p.orgId === user.orgId)
      ).map((p) => p.id),
    );
    let tasks = db.tasks.filter((t) => projectIds.has(t.projectId));
    if (req.query.mine === "1") tasks = tasks.filter((t) => t.assigneeId === user.id);
    if (req.query.projectId) tasks = tasks.filter((t) => t.projectId === req.query.projectId);
    res.json(tasks);
  }),
);

p1Router.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    const body = req.body || {};
    const project = db.projects.find((p) => p.id === body.projectId);
    if (!project) return res.status(404).json({ error: { message: "项目不存在" } });
    if (user.role !== "secretariat" && project.orgId !== user.orgId) {
      return res.status(403).json({ error: { message: "无权" } });
    }
    const task = {
      id: newId("tsk"),
      projectId: project.id,
      title: body.title || "新任务",
      assigneeId: body.assigneeId || user.id,
      assigneeName: body.assigneeName || user.name,
      status: body.status || "todo",
      dueAt: body.dueAt || today(),
      blockedReason: body.blockedReason,
    };
    db.tasks.unshift(task);
    persist(req);
    res.status(201).json(task);
  }),
);

p1Router.patch(
  "/tasks/:id",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    const task = db.tasks.find((t) => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: { message: "未找到任务" } });
    const project = db.projects.find((p) => p.id === task.projectId);
    if (user.role !== "secretariat" && user.role !== "ops" && project?.orgId !== user.orgId) {
      return res.status(403).json({ error: { message: "无权" } });
    }
    Object.assign(task, req.body || {});
    persist(req);
    res.json(task);
  }),
);

// ── Demands (alliance visible) ────────────────────────

p1Router.get(
  "/demands",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    const scope = req.query.scope || "plaza";
    let list = db.demands;
    if (scope === "plaza") {
      list = list.filter((d) => ["published", "matching", "deal"].includes(d.status));
    } else if (scope === "mine") {
      list = list.filter((d) => d.orgId === user.orgId);
    }
    res.json(list);
  }),
);

p1Router.post(
  "/demands",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    if (!user.orgId) return res.status(403).json({ error: { message: "无机构" } });
    const body = req.body || {};
    const publish = body.publish !== false;
    const demand = {
      id: newId("dm"),
      orgId: user.orgId,
      orgName: user.orgName,
      title: body.title || "未命名需求",
      need: body.need || "",
      offer: body.offer || "",
      category: body.category || "其他",
      budget: body.budget || "面议",
      dueAt: body.dueAt || today(),
      status: publish ? "published" : "draft",
      visibility: "alliance",
      contact: user.name,
      createdAt: today(),
    };
    db.demands.unshift(demand);
    persist(req);
    res.status(201).json(demand);
  }),
);

p1Router.patch(
  "/demands/:id",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    const d = db.demands.find((x) => x.id === req.params.id);
    if (!d) return res.status(404).json({ error: { message: "未找到" } });
    const isOwner = d.orgId === user.orgId;
    const isStaff = user.role === "secretariat" || user.role === "ops";
    if (!isOwner && !isStaff) return res.status(403).json({ error: { message: "无权" } });
    const patch = { ...(req.body || {}) };
    // published demands stay alliance-visible; cannot hide
    if (patch.visibility && patch.visibility !== "alliance") {
      return res.status(400).json({ error: { message: "已发布需求必须全联盟可见" } });
    }
    Object.assign(d, patch, { visibility: "alliance" });
    persist(req);
    res.json(d);
  }),
);

p1Router.get(
  "/demands/:id/applications",
  asyncHandler(async (req, res) => {
    res.json(req.db.applications.filter((a) => a.demandId === req.params.id));
  }),
);

p1Router.post(
  "/demands/:id/apply",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    if (!user.orgId) return res.status(403).json({ error: { message: "无机构" } });
    const demand = db.demands.find((d) => d.id === req.params.id);
    if (!demand || !["published", "matching"].includes(demand.status)) {
      return res.status(400).json({ error: { message: "需求不可应征" } });
    }
    if (demand.orgId === user.orgId) {
      return res.status(400).json({ error: { message: "不能应征自己的需求" } });
    }
    const exists = db.applications.find(
      (a) => a.demandId === demand.id && a.orgId === user.orgId && a.status === "pending",
    );
    if (exists) return res.status(409).json({ error: { message: "已应征" } });
    const app = {
      id: newId("ap"),
      demandId: demand.id,
      orgId: user.orgId,
      orgName: user.orgName,
      message: (req.body || {}).message || "",
      status: "pending",
      createdAt: today(),
    };
    db.applications.unshift(app);
    demand.status = "matching";
    persist(req);
    res.status(201).json(app);
  }),
);

p1Router.post(
  "/demands/:id/confirm",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    const demand = db.demands.find((d) => d.id === req.params.id);
    if (!demand) return res.status(404).json({ error: { message: "未找到" } });
    const { applicationId } = req.body || {};
    const app = db.applications.find((a) => a.id === applicationId && a.demandId === demand.id);
    if (!app) return res.status(404).json({ error: { message: "应征不存在" } });
    const canConfirm =
      demand.orgId === user.orgId || user.role === "secretariat" || user.role === "ops";
    if (!canConfirm) return res.status(403).json({ error: { message: "无权确认" } });
    app.status = "accepted";
    db.applications
      .filter((a) => a.demandId === demand.id && a.id !== app.id && a.status === "pending")
      .forEach((a) => {
        a.status = "rejected";
      });
    demand.status = "deal";
    persist(req);
    res.json({ demand, application: app });
  }),
);

// ── Opportunities ─────────────────────────────────────

p1Router.get(
  "/opportunities",
  asyncHandler(async (req, res) => {
    res.json(req.db.opportunities);
  }),
);

p1Router.post(
  "/opportunities/:id/interest",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    if (!user.orgId) return res.status(403).json({ error: { message: "无机构" } });
    const op = db.opportunities.find((o) => o.id === req.params.id);
    if (!op) return res.status(404).json({ error: { message: "未找到机会" } });
    const interest = {
      id: newId("it"),
      opportunityId: op.id,
      orgId: user.orgId,
      orgName: user.orgName,
      note: (req.body || {}).note || "",
      createdAt: today(),
    };
    db.interests.unshift(interest);
    persist(req);
    res.status(201).json(interest);
  }),
);

// ── Notices ───────────────────────────────────────────

p1Router.get(
  "/notices",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    const list = db.notices.map((n) => ({
      ...n,
      read: db.receipts.some((r) => r.noticeId === n.id && r.userId === user.id),
    }));
    res.json(list);
  }),
);

p1Router.post(
  "/notices",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    if (user.role !== "secretariat" && user.role !== "ops") {
      return res.status(403).json({ error: { message: "仅秘书处可发公告" } });
    }
    const body = req.body || {};
    const notice = {
      id: newId("nt"),
      title: body.title || "未命名公告",
      body: body.body || "",
      audience: body.audience || "全体会员",
      forceRead: Boolean(body.forceRead),
      createdAt: today(),
    };
    db.notices.unshift(notice);
    persist(req);
    res.status(201).json(notice);
  }),
);

p1Router.post(
  "/notices/:id/read",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    const notice = db.notices.find((n) => n.id === req.params.id);
    if (!notice) return res.status(404).json({ error: { message: "未找到" } });
    if (!db.receipts.some((r) => r.noticeId === notice.id && r.userId === user.id)) {
      db.receipts.push({ noticeId: notice.id, userId: user.id, readAt: nowIso() });
      persist(req);
    }
    res.json({ ok: true });
  }),
);

// ── Wallet ────────────────────────────────────────────

p1Router.get(
  "/wallet",
  asyncHandler(async (req, res) => {
    if (!req.user.orgId) return res.status(403).json({ error: { message: "无机构钱包" } });
    const wallet = getWallet(req.db, req.user.orgId);
    const ledger = req.db.ledger.filter((l) => l.orgId === req.user.orgId).slice(0, 50);
    res.json({ wallet, ledger, packages: req.db.packages, models: req.db.models });
  }),
);

p1Router.post(
  "/wallet/purchase",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    if (!user.orgId) return res.status(403).json({ error: { message: "无机构" } });
    const pkg = db.packages.find((p) => p.id === (req.body || {}).packageId);
    if (!pkg) return res.status(404).json({ error: { message: "套餐不存在" } });
    const amount = pkg.tokens + (pkg.bonus || 0);
    const wallet = creditWallet(db, user.orgId, amount, `购买套餐「${pkg.name}」`);
    persist(req);
    res.json({ wallet, credited: amount });
  }),
);

p1Router.post(
  "/wallet/rotate-key",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    if (!user.orgId) return res.status(403).json({ error: { message: "无机构" } });
    const wallet = getWallet(db, user.orgId);
    if (!wallet) return res.status(404).json({ error: { message: "无钱包" } });
    wallet.apiKey = `xd_live_${user.orgId.replace("org-", "")}_${Date.now().toString(36)}`;
    persist(req);
    res.json({ apiKey: wallet.apiKey });
  }),
);

// ── Compute jobs ──────────────────────────────────────

p1Router.get(
  "/compute/jobs",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    const list =
      user.role === "ops" || user.role === "secretariat"
        ? db.jobs
        : db.jobs.filter((j) => j.orgId === user.orgId);
    res.json(list);
  }),
);

p1Router.post(
  "/compute/jobs",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    if (!user.orgId) return res.status(403).json({ error: { message: "无机构" } });
    const body = req.body || {};
    const cost = Number(body.cost || 5000);
    try {
      chargeWallet(db, user.orgId, cost, `算力预扣 ${body.jobType || "job"}`, "compute-reserve");
    } catch (e) {
      return res.status(e.status || 500).json({
        error: { code: e.code || "ERROR", message: e.message },
      });
    }
    const job = {
      id: newId("job"),
      orgId: user.orgId,
      projectId: body.projectId || null,
      jobType: body.jobType || "generic",
      priority: body.priority || "normal",
      status: "queued",
      payload: body.payload || {},
      cost,
      createdAt: nowIso(),
    };
    db.jobs.unshift(job);
    persist(req);
    res.status(201).json(job);
  }),
);

p1Router.post(
  "/compute/jobs/:id/transition",
  asyncHandler(async (req, res) => {
    const { db, user } = req;
    const job = db.jobs.find((j) => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: { message: "未找到作业" } });
    const to = (req.body || {}).status;
    const allowed = {
      queued: ["running", "cancelled"],
      running: ["succeeded", "failed", "cancelled"],
      failed: ["queued"],
    };
    if (!allowed[job.status]?.includes(to)) {
      return res.status(409).json({ error: { message: `非法流转 ${job.status} → ${to}` } });
    }
    // members can cancel own queued; ops can drive all
    if (user.role !== "ops" && user.role !== "secretariat") {
      if (!(to === "cancelled" && job.orgId === user.orgId && job.status === "queued")) {
        return res.status(403).json({ error: { message: "仅运维可推进作业状态" } });
      }
    }
    job.status = to;
    if (to === "running") job.startedAt = nowIso();
    if (["succeeded", "failed", "cancelled"].includes(to)) job.finishedAt = nowIso();
    if (to === "failed") job.error = (req.body || {}).error || "执行失败";
    if (to === "cancelled" && !job.startedAt) {
      // release reserved cost
      creditWallet(db, job.orgId, job.cost, `算力作业取消退回 ${job.id}`);
    }
    persist(req);
    res.json(job);
  }),
);

// ── Catalog ───────────────────────────────────────────

p1Router.get(
  "/models",
  asyncHandler(async (req, res) => {
    res.json(req.db.models);
  }),
);

// ── OpenAI-compatible router (/v1) ────────────────────

function findWalletByKey(db, apiKey) {
  return db.wallets.find((w) => w.apiKey === apiKey) || null;
}

v1Router.get(
  "/models",
  asyncHandler(async (req, res) => {
    const auth = req.header("authorization") || "";
    const key = auth.replace(/^Bearer\s+/i, "").trim();
    const db = loadP1();
    if (key && !findWalletByKey(db, key)) {
      return res.status(401).json({ error: { message: "Invalid API key" } });
    }
    res.json({
      object: "list",
      data: db.models
        .filter((m) => m.modality === "chat")
        .map((m) => ({ id: m.modelKey, object: "model", owned_by: m.provider })),
    });
  }),
);

v1Router.post(
  "/chat/completions",
  asyncHandler(async (req, res) => {
    const auth = req.header("authorization") || "";
    const key = auth.replace(/^Bearer\s+/i, "").trim();
    if (!key) return res.status(401).json({ error: { message: "Missing API key" } });
    const db = loadP1();
    const wallet = findWalletByKey(db, key);
    if (!wallet) return res.status(401).json({ error: { message: "Invalid API key" } });

    const body = req.body || {};
    const modelKey = body.model || "deepseek-chat";
    const model = db.models.find((m) => m.modelKey === modelKey) || db.models[0];
    const messages = body.messages || [];
    const promptText = messages.map((m) => m.content || "").join("\n");
    const promptTokens = Math.max(16, Math.ceil(promptText.length / 4));
    const completionTokens = 64;
    const cost = Math.ceil(
      promptTokens * (model?.inputPrice || 0.2) + completionTokens * (model?.outputPrice || 0.4),
    );
    // scale demo costs to token units (x1000 micro)
    const bill = Math.max(100, cost * 100);

    try {
      chargeWallet(db, wallet.orgId, bill, `API ${model?.modelKey || modelKey}`, "chat");
    } catch (e) {
      return res.status(402).json({
        error: { code: "INSUFFICIENT_BALANCE", message: e.message, type: "billing_error" },
      });
    }
    saveP1(db);

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const reply = buildDemoReply(lastUser?.content || "", model?.name || modelKey);

    // optional real upstream
    const upstream = await maybeProxyUpstream(body, modelKey);
    const content = upstream || reply;

    res.json({
      id: `chatcmpl-${newId("c")}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: modelKey,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        billing_tokens: bill,
      },
      x_xd_router: { provider: model?.provider, billed: bill, orgId: wallet.orgId },
    });
  }),
);

function buildDemoReply(prompt, modelName) {
  const clipped = String(prompt).slice(0, 80).replace(/\n/g, " ");
  return `【XD-Router · ${modelName}】已收到请求。\n\n摘要：${clipped || "（空提示）"}\n\n这是聚合网关演示回复。配置上游 API Key（DEEPSEEK_API_KEY / OPENAI_API_KEY）后可自动转发真实模型。用量已从机构钱包扣减。`;
}

async function maybeProxyUpstream(body, modelKey) {
  const deepseek = process.env.DEEPSEEK_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  try {
    if (deepseek && modelKey.includes("deepseek")) {
      const r = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${deepseek}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...body, model: "deepseek-chat", stream: false }),
      });
      if (r.ok) {
        const j = await r.json();
        return j.choices?.[0]?.message?.content || null;
      }
    }
    if (openai) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openai}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...body, model: modelKey, stream: false }),
      });
      if (r.ok) {
        const j = await r.json();
        return j.choices?.[0]?.message?.content || null;
      }
    }
  } catch {
    /* fall back to demo */
  }
  return null;
}

export function p1ErrorHandler(err, _req, res, _next) {
  console.error("[p1]", err);
  res.status(err.status || 500).json({
    error: { code: err.code || "ERROR", message: err.message || "服务器错误" },
  });
}
