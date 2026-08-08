import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(path.join(ROOT, ".env"));
loadDotEnv(path.join(ROOT, "ds.env"));

const AUTH_MODE = (process.env.AUTH_MODE || "").trim() || (
  process.env.MINORGUARD_ADMIN_TOKEN || process.env.MINORGUARD_API_TOKEN
    ? "admin_token"
    : "demo_open"
);

export const config = {
  ROOT,
  PORT: Number(process.env.PORT || 5178),
  HOST: process.env.HOST || "0.0.0.0",
  APP_VERSION: "0.4.1-p3-integrate",
  POLICY_VERSION: process.env.POLICY_VERSION || "minor-safety-policy-2026-08-08",
  RULE_SET_VERSION: process.env.RULE_SET_VERSION || "ruleset-p2.1",
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || "",
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  CLOUD_LLM_ENABLED: !["0", "false", "off", "no"].includes(
    String(process.env.CLOUD_LLM_ENABLED || "true").toLowerCase(),
  ),
  LLM_TIMEOUT_MS: Number(process.env.LLM_TIMEOUT_MS || 45000),
  ADMIN_TOKEN: process.env.MINORGUARD_ADMIN_TOKEN || "",
  API_TOKEN: process.env.MINORGUARD_API_TOKEN || "",
  API_TOKENS: process.env.MINORGUARD_API_TOKENS || "",
  AUTH_MODE,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "",
  DB_PATH: process.env.DB_PATH || path.join(ROOT, "data", "minorguard.db"),
  PUBLIC_DIR: process.env.PUBLIC_DIR || path.join(ROOT, "public"),
  EVENT_RETENTION_DAYS: Number(process.env.EVENT_RETENTION_DAYS || 180),
  ALLOW_DEMO_SEED: !["0", "false", "off", "no"].includes(
    String(process.env.ALLOW_DEMO_SEED || "true").toLowerCase(),
  ),
};

export function authRequired() {
  return config.AUTH_MODE === "admin_token" || config.AUTH_MODE === "strict" || Boolean(config.ADMIN_TOKEN);
}

export function cloudEnabled() {
  return config.CLOUD_LLM_ENABLED && Boolean(config.DEEPSEEK_API_KEY);
}
