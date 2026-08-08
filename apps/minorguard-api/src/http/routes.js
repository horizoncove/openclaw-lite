import { readFile } from "node:fs/promises";
import path from "node:path";
import { config, authRequired, cloudEnabled } from "../infra/config.js";
import { getDb } from "../infra/db/sqlite.js";
import { analyzeConversation, analyzeLocalOnly, chat } from "../domain/analyzer/index.js";
import {
  clearEvents,
  createRiskEvent,
  getEvent,
  listEvents,
  listEventsForExport,
  seedDemoEvents,
} from "../domain/events/store.js";
import { recordAudit } from "../domain/audit/log.js";
import { requireAdmin, requireService, serviceAuthRequired } from "../domain/auth/tokens.js";
import {
  buildEventStats,
  buildEventsMarkdown,
  POLICY_VERSION,
  RULE_SET_VERSION,
  sanitizeEventForExport,
  shouldSaveEvent,
} from "../domain/pipeline.js";
import { readJson, sendJson, sendText } from "./util.js";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function healthPayload() {
  getDb(); // ensure migrated
  return {
    ok: true,
    version: config.APP_VERSION,
    policyVersion: POLICY_VERSION,
    ruleSetVersion: RULE_SET_VERSION,
    provider: cloudEnabled() ? "deepseek" : "local",
    model: cloudEnabled() ? config.DEEPSEEK_MODEL : "local-rules",
    authRequired: authRequired(),
    apiAuthRequired: serviceAuthRequired(),
    authMode: config.AUTH_MODE || "demo_open",
    storage: "sqlite",
    integration: {
      analyze: "POST /api/v1/analyze",
      chat: "POST /api/v1/chat",
      docs: "/docs/integration.html",
    },
  };
}

async function serveStatic(pathname, res) {
  // expose JS SDK without duplicating into public/
  if (pathname === "/sdk/minorguard.js") {
    try {
      const content = await readFile(path.join(config.ROOT, "sdk/js/minorguard.js"));
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(content);
      return;
    } catch {
      sendText(res, 404, "SDK not found");
      return;
    }
  }

  const safePath = pathname === "/" ? "/index.html" : pathname;
  const normalized = path.normalize(decodeURIComponent(safePath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(config.PUBLIC_DIR, normalized);
  if (!filePath.startsWith(config.PUBLIC_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  try {
    const content = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(content);
  } catch {
    sendText(res, 404, "Not found");
  }
}

/** Map both /api/* and /api/v1/* */
function apiPath(pathname) {
  if (pathname.startsWith("/api/v1/")) return pathname.slice("/api/v1".length);
  if (pathname.startsWith("/api/")) return pathname.slice("/api".length);
  return null;
}

export async function handleRequest(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const api = apiPath(url.pathname);

  if (api !== null) {
    if (req.method === "GET" && api === "/health") {
      sendJson(res, 200, healthPayload());
      return;
    }

    if (req.method === "POST" && api === "/local-analyze") {
      if (!requireService(req, res, sendJson)) return;
      const body = await readJson(req);
      const result = await analyzeLocalOnly(String(body.conversation || ""));
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && api === "/analyze") {
      if (!requireService(req, res, sendJson)) return;
      const body = await readJson(req);
      const conversation = String(body.conversation ?? body.text ?? "").slice(0, 12000);
      const result = await analyzeConversation(conversation);
      let event = null;
      if (shouldSaveEvent(body)) {
        event = createRiskEvent({
          source: body.source || "manual-analysis",
          inputText: conversation,
          result,
        });
      }
      sendJson(res, 200, event ? { ...result, eventId: event.id } : result);
      return;
    }

    if (req.method === "POST" && api === "/chat") {
      if (!requireService(req, res, sendJson)) return;
      const body = await readJson(req);
      try {
        const out = await chat(body.messages, { save: body.save });
        let event = null;
        if (shouldSaveEvent(body)) {
          event = createRiskEvent({
            source: body.source || "realtime-chat",
            inputText: out.userText,
            result: out.risk,
            reply: out.reply,
          });
        }
        sendJson(res, 200, {
          reply: out.reply,
          risk: out.risk,
          eventId: event?.id || null,
          fastPath: out.fastPath,
          policyMode: out.policyMode,
          provider: out.provider,
          model: out.model,
        });
      } catch (error) {
        if (error?.code === "INVALID_MESSAGES") {
          sendJson(res, 400, { error: "INVALID_MESSAGES", message: error.message });
          return;
        }
        throw error;
      }
      return;
    }

    if (req.method === "POST" && api === "/demo/seed-events") {
      if (!requireAdmin(req, res, sendJson)) return;
      if (!config.ALLOW_DEMO_SEED) {
        sendJson(res, 403, { error: "FORBIDDEN", message: "Demo seed disabled" });
        return;
      }
      const body = await readJson(req);
      const count = Math.max(1, Math.min(300, Number(body.count || 80)));
      const clear = body.clear === true;
      const seeded = seedDemoEvents({ count, clear });
      recordAudit("demo.seed_events", req, { count, clear, created: seeded.created });
      sendJson(res, 200, seeded);
      return;
    }

    if (req.method === "GET" && api === "/events") {
      if (!requireAdmin(req, res, sendJson)) return;
      recordAudit("events.list", req, { scope: "event-ledger" });
      const events = listEventsForExport();
      sendJson(res, 200, { events, stats: buildEventStats(events) });
      return;
    }

    if (req.method === "GET" && api === "/events/export.json") {
      if (!requireAdmin(req, res, sendJson)) return;
      recordAudit("events.export_json", req, { scope: "event-ledger" });
      const events = listEventsForExport();
      sendJson(res, 200, {
        exportedAt: new Date().toISOString(),
        stats: buildEventStats(events),
        events,
      });
      return;
    }

    if (req.method === "GET" && api === "/events/export.md") {
      if (!requireAdmin(req, res, sendJson)) return;
      recordAudit("events.export_md", req, { scope: "event-ledger" });
      const events = listEvents();
      sendText(res, 200, buildEventsMarkdown(events), "text/markdown; charset=utf-8");
      return;
    }

    if (req.method === "GET" && api.startsWith("/events/")) {
      if (!requireAdmin(req, res, sendJson)) return;
      const id = decodeURIComponent(api.replace("/events/", ""));
      recordAudit("events.detail", req, { eventId: id });
      const event = getEvent(id);
      sendJson(
        res,
        event ? 200 : 404,
        event ? sanitizeEventForExport(event) : { error: "NOT_FOUND", message: "Event not found" },
      );
      return;
    }

    if (req.method === "DELETE" && api === "/events") {
      if (!requireAdmin(req, res, sendJson)) return;
      recordAudit("events.clear", req, { scope: "event-ledger" });
      clearEvents();
      sendJson(res, 200, { ok: true, events: [] });
      return;
    }

    sendJson(res, 404, { error: "NOT_FOUND", message: `Unknown API ${api}` });
    return;
  }

  if (req.method === "GET") {
    await serveStatic(url.pathname, res);
    return;
  }

  sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
}
