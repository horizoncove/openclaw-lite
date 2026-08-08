import { getDb } from "../../infra/db/sqlite.js";
import { config } from "../../infra/config.js";
import {
  applyPolicyTuning,
  analyzeLocal,
  buildEventStats,
  buildSafeSnippet,
  demoSeedScenarios,
  getActionCode,
  getCategoryLevelCode,
  getLevelCode,
  getOverallCopy,
  maskSensitiveText,
  sanitizeEventForExport,
  sanitizeValue,
} from "../pipeline.js";
import { cloudEnabled } from "../../infra/config.js";

function rowToEvent(row) {
  return JSON.parse(row.payload_json);
}

export function listEvents() {
  const db = getDb();
  const rows = db
    .prepare("SELECT payload_json FROM events ORDER BY created_at DESC LIMIT 500")
    .all();
  return rows.map(rowToEvent);
}

export function getEvent(id) {
  const db = getDb();
  const row = db.prepare("SELECT payload_json FROM events WHERE id = ?").get(id);
  return row ? rowToEvent(row) : null;
}

export function clearEvents() {
  getDb().prepare("DELETE FROM events").run();
}

export function createRiskEvent({ source, inputText, result, reply = "" }) {
  const event = {
    id: `MG-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    source,
    level: result.level,
    levelCode: result.levelCode || getLevelCode(result),
    score: result.score,
    finalScore: result.finalScore ?? result.score,
    action: result.action,
    actionCode: result.actionCode || getActionCode(getLevelCode(result)),
    summary: maskSensitiveText(result.summary || getOverallCopy(result.level)),
    policyVersion: result.policyVersion || config.POLICY_VERSION,
    ruleSetVersion: result.ruleSetVersion || config.RULE_SET_VERSION,
    scoreSource: result.scoreSource || "unknown",
    modelScore: result.modelScore ?? null,
    ruleScore: result.ruleScore ?? result.score,
    confidence: result.confidence ?? null,
    provider: result.provider || (cloudEnabled() ? "deepseek" : "local"),
    model: result.model || (cloudEnabled() ? config.DEEPSEEK_MODEL : "local-rules"),
    minorLikelihood: sanitizeValue(
      result.minorLikelihood || {
        level: "unknown",
        label: "未知",
        score: 0,
        reasons: [],
        note: "未提供未成年人可能性判断。",
      },
    ),
    minorLikelihoodCode:
      result.minorLikelihoodCode || result.minorLikelihood?.level || "unknown",
    categories: (result.categories || []).map((item) => ({
      id: item.id,
      categoryCode: item.categoryCode || item.id,
      name: item.name,
      short: item.short,
      score: item.score,
      level: item.level,
      levelCode: item.levelCode || getCategoryLevelCode(item),
      reason: maskSensitiveText(item.reason),
      hits: Array.isArray(item.hits) ? item.hits.slice(0, 8).map(maskSensitiveText) : [],
    })),
    policyTrace: sanitizeValue(result.policyTrace || []),
    snippet: buildSafeSnippet(inputText),
    replySnippet: reply ? buildSafeSnippet(reply) : "",
    recommendations: sanitizeValue(result.recommendations || {}),
    reviewStatus: result.level === "高风险" ? "待人工复核" : "自动记录",
  };

  const db = getDb();
  db.prepare(
    `INSERT INTO events (id, created_at, source, level_code, action_code, final_score, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    event.id,
    event.createdAt,
    event.source,
    event.levelCode,
    event.actionCode,
    event.finalScore,
    JSON.stringify(event),
  );

  // keep at most 500
  db.prepare(
    `DELETE FROM events WHERE id IN (
      SELECT id FROM events ORDER BY created_at DESC LIMIT -1 OFFSET 500
    )`,
  ).run();

  return event;
}

export function seedDemoEvents({ count = 80, clear = false } = {}) {
  if (clear) clearEvents();
  const created = [];
  for (let index = 0; index < count; index += 1) {
    const scenario = demoSeedScenarios[index % demoSeedScenarios.length];
    const round = Math.floor(index / demoSeedScenarios.length) + 1;
    const inputText = `${scenario.text}\n样本批次：DEMO-${String(round).padStart(2, "0")}，仅用于本地演示和统计验证。`;
    const local = analyzeLocal(inputText);
    const result = applyPolicyTuning(inputText, {
      ...local,
      provider: "local",
      model: "local-demo-seed",
      note: "本地合成样本，不调用外部模型。",
    });
    const event = createRiskEvent({
      source: scenario.source,
      inputText,
      result,
      reply: scenario.reply || "",
    });
    created.push(event.id);
  }
  const events = listEvents();
  return {
    ok: true,
    created: created.length,
    eventIds: created,
    stats: buildEventStats(events),
  };
}

export function listEventsForExport() {
  return listEvents().map(sanitizeEventForExport);
}
