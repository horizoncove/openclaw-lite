import { config } from "../infra/config.js";

function allowedOrigin(origin) {
  if (!origin) return null;
  if (config.CORS_ORIGIN === "*") return origin;
  const list = String(config.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!list.length) return null;
  return list.includes(origin) ? origin : null;
}

/** Apply CORS headers; return true if request was an OPTIONS preflight that is fully handled. */
export function applyCors(req, res) {
  const origin = req.headers.origin;
  const allow = allowedOrigin(origin);
  if (allow) {
    res.setHeader("Access-Control-Allow-Origin", allow);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else if (!origin && config.CORS_ORIGIN === "*") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, x-admin-token",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}
