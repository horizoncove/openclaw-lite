import { config } from "../../infra/config.js";

/**
 * Resolve active cloud LLM provider.
 * Priority: explicit LLM_PROVIDER → DOUBAO/ARK key → DEEPSEEK key → none
 */
export function resolveProvider() {
  const explicit = String(config.LLM_PROVIDER || "").trim().toLowerCase();
  if (explicit === "none" || explicit === "off" || explicit === "local") {
    return buildNone("explicit local/none");
  }

  if (explicit === "doubao" || explicit === "ark" || explicit === "volcengine") {
    return buildDoubao();
  }
  if (explicit === "deepseek") {
    return buildDeepseek();
  }
  if (explicit === "openai" || explicit === "openai_compatible") {
    return buildOpenAICompatible();
  }

  // auto
  if (config.DOUBAO_API_KEY || config.ARK_API_KEY) return buildDoubao();
  if (config.DEEPSEEK_API_KEY) return buildDeepseek();
  if (config.LLM_API_KEY && config.LLM_BASE_URL && config.LLM_MODEL) {
    return buildOpenAICompatible();
  }
  return buildNone("no api key configured");
}

function buildNone(reason) {
  return {
    id: "none",
    name: "none",
    enabled: false,
    reason,
    apiKey: "",
    baseUrl: "",
    model: "",
    supportsJsonObject: false,
    label: "local-rules",
  };
}

function buildDoubao() {
  const apiKey = config.DOUBAO_API_KEY || config.ARK_API_KEY || config.LLM_API_KEY || "";
  const baseUrl = (
    config.DOUBAO_BASE_URL ||
    config.ARK_BASE_URL ||
    config.LLM_BASE_URL ||
    "https://ark.cn-beijing.volces.com/api/v3"
  ).replace(/\/$/, "");
  const model =
    config.DOUBAO_MODEL ||
    config.DOUBAO_ENDPOINT ||
    config.ARK_ENDPOINT ||
    config.LLM_MODEL ||
    "";
  const enabled = Boolean(config.CLOUD_LLM_ENABLED && apiKey && model);
  return {
    id: "doubao",
    name: "doubao",
    enabled,
    reason: !apiKey
      ? "missing DOUBAO_API_KEY/ARK_API_KEY"
      : !model
        ? "missing DOUBAO_MODEL (方舟推理接入点 Endpoint ID，如 ep-xxxx)"
        : enabled
          ? "ok"
          : "CLOUD_LLM_ENABLED=false",
    apiKey,
    baseUrl,
    model,
    // Ark generally supports json_object on recent chat models; client will fallback
    supportsJsonObject: config.LLM_JSON_MODE !== "false",
    label: `doubao:${model || "unset"}`,
  };
}

function buildDeepseek() {
  const apiKey = config.DEEPSEEK_API_KEY || config.LLM_API_KEY || "";
  const baseUrl = (config.DEEPSEEK_BASE_URL || config.LLM_BASE_URL || "https://api.deepseek.com").replace(
    /\/$/,
    "",
  );
  const model = config.DEEPSEEK_MODEL || config.LLM_MODEL || "deepseek-chat";
  const enabled = Boolean(config.CLOUD_LLM_ENABLED && apiKey);
  return {
    id: "deepseek",
    name: "deepseek",
    enabled,
    reason: !apiKey ? "missing DEEPSEEK_API_KEY" : enabled ? "ok" : "CLOUD_LLM_ENABLED=false",
    apiKey,
    baseUrl,
    model,
    supportsJsonObject: config.LLM_JSON_MODE !== "false",
    label: `deepseek:${model}`,
  };
}

function buildOpenAICompatible() {
  const apiKey = config.LLM_API_KEY || "";
  const baseUrl = (config.LLM_BASE_URL || "").replace(/\/$/, "");
  const model = config.LLM_MODEL || "";
  const enabled = Boolean(config.CLOUD_LLM_ENABLED && apiKey && baseUrl && model);
  return {
    id: "openai_compatible",
    name: "openai_compatible",
    enabled,
    reason: enabled ? "ok" : "need LLM_API_KEY + LLM_BASE_URL + LLM_MODEL",
    apiKey,
    baseUrl,
    model,
    supportsJsonObject: config.LLM_JSON_MODE !== "false",
    label: `openai_compatible:${model || "unset"}`,
  };
}

export function llmEnabled() {
  return resolveProvider().enabled;
}
