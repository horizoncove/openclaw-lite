#!/usr/bin/env node
/** Provider resolution tests (subprocess isolates env + config load). */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const providersPath = path.join(ROOT, "src/domain/llm/providers.js");

function resolveWithEnv(env) {
  const script = `
    for (const [k, v] of Object.entries(${JSON.stringify(env)})) {
      if (v === null) delete process.env[k];
      else process.env[k] = v;
    }
    const { resolveProvider, llmEnabled } = await import(${JSON.stringify(providersPath)});
    const p = resolveProvider();
    console.log(JSON.stringify({
      id: p.id,
      enabled: p.enabled,
      model: p.model,
      reason: p.reason,
      baseUrl: p.baseUrl,
      llmEnabled: llmEnabled(),
    }));
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      // neutralize ambient keys from parent shell
      DOUBAO_API_KEY: "",
      ARK_API_KEY: "",
      DEEPSEEK_API_KEY: "",
      LLM_API_KEY: "",
      LLM_PROVIDER: "auto",
      CLOUD_LLM_ENABLED: "true",
      ...env,
    },
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "provider subprocess failed");
  }
  return JSON.parse(result.stdout.trim().split("\n").at(-1));
}

const none = resolveWithEnv({
  LLM_PROVIDER: "none",
  DOUBAO_API_KEY: "",
  DEEPSEEK_API_KEY: "",
});
assert.equal(none.id, "none");
assert.equal(none.enabled, false);

const doubao = resolveWithEnv({
  LLM_PROVIDER: "doubao",
  DOUBAO_API_KEY: "sk-test",
  DOUBAO_MODEL: "ep-20260101-xxxx",
  DOUBAO_BASE_URL: "https://ark.cn-beijing.volces.com/api/v3",
  CLOUD_LLM_ENABLED: "true",
});
assert.equal(doubao.id, "doubao");
assert.equal(doubao.enabled, true);
assert.equal(doubao.model, "ep-20260101-xxxx");
assert.match(doubao.baseUrl, /ark\.cn-beijing\.volces\.com/);

const missingModel = resolveWithEnv({
  LLM_PROVIDER: "doubao",
  DOUBAO_API_KEY: "sk-test",
  DOUBAO_MODEL: "",
  DOUBAO_ENDPOINT: "",
  ARK_ENDPOINT: "",
});
assert.equal(missingModel.id, "doubao");
assert.equal(missingModel.enabled, false);
assert.match(missingModel.reason, /DOUBAO_MODEL|Endpoint/);

const autoDoubao = resolveWithEnv({
  LLM_PROVIDER: "auto",
  ARK_API_KEY: "sk-ark",
  ARK_ENDPOINT: "ep-auto",
  DEEPSEEK_API_KEY: "sk-deepseek-should-lose",
});
assert.equal(autoDoubao.id, "doubao");
assert.equal(autoDoubao.enabled, true);
assert.equal(autoDoubao.model, "ep-auto");

const deepseek = resolveWithEnv({
  LLM_PROVIDER: "auto",
  DOUBAO_API_KEY: "",
  ARK_API_KEY: "",
  DEEPSEEK_API_KEY: "sk-ds",
  DEEPSEEK_MODEL: "deepseek-chat",
});
assert.equal(deepseek.id, "deepseek");
assert.equal(deepseek.enabled, true);

console.log("providers.test PASS");
