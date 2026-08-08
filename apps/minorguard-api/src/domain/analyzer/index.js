import { cloudEnabled, config } from "../../infra/config.js";
import {
  analyzeConversation as pipelineAnalyze,
  analyzeLocal,
  applyPolicyTuning,
  fallbackReply,
  generateSafeReply,
  normalizeChatMessages,
} from "../pipeline.js";

/** Respect CLOUD_LLM_ENABLED / missing key by forcing local path. */
export async function analyzeConversation(conversation) {
  if (!cloudEnabled()) {
    const local = analyzeLocal(conversation);
    return applyPolicyTuning(conversation, {
      ...local,
      provider: "local",
      model: "local-rules",
      note: config.DEEPSEEK_API_KEY
        ? "CLOUD_LLM_ENABLED=false，使用本地规则。"
        : "未配置 DEEPSEEK_API_KEY，使用本地规则。",
    });
  }
  return pipelineAnalyze(conversation);
}

export async function analyzeLocalOnly(conversation) {
  const local = analyzeLocal(String(conversation || ""));
  return applyPolicyTuning(conversation, {
    ...local,
    provider: "local",
    model: "local-rules",
    note: "local-analyze",
  });
}

export async function chat(messagesInput, { save } = {}) {
  const messages = normalizeChatMessages(messagesInput);
  if (!messages.length) {
    const err = new Error("messages 至少需要包含一条非空用户消息。");
    err.code = "INVALID_MESSAGES";
    throw err;
  }
  const userText = messages
    .filter((item) => item.role === "user")
    .map((item) => `用户：${item.content}`)
    .join("\n");
  const risk = await analyzeConversation(userText);
  const highRiskFastPath = risk.level === "高风险";
  const reply = highRiskFastPath
    ? fallbackReply(risk)
    : await generateSafeReply(messages, risk);
  const combinedRisk = highRiskFastPath
    ? applyPolicyTuning(`${userText}\nAI：${reply}`, risk)
    : await analyzeConversation(`${userText}\nAI：${reply}`);
  return {
    reply,
    risk: combinedRisk,
    userText,
    fastPath: highRiskFastPath,
    policyMode: highRiskFastPath ? "high_risk_fast_path" : "model_assisted",
    provider: cloudEnabled() ? "deepseek" : "local",
    model: cloudEnabled() ? config.DEEPSEEK_MODEL : "local-rules",
    save,
  };
}

export { normalizeChatMessages, fallbackReply };
