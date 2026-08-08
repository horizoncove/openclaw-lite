import type {
  AllianceRole,
  AllianceState,
  AllianceUser,
  ApprovalCase,
  CenterRole,
  CenterState,
  CenterUser,
  EventItem,
  MatchNeed,
  Member,
  OverseasProject,
  WorkOrder,
} from "../types";

const ALLIANCE_TOKEN_KEY = "xian-drama-alliance-token";
const CENTER_TOKEN_KEY = "xian-drama-center-token";

export function getAllianceToken(): string | null {
  return localStorage.getItem(ALLIANCE_TOKEN_KEY);
}
export function setAllianceToken(token: string | null) {
  if (token) localStorage.setItem(ALLIANCE_TOKEN_KEY, token);
  else localStorage.removeItem(ALLIANCE_TOKEN_KEY);
}
export function getCenterToken(): string | null {
  return localStorage.getItem(CENTER_TOKEN_KEY);
}
export function setCenterToken(token: string | null) {
  if (token) localStorage.setItem(CENTER_TOKEN_KEY, token);
  else localStorage.removeItem(CENTER_TOKEN_KEY);
}

type Portal = "alliance" | "center";

async function request<T>(path: string, init?: RequestInit, portal?: Portal): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (portal === "alliance") {
    const t = getAllianceToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  } else if (portal === "center") {
    const t = getCenterToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`/api${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `请求失败 ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const allianceApi = {
  health: () => request<{ ok: boolean; auth?: { accessCodeRequired?: boolean } }>("/health"),
  state: () => request<Omit<AllianceState, "user">>("/alliance/state", undefined, "alliance"),
  me: () => request<{ user: AllianceUser }>("/alliance/auth/me", undefined, "alliance"),
  reset: () => request<unknown>("/alliance/reset", { method: "POST" }, "alliance"),
  stats: () =>
    request<{ members: number; openOrders: number; events: number; matches: number }>(
      "/alliance/stats",
      undefined,
      "alliance",
    ),
  login: (role: AllianceRole, code?: string) =>
    request<{ user: AllianceUser; token: string }>("/alliance/auth/login", {
      method: "POST",
      body: JSON.stringify({ role, code }),
    }),
  members: {
    save: (m: Member) =>
      request<Member>("/alliance/members", { method: "POST", body: JSON.stringify(m) }, "alliance"),
    update: (id: string, patch: Partial<Member>) =>
      request<Member>(
        `/alliance/members/${id}`,
        { method: "PUT", body: JSON.stringify(patch) },
        "alliance",
      ),
  },
  events: {
    save: (e: EventItem) =>
      request<EventItem>("/alliance/events", { method: "POST", body: JSON.stringify(e) }, "alliance"),
    update: (id: string, patch: Partial<EventItem>) =>
      request<EventItem>(
        `/alliance/events/${id}`,
        { method: "PUT", body: JSON.stringify(patch) },
        "alliance",
      ),
  },
  matches: {
    save: (m: MatchNeed) =>
      request<MatchNeed>(
        "/alliance/matches",
        { method: "POST", body: JSON.stringify(m) },
        "alliance",
      ),
    update: (id: string, patch: Partial<MatchNeed>) =>
      request<MatchNeed>(
        `/alliance/matches/${id}`,
        { method: "PUT", body: JSON.stringify(patch) },
        "alliance",
      ),
  },
  orders: {
    save: (o: WorkOrder) =>
      request<WorkOrder>(
        "/alliance/orders",
        { method: "POST", body: JSON.stringify(o) },
        "alliance",
      ),
    update: (id: string, patch: Partial<WorkOrder>) =>
      request<WorkOrder>(
        `/alliance/orders/${id}`,
        { method: "PUT", body: JSON.stringify(patch) },
        "alliance",
      ),
  },
};

export const centerApi = {
  health: () => request<{ ok: boolean; auth?: { accessCodeRequired?: boolean } }>("/health"),
  state: () => request<Omit<CenterState, "user">>("/center/state", undefined, "center"),
  me: () => request<{ user: CenterUser }>("/center/auth/me", undefined, "center"),
  reset: () => request<unknown>("/center/reset", { method: "POST" }, "center"),
  stats: () =>
    request<{
      openOrders: number;
      approvals: number;
      overseas: number;
      distributions: number;
      copyrights: number;
      ais: number;
    }>("/center/stats", undefined, "center"),
  login: (role: CenterRole, code?: string) =>
    request<{ user: CenterUser; token: string }>("/center/auth/login", {
      method: "POST",
      body: JSON.stringify({ role, code }),
    }),
  approvals: {
    update: (id: string, patch: Partial<ApprovalCase>) =>
      request<ApprovalCase>(
        `/center/approvals/${id}`,
        { method: "PUT", body: JSON.stringify(patch) },
        "center",
      ),
  },
  overseas: {
    update: (id: string, patch: Partial<OverseasProject>) =>
      request<OverseasProject>(
        `/center/overseas/${id}`,
        { method: "PUT", body: JSON.stringify(patch) },
        "center",
      ),
  },
  orders: {
    save: (o: WorkOrder) =>
      request<WorkOrder>("/center/orders", { method: "POST", body: JSON.stringify(o) }, "center"),
    update: (id: string, patch: Partial<WorkOrder>) =>
      request<WorkOrder>(
        `/center/orders/${id}`,
        { method: "PUT", body: JSON.stringify(patch) },
        "center",
      ),
  },
};
