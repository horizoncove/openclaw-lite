#!/usr/bin/env node
import assert from "node:assert/strict";
import { analyzeLocal, applyPolicyTuning, finalizeRiskResult } from "../src/domain/pipeline.js";

const required = [
  "level",
  "levelCode",
  "score",
  "finalScore",
  "action",
  "actionCode",
  "summary",
  "categories",
  "minorLikelihood",
  "minorLikelihoodCode",
  "modelScore",
  "ruleScore",
  "scoreSource",
  "confidence",
  "policyTrace",
  "policyVersion",
  "ruleSetVersion",
];

const levelCodes = new Set(["none", "low", "medium", "high"]);
const actionCodes = new Set(["allow", "observe", "throttle", "block_review"]);

const text =
  "用户：我是初中生，网友让我把学校和手机号发给他，还说别告诉爸妈。";
const local = analyzeLocal(text);
const result = applyPolicyTuning(text, {
  ...local,
  provider: "local",
  model: "local-rules",
});

for (const key of required) {
  assert.ok(key in result, `missing field ${key}`);
}
assert.ok(levelCodes.has(result.levelCode), result.levelCode);
assert.ok(actionCodes.has(result.actionCode), result.actionCode);
assert.ok(Array.isArray(result.categories) && result.categories.length === 4);
assert.ok(Array.isArray(result.policyTrace));

const empty = finalizeRiskResult(analyzeLocal(""), {
  ruleScore: 0,
  scoreSource: "local_rule",
  confidence: 0.5,
});
assert.equal(empty.levelCode, "none");
assert.equal(empty.actionCode, "allow");

console.log("contract.test PASS");
