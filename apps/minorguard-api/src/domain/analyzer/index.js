import { llmEnabled, resolveProvider } from "../llm/providers.js";
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
  if (!llmEnabled()) {
    const provider = resolveProvider();
    const local = analyzeLocal(conversation);
    return applyPolicyTuning(conversation, {
      ...local,
      provider: "local",
      model: "local-rules",
      note: `云模型未启用（${provider.id}: ${provider.reason}），使用本地规则。`,
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
  const provider = resolveProvider();
  return {
    reply,
    risk: combinedRisk,
    userText,
    fastPath: highRiskFastPath,
    policyMode: highRiskFastPath ? "high_risk_fast_path" : "model_assisted",
    provider: llmEnabled() ? provider.id : "local",
    model: llmEnabled() ? provider.model : "local-rules",
    save,
  };
}

export { normalizeChatMessages, fallbackReply };
