import express from "express";
import cors from "cors";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  initStore,
  isPostgres,
  getState,
  resetState,
  listMembers,
  upsertMember,
  patchMember,
  listEvents,
  upsertEvent,
  listMatches,
  patchMatch,
  listOrders,
  upsertOrder,
  patchOrder,
  listApprovals,
  patchApproval,
  listOverseas,
  patchOverseas,
  listDistributions,
  listCopyrights,
  listAis,
  getStats,
} from "./store.mjs";

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

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "xian-drama-saas",
    version: "1.1.0",
    storage: isPostgres() ? "postgresql" : "json",
  });
});

app.get("/api/state", asyncHandler(async (_req, res) => {
  res.json(await getState());
}));

app.post("/api/reset", asyncHandler(async (_req, res) => {
  res.json(await resetState());
}));

app.post("/api/auth/login", (req, res) => {
  const { role } = req.body || {};
  const user = USERS[role];
  if (!user) return res.status(400).json({ error: "无效角色" });
  res.json({ user, token: `demo-${role}` });
});

app.get("/api/members", asyncHandler(async (_req, res) => res.json(await listMembers())));
app.post("/api/members", asyncHandler(async (req, res) => res.json(await upsertMember(req.body))));
app.put("/api/members/:id", asyncHandler(async (req, res) => {
  const item = await patchMember(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/events", asyncHandler(async (_req, res) => res.json(await listEvents())));
app.post("/api/events", asyncHandler(async (req, res) => res.json(await upsertEvent(req.body))));

app.get("/api/matches", asyncHandler(async (_req, res) => res.json(await listMatches())));
app.put("/api/matches/:id", asyncHandler(async (req, res) => {
  const item = await patchMatch(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/orders", asyncHandler(async (_req, res) => res.json(await listOrders())));
app.post("/api/orders", asyncHandler(async (req, res) => res.json(await upsertOrder(req.body))));
app.put("/api/orders/:id", asyncHandler(async (req, res) => {
  const item = await patchOrder(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/approvals", asyncHandler(async (_req, res) => res.json(await listApprovals())));
app.put("/api/approvals/:id", asyncHandler(async (req, res) => {
  const item = await patchApproval(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/overseas", asyncHandler(async (_req, res) => res.json(await listOverseas())));
app.put("/api/overseas/:id", asyncHandler(async (req, res) => {
  const item = await patchOverseas(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/distributions", asyncHandler(async (_req, res) => res.json(await listDistributions())));
app.get("/api/copyrights", asyncHandler(async (_req, res) => res.json(await listCopyrights())));
app.get("/api/ais", asyncHandler(async (_req, res) => res.json(await listAis())));

app.get("/api/stats", asyncHandler(async (_req, res) => res.json(await getStats())));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "服务器错误" });
});

const dist = join(__dirname, "..", "dist");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(dist, "index.html"));
  });
}

await initStore();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`xian-drama-saas API http://0.0.0.0:${PORT} [${isPostgres() ? "postgresql" : "json"}]`);
});
