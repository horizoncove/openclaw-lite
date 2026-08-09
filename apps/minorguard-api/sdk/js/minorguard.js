/**
 * MinorGuard lightweight client (Node 18+ / modern browsers with fetch).
 *
 * @example
 * import { MinorGuardClient } from './minorguard.js';
 * const mg = new MinorGuardClient({ baseUrl: 'http://127.0.0.1:5178', apiToken: process.env.MINORGUARD_API_TOKEN });
 * const risk = await mg.analyze('用户：…', { save: false });
 */

export class MinorGuardClient {
  /**
   * @param {{ baseUrl: string, apiToken?: string, adminToken?: string, fetchImpl?: typeof fetch }} opts
   */
  constructor(opts) {
    if (!opts?.baseUrl) throw new Error("baseUrl required");
    this.baseUrl = String(opts.baseUrl).replace(/\/$/, "");
    this.apiToken = opts.apiToken || "";
    this.adminToken = opts.adminToken || "";
    this.fetchImpl = opts.fetchImpl || globalThis.fetch.bind(globalThis);
  }

  async health() {
    return this.#request("GET", "/api/v1/health");
  }

  /** @param {string} conversation @param {{ save?: boolean, source?: string }} [opts] */
  async analyze(conversation, opts = {}) {
    return this.#request("POST", "/api/v1/analyze", {
      conversation,
      save: opts.save,
      source: opts.source,
    });
  }

  /** @param {string} conversation */
  async localAnalyze(conversation) {
    return this.#request("POST", "/api/v1/local-analyze", { conversation });
  }

  /**
   * @param {{ role: 'user'|'assistant', content: string }[]} messages
   * @param {{ save?: boolean, source?: string }} [opts]
   */
  async chat(messages, opts = {}) {
    return this.#request("POST", "/api/v1/chat", {
      messages,
      save: opts.save,
      source: opts.source,
    });
  }

  /** Map actionCode to a coarse app decision. */
  static decide(actionCode) {
    switch (actionCode) {
      case "block_review":
        return { allowReply: false, showWarning: true, review: true };
      case "throttle":
        return { allowReply: true, showWarning: true, review: false, limitFollowUp: true };
      case "observe":
        return { allowReply: true, showWarning: true, review: false };
      default:
        return { allowReply: true, showWarning: false, review: false };
    }
  }

  async #request(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (this.apiToken) headers.Authorization = `Bearer ${this.apiToken}`;
    if (this.adminToken) headers["x-admin-token"] = this.adminToken;
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || data.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  }
}

export default MinorGuardClient;
