import type {
  AllianceRole,
  AllianceState,
  AllianceUser,
  ApprovalCase,
  CenterRole,
  CenterState,
  CenterUser,
  EventItem,
  IntakeRequest,
  LocalizationJob,
  MatchNeed,
  Member,
  OsProject,
  OverseasDeal,
  OverseasHubState,
  OverseasRole,
  OverseasUser,
  OverseasProject,
  SettlementRecord,
  WorkOrder,
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `请求失败 ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const allianceApi = {
  health: () => request<{ ok: boolean }>("/health"),
  state: () => request<Omit<AllianceState, "user">>("/alliance/state"),
  reset: () => request<unknown>("/alliance/reset", { method: "POST" }),
  stats: () =>
    request<{ members: number; openOrders: number; events: number; matches: number }>(
      "/alliance/stats",
    ),
  login: (role: AllianceRole) =>
    request<{ user: AllianceUser; token: string }>("/alliance/auth/login", {
      method: "POST",
      body: JSON.stringify({ role }),
    }),
  members: {
    save: (m: Member) =>
      request<Member>("/alliance/members", { method: "POST", body: JSON.stringify(m) }),
    update: (id: string, patch: Partial<Member>) =>
      request<Member>(`/alliance/members/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  },
  events: {
    save: (e: EventItem) =>
      request<EventItem>("/alliance/events", { method: "POST", body: JSON.stringify(e) }),
    update: (id: string, patch: Partial<EventItem>) =>
      request<EventItem>(`/alliance/events/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  },
  matches: {
    save: (m: MatchNeed) =>
      request<MatchNeed>("/alliance/matches", { method: "POST", body: JSON.stringify(m) }),
    update: (id: string, patch: Partial<MatchNeed>) =>
      request<MatchNeed>(`/alliance/matches/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  },
  orders: {
    save: (o: WorkOrder) =>
      request<WorkOrder>("/alliance/orders", { method: "POST", body: JSON.stringify(o) }),
    update: (id: string, patch: Partial<WorkOrder>) =>
      request<WorkOrder>(`/alliance/orders/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  },
};

export const centerApi = {
  health: () => request<{ ok: boolean }>("/health"),
  state: () => request<Omit<CenterState, "user">>("/center/state"),
  reset: () => request<unknown>("/center/reset", { method: "POST" }),
  stats: () =>
    request<{
      openOrders: number;
      approvals: number;
      overseas: number;
      distributions: number;
      copyrights: number;
      ais: number;
    }>("/center/stats"),
  login: (role: CenterRole) =>
    request<{ user: CenterUser; token: string }>("/center/auth/login", {
      method: "POST",
      body: JSON.stringify({ role }),
    }),
  approvals: {
    update: (id: string, patch: Partial<ApprovalCase>) =>
      request<ApprovalCase>(`/center/approvals/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
  },
  overseas: {
    update: (id: string, patch: Partial<OverseasProject>) =>
      request<OverseasProject>(`/center/overseas/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
  },
  orders: {
    save: (o: WorkOrder) =>
      request<WorkOrder>("/center/orders", { method: "POST", body: JSON.stringify(o) }),
    update: (id: string, patch: Partial<WorkOrder>) =>
      request<WorkOrder>(`/center/orders/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  },
};

export const overseasApi = {
  health: () => request<{ ok: boolean }>("/health"),
  state: () => request<Omit<OverseasHubState, "user">>("/overseas/state"),
  reset: () => request<unknown>("/overseas/reset", { method: "POST" }),
  stats: () =>
    request<{
      projects: number;
      activeProjects: number;
      localizations: number;
      platforms: number;
      openDeals: number;
      pendingSettlements: number;
      openIntakes: number;
    }>("/overseas/stats"),
  login: (role: OverseasRole) =>
    request<{ user: OverseasUser; token: string }>("/overseas/auth/login", {
      method: "POST",
      body: JSON.stringify({ role }),
    }),
  projects: {
    save: (p: OsProject) =>
      request<OsProject>("/overseas/projects", { method: "POST", body: JSON.stringify(p) }),
    update: (id: string, patch: Partial<OsProject>) =>
      request<OsProject>(`/overseas/projects/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  },
  localizations: {
    update: (id: string, patch: Partial<LocalizationJob>) =>
      request<LocalizationJob>(`/overseas/localizations/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
  },
  deals: {
    update: (id: string, patch: Partial<OverseasDeal>) =>
      request<OverseasDeal>(`/overseas/deals/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  },
  settlements: {
    update: (id: string, patch: Partial<SettlementRecord>) =>
      request<SettlementRecord>(`/overseas/settlements/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
  },
  intakes: {
    save: (i: IntakeRequest) =>
      request<IntakeRequest>("/overseas/intakes", { method: "POST", body: JSON.stringify(i) }),
    update: (id: string, patch: Partial<IntakeRequest>) =>
      request<IntakeRequest>(`/overseas/intakes/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
  },
};
