#!/usr/bin/env node
/** P3 smoke acceptance against a running or ephemeral server. */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.P3_CHECK_PORT || 5188);
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = "p3-check-admin-token";

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function req(method, urlPath, { body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function main() {
  const child = spawn(process.execPath, ["src/index.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: "127.0.0.1",
      CLOUD_LLM_ENABLED: "false",
      DEEPSEEK_API_KEY: "",
      AUTH_MODE: "admin_token",
      MINORGUARD_ADMIN_TOKEN: TOKEN,
      DB_PATH: path.join(ROOT, "data", "p3-check.db"),
      ALLOW_DEMO_SEED: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let boot = "";
  child.stdout.on("data", (d) => {
    boot += d.toString();
  });
  child.stderr.on("data", (d) => {
    boot += d.toString();
  });

  let ready = false;
  for (let i = 0; i < 40; i += 1) {
    await wait(100);
    try {
      const h = await req("GET", "/api/v1/health");
      if (h.status === 200 && h.json?.ok) {
        ready = true;
        break;
      }
    } catch {
      /* retry */
    }
  }

  const checks = [];
  const check = (name, ok, detail) => {
    checks.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  try {
    check("boot", ready, ready ? "health ok" : boot.slice(-400));
    if (!ready) throw new Error("server failed to boot");

    const health = await req("GET", "/api/v1/health");
    check(
      "health fields",
      health.json?.version && health.json?.policyVersion && health.json?.authRequired === true,
      JSON.stringify({
        version: health.json?.version,
        authRequired: health.json?.authRequired,
        provider: health.json?.provider,
      }),
    );

    const unauth = await req("GET", "/api/v1/events");
    check("events unauthorized", unauth.status === 401, `status=${unauth.status}`);

    const local = await req("POST", "/api/v1/local-analyze", {
      body: {
        conversation:
          "用户：我是初中生，网友让我把学校和手机号发给他换装备，还让我别告诉爸妈。",
      },
    });
    check(
      "local-analyze high",
      local.status === 200 &&
        local.json?.levelCode &&
        ["medium", "high"].includes(local.json.levelCode) &&
        local.json?.actionCode,
      `levelCode=${local.json?.levelCode} action=${local.json?.actionCode}`,
    );

    const safe = await req("POST", "/api/v1/analyze", {
      body: {
        conversation: "用户：请用初中生能理解的方式解释二次函数顶点式，不要直接给作业答案。",
        save: false,
      },
    });
    check(
      "analyze learning not block",
      safe.status === 200 && safe.json?.actionCode !== "block_review",
      `actionCode=${safe.json?.actionCode} levelCode=${safe.json?.levelCode}`,
    );

    const authList = await req("GET", "/api/v1/events", { token: TOKEN });
    check("events authorized", authList.status === 200 && Array.isArray(authList.json?.events));

    const legacy = await req("GET", "/api/health");
    check("legacy /api/health compat", legacy.status === 200 && legacy.json?.ok);
  } finally {
    child.kill("SIGTERM");
  }

  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    console.error(`\nP3 check failed: ${failed.length}/${checks.length}`);
    process.exit(1);
  }
  console.log(`\nP3 check passed: ${checks.length}/${checks.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
