import express from "express";
import cors from "cors";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  initStore,
  isPostgres,
  getAllianceState,
  resetAllianceState,
  getAllianceStats,
  listMembers,
  upsertMember,
  patchMember,
  listEvents,
  upsertEvent,
  listMatches,
  patchMatch,
  saveMatch,
  patchEvent,
  listAllianceOrders,
  upsertAllianceOrder,
  patchAllianceOrder,
  listWorks,
  upsertWork,
  patchWork,
  listVenues,
  patchVenue,
  closeMatchDeal,
  placeMatchBid,
  reviewMatchBid,
  consumeDealTokens,
  settleDealProject,
  confirmDealProject,
  topUpOrgWallet,
  getCenterState,
  resetCenterState,
  getCenterStats,
  purchaseCenterTokens,
  regenerateCenterApiKey,
  listApprovals,
  patchApproval,
  listOverseas,
  patchOverseas,
  listDistributions,
  listCopyrights,
  listAis,
  listCenterOrders,
  upsertCenterOrder,
  patchCenterOrder,
} from "./store.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const ALLIANCE_USERS = {
  alliance: { id: "u2", name: "陈希", role: "alliance", org: "联盟秘书处" },
  member: { id: "u8", name: "王敏", role: "member", org: "长安映缔影视" },
};

const CENTER_USERS = {
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
    version: "1.8.1",
    storage: isPostgres() ? "postgresql" : "json",
    portals: ["alliance", "center"],
  });
});

// ── Alliance API（数据独立）────────────────────────────────

app.get("/api/alliance/state", asyncHandler(async (_req, res) => res.json(await getAllianceState())));
app.post("/api/alliance/reset", asyncHandler(async (_req, res) => res.json(await resetAllianceState())));
app.get("/api/alliance/stats", asyncHandler(async (_req, res) => res.json(await getAllianceStats())));

app.post("/api/alliance/auth/login", (req, res) => {
  const { role } = req.body || {};
  const user = ALLIANCE_USERS[role];
  if (!user) return res.status(400).json({ error: "无效角色" });
  res.json({ user, token: `alliance-${role}` });
});

