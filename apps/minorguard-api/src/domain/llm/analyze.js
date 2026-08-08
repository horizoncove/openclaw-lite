import { chatCompletions, extractMessageContent, parseJsonContent } from "./client.js";
import { resolveProvider } from "./providers.js";

const ANALYZE_SYSTEM = `你是未成年人生成式 AI 交互安全风控分析器。只输出 JSON，不要输出 Markdown。

你必须遵守：
1. 不复述未成年人隐私原文。
2. 不生成违法、规避、攻击、自伤、色情等操作细节。
3. 只做风险识别、分级、摘要和保护性建议。

JSON Schema:
{
  "level": "未见明显风险|低风险|中风险|高风险",
  "score": 0-100,
  "action": "放行|提示并观察|提醒并限流|阻断并复核",
  "summary": "一句话脱敏摘要",
  "minorLikelihood": {
    "level": "confirmed_minor|likely_minor|possible_minor|unknown|adult_likely",
    "label": "已确认未成年人|高度疑似未成年人|可能是未成年人|未知|大概率成年人",
    "score": 0-100,
    "reasons": ["脱敏语义线索，例如校园身份线索、年龄表述"],
    "note": "说明这是概率判断，不是实名身份结论"
  },
  "categories": [
    {
      "id": "content|interaction|tool|data",
      "name": "AI 内容风险|AI 交互风险|AI 工具滥用风险|AI 数据风险",
      "score": 0-100,
      "level": "未见明显风险|低|中|高",
      "reason": "脱敏原因，不复述隐私",
      "hits": ["只放风险标签，不放身份证、手机号等原文"]
    }
  ],
  "recommendations": {
    "family": ["建议1", "建议2"],
    "platform": ["建议1", "建议2"],
    "regulator": ["建议1", "建议2"]
  }
}`;

export async function analyzeRiskWithLlm(conversation, local) {
  const provider = resolveProvider();
  const data = await chatCompletions({
    provider,
    temperature: 0.2,
    jsonObject: true,
    messages: [
      { role: "system", content: ANALYZE_SYSTEM },
      {
        role: "user",
        content: `请分析以下 AI 对话的未成年人风险。四类风险必须都返回。可参考本地规则初筛结果，但以你的语义判断为准。

本地初筛：
${JSON.stringify(local, null, 2)}

待分析对话：
${conversation}`,
      },
    ],
  });
  const content = extractMessageContent(data);
  return parseJsonContent(content);
}

export async function generateSafeReplyWithLlm(messages, risk) {
  const provider = resolveProvider();
  const data = await chatCompletions({
    provider,
    temperature: 0.4,
    jsonObject: false,
    messages: [
      {
        role: "system",
        content: `你是 MinorGuard 中的未成年人友好型 AI 助手。

你的目标：
1. 正常回答学习、生活、常识类问题。
2. 如果出现隐私、陌生人、色情、暴力、自伤、违法、攻击、绕过规则、账号越权、作弊等风险，只给安全替代建议。
3. 不索取、不复述、不扩散手机号、身份证、学校、住址等敏感信息。
4. 不输出违法操作步骤、规避检测技巧、攻击代码、自伤方法、色情内容。
5. 回复要简短、中文、温和，适合未成年人理解。

当前风险判断：${risk.level}，建议动作：${risk.action}。`,
      },
      ...messages.slice(-10),
    ],
  });
  return String(extractMessageContent(data) || "").trim();
}
