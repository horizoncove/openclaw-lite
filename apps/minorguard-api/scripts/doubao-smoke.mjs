#!/usr/bin/env node
/**
 * Doubao / Ark wiring smoke.
 * - Default: mock Ark OpenAI-compatible server (no real key needed)
 * - Live: DOUBAO_SMOKE_LIVE=1 + DOUBAO_API_KEY + DOUBAO_MODEL
 */
import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MOCK_PORT = Number(process.env.DOUBAO_MOCK_PORT || 5191);
const API_PORT = Number(process.env.DOUBAO_SMOKE_PORT || 5192);
const LIVE = ["1", "true", "yes"].includes(String(process.env.DOUBAO_SMOKE_LIVE || "").toLowerCase());

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function mockRiskJson(userContent = "") {
  const high =
    /手机号|身份证|网友|别告诉|爸妈|绕过|脚本|自伤|色情|见面/u.test(userContent);
  return {
    level: high ? "高风险" : "未见明显风险",
    score: high ? 88 : 8,
    action: high ? "阻断并复核" : "放行",
    summary: high ? "模拟豆包：疑似未成年人敏感交互，建议阻断。" : "模拟豆包：未见明显风险。",
    minorLikelihood: {
      level: high ? "likely_minor" : "unknown",
      label: high ? "高度疑似未成年人" : "未知",
      score: high ? 70 : 0,
      reasons: high ? ["校园或未成年人语义线索"] : [],
      note: "mock",
    },
    categories: [
      {
        id: "content",
        name: "AI 内容风险",
        score: high && /自伤|色情|暴力/.test(userContent) ? 80 : 0,
        level: "未见明显风险",
        reason: "mock",
        hits: [],
      },
      {
        id: "interaction",
        name: "AI 交互风险",
        score: high && /见面|唯一/.test(userContent) ? 80 : 10,
        level: "低",
        reason: "mock",
        hits: [],
      },
      {
        id: "tool",
        name: "AI 工具滥用风险",
        score: high && /脚本|绕过/.test(userContent) ? 80 : 0,
        level: "未见明显风险",
        reason: "mock",
        hits: [],
      },
      {
        id: "data",
        name: "AI 数据风险",
        score: high && /手机号|身份证|网友/.test(userContent) ? 88 : 0,
        level: high ? "高" : "未见明显风险",
        reason: "mock",
        hits: high ? ["隐私索取"] : [],
      },
    ],
    recommendations: {
      family: ["与可信成年人沟通"],
      platform: ["按 actionCode 处置"],
      regulator: ["仅接收脱敏事件"],
    },
  };
}

function startMockArk() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      if (req.method === "POST" && req.url === "/chat/completions") {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        const auth = req.headers.authorization || "";
        if (!auth.startsWith("Bearer ")) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "missing bearer" } }));
          return;
        }
        const userMsg = [...(body.messages || [])].reverse().find((m) => m.role === "user");
        const content = String(userMsg?.content || "");
        const isAnalyze = /未成年人风险|只输出 JSON|JSON Schema/i.test(
          String(body.messages?.[0]?.content || "") + content,
        );
        const reply = isAnalyze
          ? JSON.stringify(mockRiskJson(content))
          : "这是模拟豆包的安全回复：请不要向陌生人发送手机号或证件信息，并告诉家长或老师。";
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: "chatcmpl-mock-doubao",
            object: "chat.completion",
            model: body.model || "ep-mock",
            choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }],
          }),
        );
        return;
      }
      res.writeHead(404);
      res.end("not found");
    });
    server.listen(MOCK_PORT, "127.0.0.1", () => resolve(server));
  });
}

async function waitHealth(base) {
  for (let i = 0; i < 50; i += 1) {
    await wait(100);
    try {
      const res = await fetch(`${base}/api/v1/health`);
      if (res.ok) return await res.json();
    } catch {
      /* retry */
    }
  }
  throw new Error("API failed to boot");
}

async function main() {
  const checks = [];
  const check = (name, ok, detail) => {
    checks.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  let mock;
  const liveKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "";
  const liveModel =
    process.env.DOUBAO_MODEL || process.env.DOUBAO_ENDPOINT || process.env.ARK_ENDPOINT || "";
  const useLive = LIVE && liveKey && liveModel;

  if (!useLive) {
    mock = await startMockArk();
    console.log(`[doubao-smoke] mock Ark on http://127.0.0.1:${MOCK_PORT}`);
  } else {
    console.log("[doubao-smoke] LIVE mode against real Ark endpoint");
  }

  const env = {
    ...process.env,
    PORT: String(API_PORT),
    HOST: "127.0.0.1",
    AUTH_MODE: "demo_open",
    CLOUD_LLM_ENABLED: "true",
    LLM_PROVIDER: "doubao",
    DEEPSEEK_API_KEY: "",
    DB_PATH: path.join(ROOT, "data", "doubao-smoke.db"),
    ALLOW_DEMO_SEED: "false",
  };

  if (useLive) {
    env.DOUBAO_API_KEY = liveKey;
    env.DOUBAO_MODEL = liveModel;
    env.DOUBAO_BASE_URL =
      process.env.DOUBAO_BASE_URL ||
      process.env.ARK_BASE_URL ||
      "https://ark.cn-beijing.volces.com/api/v3";
  } else {
    env.DOUBAO_API_KEY = "sk-mock-doubao-smoke";
    env.DOUBAO_MODEL = "ep-mock-smoke";
    env.DOUBAO_BASE_URL = `http://127.0.0.1:${MOCK_PORT}`;
  }

  const child = spawn(process.execPath, ["src/index.js"], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let boot = "";
  child.stdout.on("data", (d) => {
    boot += d.toString();
  });
  child.stderr.on("data", (d) => {
    boot += d.toString();
  });

  const base = `http://127.0.0.1:${API_PORT}`;
  try {
    const health = await waitHealth(base);
    check(
      "health doubao provider",
      health.llm?.provider === "doubao" && health.llm?.enabled === true,
      JSON.stringify(health.llm),
    );

    const analyze = await fetch(`${base}/api/v1/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation:
          "用户：我是初中生，网友让我把手机号发给他换装备，还说别告诉爸妈。",
        save: false,
      }),
    }).then((r) => r.json());

    check(
      "analyze via doubao",
      analyze.provider === "doubao" &&
        analyze.actionCode &&
        ["medium", "high"].includes(analyze.levelCode),
      `provider=${analyze.provider} level=${analyze.levelCode} action=${analyze.actionCode} note=${analyze.note || ""}`,
    );

    const chat = await fetch(`${base}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "请用一句话提醒：不要把手机号发给网友。" }],
        save: false,
      }),
    }).then((r) => r.json());

    check(
      "chat via doubao path",
      Boolean(chat.reply) && (chat.provider === "doubao" || chat.risk?.provider === "doubao" || chat.fastPath),
      `provider=${chat.provider} replyLen=${String(chat.reply || "").length}`,
    );
  } catch (error) {
    check("boot/run", false, error instanceof Error ? error.message : String(error));
    console.error(boot.slice(-800));
  } finally {
    child.kill("SIGTERM");
    if (mock) mock.close();
  }

  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    console.error(`\ndoubao-smoke failed: ${failed.length}/${checks.length}`);
    process.exit(1);
  }
  console.log(`\ndoubao-smoke passed: ${checks.length}/${checks.length} (${useLive ? "live" : "mock"})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
