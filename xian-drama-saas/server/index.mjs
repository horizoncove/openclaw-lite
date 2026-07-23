import express from "express";
import cors from "cors";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDb, saveDb, resetDb } from "./db.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const USERS = {
  admin: { id: "u1", name: "张衡", role: "admin", org: "服务中心主任办" },
  alliance: { id: "u2", name: "陈希", role: "alliance", org: "联盟秘书处" },
  approval: { id: "u3", name: "刘芳", role: "approval", org: "审批中心" },
  overseas: { id: "u4", name: "韩磊", role: "overseas", org: "出海中心" },
  distribution: { id: "u5", name: "苏晚", role: "distribution", org: "发行投流中心" },
  copyright: { id: "u6", name: "顾清", role: "copyright", org: "版权中心" },
  ai: { id: "u7", name: "蒋一", role: "ai", org: "AI 研发中心" },
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "xian-drama-saas", version: "1.0.0" });
});

app.get("/api/state", (_req, res) => {
  res.json(loadDb());
});

app.post("/api/reset", (_req, res) => {
  res.json(resetDb());
});

app.post("/api/auth/login", (req, res) => {
  const { role } = req.body || {};
  const user = USERS[role];
  if (!user) return res.status(400).json({ error: "无效角色" });
  res.json({ user, token: `demo-${role}` });
});

function patchList(db, key, id, patch) {
  const list = db[key];
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch };
  saveDb(db);
  return list[idx];
}

function upsertList(db, key, item) {
  const list = db[key];
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  saveDb(db);
  return item;
}

app.get("/api/members", (_req, res) => res.json(loadDb().members));
app.post("/api/members", (req, res) => {
  const db = loadDb();
  const item = upsertList(db, "members", req.body);
  res.json(item);
});
app.put("/api/members/:id", (req, res) => {
  const db = loadDb();
  const item = patchList(db, "members", req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
});

app.get("/api/events", (_req, res) => res.json(loadDb().events));
app.post("/api/events", (req, res) => {
  const db = loadDb();
  const item = upsertList(db, "events", req.body);
  res.json(item);
});

app.get("/api/matches", (_req, res) => res.json(loadDb().matches));
app.put("/api/matches/:id", (req, res) => {
  const db = loadDb();
  const item = patchList(db, "matches", req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
});

app.get("/api/orders", (_req, res) => res.json(loadDb().orders));
app.post("/api/orders", (req, res) => {
  const db = loadDb();
  const item = upsertList(db, "orders", req.body);
  res.json(item);
});
app.put("/api/orders/:id", (req, res) => {
  const db = loadDb();
  const item = patchList(db, "orders", req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
});

app.get("/api/approvals", (_req, res) => res.json(loadDb().approvals));
app.put("/api/approvals/:id", (req, res) => {
  const db = loadDb();
  const item = patchList(db, "approvals", req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
});

app.get("/api/overseas", (_req, res) => res.json(loadDb().overseas));
app.put("/api/overseas/:id", (req, res) => {
  const db = loadDb();
  const item = patchList(db, "overseas", req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
});

app.get("/api/distributions", (_req, res) => res.json(loadDb().distributions));
app.get("/api/copyrights", (_req, res) => res.json(loadDb().copyrights));
app.get("/api/ais", (_req, res) => res.json(loadDb().ais));

app.get("/api/stats", (_req, res) => {
  const db = loadDb();
  const openOrders = db.orders.filter((o) => !["完结", "关闭"].includes(o.status));
  res.json({
    members: db.members.filter((m) => m.status === "有效").length,
    openOrders: openOrders.length,
    overseas: db.overseas.length,
    events: db.events.filter((e) => e.status !== "已结束").length,
    approvals: db.approvals.length,
    distributions: db.distributions.length,
    copyrights: db.copyrights.length,
    ais: db.ais.length,
  });
});

const dist = join(__dirname, "..", "dist");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(dist, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`xian-drama-saas API http://0.0.0.0:${PORT}`);
});
