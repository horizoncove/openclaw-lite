#!/usr/bin/env node
/**
 * Full local-rules redteam (no cloud, no ledger writes).
 * For HTTP-path redteam against a running server, set REDTEAM_BASE_URL.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeLocal, applyPolicyTuning } from "../src/domain/pipeline.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cases = JSON.parse(readFileSync(path.join(ROOT, "tests/redteam-cases.json"), "utf8"));
const max = Number(process.env.REDTEAM_MAX_CASES || cases.length);
const baseUrl = (process.env.REDTEAM_BASE_URL || "").replace(/\/$/, "");
const token = process.env.MINORGUARD_API_TOKEN || "";
const slice = cases.slice(0, max);

const levelRank = { none: 0, low: 1, medium: 2, high: 3 };
const zhToCode = {
  未见明显风险: "none",
  低风险: "low",
  中风险: "medium",
  高风险: "high",
};

function expectedCode(c) {
  if (c.expectedLevelCode) return c.expectedLevelCode;
  return zhToCode[c.expectedLevel] || null;
}

async function runCase(c) {
  const conversation =
    c.conversation ||
    (c.messages || []).map((m) => `${m.role === "assistant" ? "AI" : "用户"}：${m.content}`).join("\n");

  let result;
  if (baseUrl) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}/api/v1/analyze`, {
      method: "POST",
      headers,
      body: JSON.stringify({ conversation, save: false, source: "redteam" }),
    });
    result = await res.json();
    if (!res.ok) throw new Error(result.message || `HTTP ${res.status}`);
  } else {
    const local = analyzeLocal(conversation);
    result = applyPolicyTuning(conversation, {
      ...local,
      provider: "local",
      model: "local-rules",
    });
  }

  const exp = expectedCode(c);
  const got = result.levelCode;
  let pass = true;
  let failType = "通过";
  if (exp) {
    const tol = c.levelTolerance || 0;
    pass = Math.abs((levelRank[got] ?? 0) - (levelRank[exp] ?? 0)) <= tol;
    if (!pass) failType = (levelRank[got] ?? 0) < (levelRank[exp] ?? 0) ? "漏报" : "过严";
  }
  if (c.expectedAction && result.action !== c.expectedAction && c.expectedActionCode) {
    // optional actionCode check
  }
  if (Array.isArray(c.allowedActions) && c.allowedActions.length) {
    if (!c.allowedActions.includes(result.action) && !c.allowedActions.includes(result.actionCode)) {
      // soft: only fail if chinese action listed
      if (c.allowedActions.some((a) => /[\u4e00-\u9fa5]/.test(a))) {
        if (!c.allowedActions.includes(result.action)) {
          pass = false;
          failType = "动作不符";
        }
      }
    }
  }
  return {
    id: c.id,
    title: c.title,
    expectedLevel: c.expectedLevel,
    expectedLevelCode: exp,
    levelCode: got,
    actionCode: result.actionCode,
    pass,
    failType: pass ? "通过" : failType,
  };
}

const rows = [];
for (const c of slice) {
  try {
    rows.push(await runCase(c));
  } catch (e) {
    rows.push({
      id: c.id,
      title: c.title,
      pass: false,
      failType: "执行异常",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

const passed = rows.filter((r) => r.pass).length;
const highMiss = rows.filter(
  (r) => !r.pass && r.failType === "漏报" && r.expectedLevelCode === "high",
).length;
const report = {
  generatedAt: new Date().toISOString(),
  mode: baseUrl || "in-process-local-rules",
  total: rows.length,
  passed,
  highRiskMiss: highMiss,
  rows,
};

const outDir = path.join(ROOT, "reports");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const jsonPath = path.join(outDir, `redteam-${stamp}.json`);
writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");

const md = [
  `# MinorGuard Redteam`,
  "",
  `- mode: ${report.mode}`,
  `- passed: ${passed}/${rows.length}`,
  `- high-risk miss: ${highMiss}`,
  "",
  "| ID | expected | got | action | pass |",
  "|---|---|---|---|---|",
  ...rows.map(
    (r) =>
      `| ${r.id} | ${r.expectedLevelCode || r.expectedLevel || "-"} | ${r.levelCode || "-"} | ${r.actionCode || "-"} | ${r.pass ? "Y" : r.failType} |`,
  ),
  "",
];
const mdPath = path.join(outDir, `redteam-${stamp}.md`);
writeFileSync(mdPath, md.join("\n"));

console.log(JSON.stringify({ passed, total: rows.length, highRiskMiss: highMiss, jsonPath, mdPath }, null, 2));
if (highMiss > 0) process.exit(2);
if (passed < rows.length) process.exit(1);
