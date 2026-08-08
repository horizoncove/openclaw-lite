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
  getCenterState,
  resetCenterState,
  getCenterStats,
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
import { checkAccessCode, requireAuth, signToken } from "./auth.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
  credentials: true,
}));
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

const allianceAuth = requireAuth({ portal: "alliance" });
const allianceSecretariat = requireAuth({ portal: "alliance", roles: ["alliance"] });
const centerAuth = requireAuth({ portal: "center" });

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "xian-drama-saas",
    version: "1.3.0",
    storage: isPostgres() ? "postgresql" : "json",
    portals: ["alliance", "center"],
    auth: {
      accessCodeRequired: Boolean(process.env.DEMO_ACCESS_CODE),
      token: "hmac-sha256",
    },
  });
});

// ── Alliance API（数据独立）────────────────────────────────

app.get("/api/alliance/state", allianceAuth, asyncHandler(async (_req, res) => res.json(await getAllianceState())));
app.post(
  "/api/alliance/reset",
  allianceSecretariat,
  asyncHandler(async (_req, res) => res.json(await resetAllianceState())),
);
app.get("/api/alliance/stats", allianceAuth, asyncHandler(async (_req, res) => res.json(await getAllianceStats())));

app.post("/api/alliance/auth/login", (req, res) => {
  const { role, code } = req.body || {};
  if (!checkAccessCode(code)) {
    return res.status(401).json({ error: "访问码无效" });
  }
  const user = ALLIANCE_USERS[role];
  if (!user) return res.status(400).json({ error: "无效角色" });
  const token = signToken({ portal: "alliance", role: user.role, sub: user.id, org: user.org });
  res.json({ user, token });
});

app.get("/api/alliance/auth/me", allianceAuth, (req, res) => {
  const user = ALLIANCE_USERS[req.auth.role];
  if (!user) return res.status(401).json({ error: "会话失效" });
  res.json({ user });
});

app.get("/api/alliance/members", allianceAuth, asyncHandler(async (_req, res) => res.json(await listMembers())));
app.post("/api/alliance/members", allianceSecretariat, asyncHandler(async (req, res) => res.json(await upsertMember(req.body))));
app.put("/api/alliance/members/:id", allianceSecretariat, asyncHandler(async (req, res) => {
  const item = await patchMember(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/alliance/events", allianceAuth, asyncHandler(async (_req, res) => res.json(await listEvents())));
app.post("/api/alliance/events", allianceSecretariat, asyncHandler(async (req, res) => res.json(await upsertEvent(req.body))));
app.put("/api/alliance/events/:id", allianceAuth, asyncHandler(async (req, res) => {
  // member may register; secretariat may edit freely — body validated lightly
  const item = await patchEvent(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/alliance/matches", allianceAuth, asyncHandler(async (_req, res) => res.json(await listMatches())));
app.post("/api/alliance/matches", allianceAuth, asyncHandler(async (req, res) => res.json(await saveMatch(req.body))));
app.put("/api/alliance/matches/:id", allianceAuth, asyncHandler(async (req, res) => {
  const item = await patchMatch(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/alliance/orders", allianceAuth, asyncHandler(async (_req, res) => res.json(await listAllianceOrders())));
app.post("/api/alliance/orders", allianceAuth, asyncHandler(async (req, res) => res.json(await upsertAllianceOrder(req.body))));
app.put("/api/alliance/orders/:id", allianceAuth, asyncHandler(async (req, res) => {
  const item = await patchAllianceOrder(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

// ── Center API（数据独立）──────────────────────────────────

app.get("/api/center/state", centerAuth, asyncHandler(async (_req, res) => res.json(await getCenterState())));
app.post(
  "/api/center/reset",
  centerAuth,
  asyncHandler(async (_req, res) => res.json(await resetCenterState())),
);
app.get("/api/center/stats", centerAuth, asyncHandler(async (_req, res) => res.json(await getCenterStats())));

app.post("/api/center/auth/login", (req, res) => {
  const { role, code } = req.body || {};
  if (!checkAccessCode(code)) {
    return res.status(401).json({ error: "访问码无效" });
  }
  const user = CENTER_USERS[role];
  if (!user) return res.status(400).json({ error: "无效角色" });
  const token = signToken({ portal: "center", role: user.role, sub: user.id, org: user.org });
  res.json({ user, token });
});

app.get("/api/center/auth/me", centerAuth, (req, res) => {
  const user = CENTER_USERS[req.auth.role];
  if (!user) return res.status(401).json({ error: "会话失效" });
  res.json({ user });
});

app.get("/api/center/approvals", centerAuth, asyncHandler(async (_req, res) => res.json(await listApprovals())));
app.put("/api/center/approvals/:id", centerAuth, asyncHandler(async (req, res) => {
  const item = await patchApproval(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/center/overseas", centerAuth, asyncHandler(async (_req, res) => res.json(await listOverseas())));
app.put("/api/center/overseas/:id", centerAuth, asyncHandler(async (req, res) => {
  const item = await patchOverseas(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "未找到" });
  res.json(item);
}));

app.get("/api/center/distributions", centerAuth, asyncHandler(async (_req, res) => res.json(await listDistributions())));
app.get("/api/center/copyrights", centerAuth, asyncHandler(async (_req, res) => res.json(await listCopyrights())));
app.get("/api/center/ais", centerAuth, asyncHandler(async (_req, res) => res.json(await listAis())));

app.get("/api/center/orders", centerAuth, asyncHandler(async (_req, res) => res.json(await listCenterOrders())));
app.post("/api/center/orders", centerAuth, asyncHandler(async (req, res) => res.json(await upsertCenterOrder(req.body))));
app.put("/api/center/orders/:id", centerAuth, asyncHandler(async (req, res) => {
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
  console.log(
    `xian-drama-saas http://0.0.0.0:${PORT} [${isPostgres() ? "postgresql" : "json"}] portals=alliance,center auth=hmac`,
  );
});
