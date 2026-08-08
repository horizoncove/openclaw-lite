import { config, authRequired } from "../../infra/config.js";

export function requireAdmin(req, res, sendJson) {
  if (!authRequired()) return true;
  if (!config.ADMIN_TOKEN) {
    sendJson(res, 500, {
      error: "MISCONFIGURED",
      message: "AUTH_MODE requires MINORGUARD_ADMIN_TOKEN",
    });
    return false;
  }
  const auth = String(req.headers.authorization || "");
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerToken = String(req.headers["x-admin-token"] || "").trim();
  if (bearer === config.ADMIN_TOKEN || headerToken === config.ADMIN_TOKEN) return true;
  sendJson(res, 401, {
    error: "UNAUTHORIZED",
    message: "Admin token required for event ledger access.",
  });
  return false;
}
