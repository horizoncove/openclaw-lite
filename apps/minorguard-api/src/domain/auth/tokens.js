import { config } from "../../infra/config.js";

function parseTokenList(raw) {
  return String(raw || "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getApiTokens() {
  const fromList = parseTokenList(config.API_TOKENS);
  if (fromList.length) return fromList;
  if (config.API_TOKEN) return [config.API_TOKEN];
  return [];
}

export function extractBearerOrApiKey(req) {
  const auth = String(req.headers.authorization || "");
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const apiKey = String(req.headers["x-api-key"] || "").trim();
  const adminHeader = String(req.headers["x-admin-token"] || "").trim();
  return { bearer, apiKey, adminHeader };
}

export function isAdminCredential(req) {
  if (!config.ADMIN_TOKEN) return false;
  const { bearer, adminHeader } = extractBearerOrApiKey(req);
  return bearer === config.ADMIN_TOKEN || adminHeader === config.ADMIN_TOKEN;
}

export function isApiCredential(req) {
  const tokens = getApiTokens();
  if (!tokens.length) return false;
  const { bearer, apiKey } = extractBearerOrApiKey(req);
  return tokens.includes(bearer) || tokens.includes(apiKey);
}

/** Analyze/chat require service token when strict, or when API tokens are configured outside demo_open. */
export function serviceAuthRequired() {
  if (config.AUTH_MODE === "demo_open") return false;
  if (config.AUTH_MODE === "strict") return true;
  return getApiTokens().length > 0;
}

export function requireService(req, res, sendJson) {
  if (!serviceAuthRequired()) return true;
  if (isAdminCredential(req) || isApiCredential(req)) return true;
  const hasTokens = getApiTokens().length > 0;
  sendJson(res, 401, {
    error: "UNAUTHORIZED",
    message: hasTokens
      ? "API token required. Use Authorization: Bearer <MINORGUARD_API_TOKEN> or x-api-key."
      : "AUTH_MODE=strict requires MINORGUARD_API_TOKEN (or admin token).",
  });
  return false;
}

export function requireAdmin(req, res, sendJson) {
  // demo_open: ledger open (local only)
  if (config.AUTH_MODE === "demo_open" && !config.ADMIN_TOKEN) return true;

  if (!config.ADMIN_TOKEN) {
    sendJson(res, 500, {
      error: "MISCONFIGURED",
      message: "Set MINORGUARD_ADMIN_TOKEN for ledger access in this auth mode.",
    });
    return false;
  }
  if (isAdminCredential(req)) return true;
  sendJson(res, 401, {
    error: "UNAUTHORIZED",
    message: "Admin token required for event ledger access.",
  });
  return false;
}
