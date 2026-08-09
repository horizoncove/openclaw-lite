#!/usr/bin/env node
/**
 * Example: App backend integrating MinorGuard before calling your own LLM.
 *
 *   MINORGUARD_BASE_URL=http://127.0.0.1:5178 \
 *   MINORGUARD_API_TOKEN=app_xxx \
 *   node examples/node-integrate.mjs
 */
import { MinorGuardClient } from "../sdk/js/minorguard.js";

const baseUrl = process.env.MINORGUARD_BASE_URL || "http://127.0.0.1:5178";
const apiToken = process.env.MINORGUARD_API_TOKEN || "";
const mg = new MinorGuardClient({ baseUrl, apiToken });

const userText = process.argv.slice(2).join(" ") ||
  "用户：我是初中生，网友让我把手机号发给他换游戏装备，还说别告诉爸妈。";

const health = await mg.health();
console.log("health", {
  version: health.version,
  apiAuthRequired: health.apiAuthRequired,
  authMode: health.authMode,
});

const risk = await mg.analyze(userText, { save: false, source: "example-node-app" });
const decision = MinorGuardClient.decide(risk.actionCode);

console.log("risk", {
  levelCode: risk.levelCode,
  actionCode: risk.actionCode,
  finalScore: risk.finalScore,
  summary: risk.summary,
});
console.log("appDecision", decision);

if (!decision.allowReply) {
  console.log("uiReply", "这个问题涉及较高风险，我不能继续提供具体做法。请和家长或老师沟通。");
  process.exit(0);
}

// Place your business LLM call here when allowReply === true
console.log("uiReply", "(此处调用你们自己的大模型生成正常回复)");