app.get("/api/alliance/members", asyncHandler(async (_req, res) => res.json(await listMembers())));
app.post("/api/alliance/members", asyncHandler(async (req, res) => res.json(await upsertMember(req.body))));
app.put("/api/alliance/members/:id", asyncHandler(async (req, res) => {
  const item = await patchMember(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/alliance/events", asyncHandler(async (_req, res) => res.json(await listEvents())));
app.post("/api/alliance/events", asyncHandler(async (req, res) => res.json(await upsertEvent(req.body))));
app.put("/api/alliance/events/:id", asyncHandler(async (req, res) => {
  const item = await patchEvent(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/alliance/matches", asyncHandler(async (_req, res) => res.json(await listMatches())));
app.post("/api/alliance/matches", asyncHandler(async (req, res) => res.json(await saveMatch(req.body))));
app.put("/api/alliance/matches/:id", asyncHandler(async (req, res) => {
  const item = await patchMatch(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/alliance/orders", asyncHandler(async (_req, res) => res.json(await listAllianceOrders())));
app.post("/api/alliance/orders", asyncHandler(async (req, res) => res.json(await upsertAllianceOrder(req.body))));
app.put("/api/alliance/orders/:id", asyncHandler(async (req, res) => {
  const item = await patchAllianceOrder(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/alliance/works", asyncHandler(async (_req, res) => res.json(await listWorks())));
app.post("/api/alliance/works", asyncHandler(async (req, res) => res.json(await upsertWork(req.body))));
app.put("/api/alliance/works/:id", asyncHandler(async (req, res) => {
  const item = await patchWork(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/alliance/venues", asyncHandler(async (_req, res) => res.json(await listVenues())));
app.put("/api/alliance/venues/:id", asyncHandler(async (req, res) => {
  const item = await patchVenue(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.post("/api/alliance/deals/close", asyncHandler(async (req, res) => {
  const state = await closeMatchDeal(req.body || {});
  res.json(state);
}));

app.post("/api/alliance/bids", asyncHandler(async (req, res) => {
  res.json(await placeMatchBid(req.body || {}));
}));

app.post("/api/alliance/bids/:id/review", asyncHandler(async (req, res) => {
  res.json(await reviewMatchBid({ bidId: req.params.id, ...(req.body || {}) }));
}));

app.post("/api/alliance/deals/:id/consume", asyncHandler(async (req, res) => {
  const state = await consumeDealTokens({ dealId: req.params.id, ...(req.body || {}) });
  res.json(state);
}));

app.post("/api/alliance/deals/:id/settle", asyncHandler(async (req, res) => {
  res.json(await settleDealProject(req.params.id));
}));

app.post("/api/alliance/deals/:id/confirm", asyncHandler(async (req, res) => {
  const state = await confirmDealProject({ dealId: req.params.id, ...(req.body || {}) });
  res.json(state);
}));

app.post("/api/alliance/wallets/topup", asyncHandler(async (req, res) => {
  res.json(await topUpOrgWallet(req.body || {}));
}));

// ── Center API（数据独立）──────────────────────────────────

app.get("/api/center/state", asyncHandler(async (_req, res) => res.json(await getCenterState())));
app.post("/api/center/reset", asyncHandler(async (_req, res) => res.json(await resetCenterState())));
app.get("/api/center/stats", asyncHandler(async (_req, res) => res.json(await getCenterStats())));

app.get("/api/center/tokens", asyncHandler(async (_req, res) => {
  const state = await getCenterState();
  res.json({
    tokenModels: state.tokenModels,
    tokenPackages: state.tokenPackages,
    tokenWallet: state.tokenWallet,
  });
}));

app.post("/api/center/tokens/purchase", asyncHandler(async (req, res) => {
  const { packageId } = req.body || {};
  if (!packageId) return res.status(400).json({ error: "缺少 packageId" });
  const state = await purchaseCenterTokens(packageId);
  res.json({
    tokenWallet: state.tokenWallet,
    tokenModels: state.tokenModels,
    tokenPackages: state.tokenPackages,
  });
}));

app.post("/api/center/tokens/regenerate-key", asyncHandler(async (_req, res) => {
  const wallet = await regenerateCenterApiKey();
  res.json({ apiKey: wallet.apiKey, tokenWallet: wallet });
}));

app.post("/api/center/auth/login", (req, res) => {
  const { role } = req.body || {};
  const user = CENTER_USERS[role];
  if (!user) return res.status(400).json({ error: "无效角色" });
  res.json({ user, token: `center-${role}` });
});

app.get("/api/center/approvals", asyncHandler(async (_req, res) => res.json(await listApprovals())));
app.put("/api/center/approvals/:id", asyncHandler(async (req, res) => {
  const item = await patchApproval(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/center/overseas", asyncHandler(async (_req, res) => res.json(await listOverseas())));
app.put("/api/center/overseas/:id", asyncHandler(async (req, res) => {
  const item = await patchOverseas(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/center/distributions", asyncHandler(async (_req, res) => res.json(await listDistributions())));
app.get("/api/center/copyrights", asyncHandler(async (_req, res) => res.json(await listCopyrights())));
app.get("/api/center/ais", asyncHandler(async (_req, res) => res.json(await listAis())));

app.get("/api/center/orders", asyncHandler(async (_req, res) => res.json(await listCenterOrders())));
app.post("/api/center/orders", asyncHandler(async (req, res) => res.json(await upsertCenterOrder(req.body))));
app.put("/api/center/orders/:id", asyncHandler(async (req, res) => {
  const item = await patchCenterOrder(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

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
  console.log(`xian-drama-saas http://0.0.0.0:${PORT} [${isPostgres() ? "postgresql" : "json"}] portals=alliance,center`);
});
