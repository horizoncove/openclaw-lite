import { getDb } from "../../infra/db/sqlite.js";
import { config, authRequired } from "../../infra/config.js";
import { sanitizeValue } from "../pipeline.js";

export function recordAudit(action, req, detail = {}) {
  const entry = {
    id: `AUD-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    action,
    method: req.method,
    path: (req.url || "").split("?")[0],
    authMode: authRequired() ? config.AUTH_MODE || "admin_token" : "demo_open",
    detail: sanitizeValue(detail),
  };
  getDb()
    .prepare(
      `INSERT INTO audit_logs (id, created_at, action, method, path, auth_mode, detail_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      entry.id,
      entry.createdAt,
      entry.action,
      entry.method,
      entry.path,
      entry.authMode,
      JSON.stringify(entry.detail),
    );
  getDb()
    .prepare(
      `DELETE FROM audit_logs WHERE id IN (
        SELECT id FROM audit_logs ORDER BY created_at DESC LIMIT -1 OFFSET 1000
      )`,
    )
    .run();
  return entry;
}

export function listAuditLogs(limit = 100) {
  const rows = getDb()
    .prepare(
      "SELECT id, created_at, action, method, path, auth_mode, detail_json FROM audit_logs ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit);
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    action: row.action,
    method: row.method,
    path: row.path,
    authMode: row.auth_mode,
    detail: JSON.parse(row.detail_json),
  }));
}
