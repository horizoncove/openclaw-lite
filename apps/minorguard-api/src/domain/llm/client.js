import { config } from "../../infra/config.js";
import { resolveProvider } from "./providers.js";

/**
 * OpenAI-compatible chat.completions call (DeepSeek / 豆包方舟 / others).
 */
export async function chatCompletions({
  messages,
  temperature = 0.2,
  jsonObject = false,
  timeoutMs = config.LLM_TIMEOUT_MS,
  provider: providerOverride,
} = {}) {
  const provider = providerOverride || resolveProvider();
  if (!provider.enabled) {
    const err = new Error(`LLM provider unavailable: ${provider.reason}`);
    err.code = "LLM_DISABLED";
    throw err;
  }

  const url = `${provider.baseUrl}/chat/completions`;
  const body = {
    model: provider.model,
    temperature,
    messages,
  };

  const tryJson = Boolean(jsonObject && provider.supportsJsonObject);
  if (tryJson) body.response_format = { type: "json_object" };

  try {
    return await postChat(url, provider.apiKey, body, timeoutMs, provider.id);
  } catch (error) {
    // Some Ark endpoints reject response_format — retry without it.
    if (tryJson && isFormatRejected(error)) {
      delete body.response_format;
      return await postChat(url, provider.apiKey, body, timeoutMs, provider.id);
    }
    throw error;
  }
}

async function postChat(url, apiKey, body, timeoutMs, providerId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      const err = new Error(`${providerId} HTTP ${response.status}: ${text.slice(0, 400)}`);
      err.status = response.status;
      err.body = text;
      throw err;
    }
    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      const err = new Error(`${providerId} timeout after ${timeoutMs}ms`);
      err.code = "LLM_TIMEOUT";
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function isFormatRejected(error) {
  const msg = String(error?.message || error?.body || "");
  return /response_format|json_object|unsupported|invalid_request/i.test(msg);
}

export function extractMessageContent(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (content == null) return "";
  if (typeof content === "string") return content;
  // multimodal content array
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("");
  }
  return String(content);
}

export function parseJsonContent(content) {
  const raw = String(content || "").trim();
  if (!raw) throw new Error("LLM 返回内容为空");
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim());
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error("LLM 返回非 JSON");
  }
}
