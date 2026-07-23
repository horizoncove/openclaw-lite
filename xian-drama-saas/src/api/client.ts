const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `请求失败 ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean }>("/health"),
  stats: () =>
    request<{
      members: number;
      openOrders: number;
      overseas: number;
      events: number;
      approvals: number;
      distributions: number;
      copyrights: number;
      ais: number;
    }>("/stats"),
  state: () => request<Omit<import("../types").AppState, "user">>("/state"),
  reset: () => request<unknown>("/reset", { method: "POST" }),
  login: (role: string) =>
    request<{ user: import("../types").User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ role }),
    }),
  members: {
    list: () => request<import("../types").Member[]>("/members"),
    save: (m: import("../types").Member) =>
      request<import("../types").Member>("/members", { method: "POST", body: JSON.stringify(m) }),
    update: (id: string, patch: Partial<import("../types").Member>) =>
      request<import("../types").Member>(`/members/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
  },
  events: {
    list: () => request<import("../types").EventItem[]>("/events"),
    save: (e: import("../types").EventItem) =>
      request<import("../types").EventItem>("/events", { method: "POST", body: JSON.stringify(e) }),
  },
  matches: {
    list: () => request<import("../types").MatchNeed[]>("/matches"),
    update: (id: string, patch: Partial<import("../types").MatchNeed>) =>
      request<import("../types").MatchNeed>(`/matches/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
  },
  orders: {
    list: () => request<import("../types").WorkOrder[]>("/orders"),
    save: (o: import("../types").WorkOrder) =>
      request<import("../types").WorkOrder>("/orders", { method: "POST", body: JSON.stringify(o) }),
    update: (id: string, patch: Partial<import("../types").WorkOrder>) =>
      request<import("../types").WorkOrder>(`/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
  },
  approvals: {
    list: () => request<import("../types").ApprovalCase[]>("/approvals"),
    update: (id: string, patch: Partial<import("../types").ApprovalCase>) =>
      request<import("../types").ApprovalCase>(`/approvals/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
  },
  overseas: {
    list: () => request<import("../types").OverseasProject[]>("/overseas"),
    update: (id: string, patch: Partial<import("../types").OverseasProject>) =>
      request<import("../types").OverseasProject>(`/overseas/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
  },
  distributions: {
    list: () => request<import("../types").DistributionCase[]>("/distributions"),
  },
  copyrights: {
    list: () => request<import("../types").CopyrightCase[]>("/copyrights"),
  },
  ais: {
    list: () => request<import("../types").AIProject[]>("/ais"),
  },
};
