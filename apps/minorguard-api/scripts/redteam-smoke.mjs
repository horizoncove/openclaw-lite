#!/usr/bin/env node
/** Minimal redteam smoke: local-analyze only, no cloud, no ledger pollution. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeLocal, applyPolicyTuning } from "../src/domain/pipeline.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cases = JSON.parse(readFileSync(path.join(ROOT, "tests/redteam-cases.json"), "utf8"));
const max = Number(process.env.REDTEAM_MAX_CASES || 3);
const slice = cases.slice(0, max);

let pass = 0;
for (const c of slice) {
  const conversation = c.conversation || (c.messages || []).map((m) => `${m.role}：${m.content}`).join("\n");
  const local = analyzeLocal(conversation);
  const result = applyPolicyTuning(conversation, {
    ...local,
    provider: "local",
    model: "local-rules",
  });
  const ok = Boolean(result.levelCode && result.actionCode);
  console.log(`${ok ? "OK" : "BAD"} ${c.id} -> ${result.levelCode}/${result.actionCode}`);
  if (ok) pass += 1;
}
console.log(`redteam-smoke ${pass}/${slice.length}`);
if (pass !== slice.length) process.exit(1);
