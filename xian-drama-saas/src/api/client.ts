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
  MemberWork,
  PayMechanism,
  Venue,
  OverseasProject,
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
  works: {
    save: (w: MemberWork) =>
      request<MemberWork>("/alliance/works", { method: "POST", body: JSON.stringify(w) }),
    update: (id: string, patch: Partial<MemberWork>) =>
      request<MemberWork>(`/alliance/works/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  },
  venues: {
    update: (id: string, patch: Partial<Venue>) =>
      request<Venue>(`/alliance/venues/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  },
  deals: {
    close: (body: {
      matchId: string;
      supplierOrg?: string;
      sceneId?: string;
      bidId?: string;
      payMechanism?: PayMechanism;
      payMechanismSource?: "buyer" | "supplier" | "negotiated";
      payMechanismNote?: string;
      budgetOverride?: number;
    }) =>
      request<Omit<AllianceState, "user">>("/alliance/deals/close", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    consume: (
      id: string,
      body: { amount: number; actor?: string; note?: string; model?: string },
    ) =>
      request<Omit<AllianceState, "user">>(`/alliance/deals/${id}/consume`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    settle: (id: string) =>
      request<Omit<AllianceState, "user">>(`/alliance/deals/${id}/settle`, { method: "POST" }),
    confirm: (id: string, body: { side: "buyer" | "supplier"; actor?: string }) =>
      request<Omit<AllianceState, "user">>(`/alliance/deals/${id}/confirm`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  bids: {
    place: (body: {
      matchId: string;
      supplierOrg: string;
      acceptBuyerMechanism?: boolean;
      proposedPayMechanism: PayMechanism;
      note?: string;
      quoteTokens?: number;
    }) =>
      request<Omit<AllianceState, "user">>("/alliance/bids", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    review: (id: string, action: "accept" | "reject" | "withdraw") =>
      request<Omit<AllianceState, "user">>(`/alliance/bids/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
  },
  disputes: {
    raise: (body: {
      dealId: string;
      raisedBy?: string;
      raisedRole?: "buyer" | "supplier" | "broker";
      reason: string;
      claimTokens?: number;
    }) =>
      request<Omit<AllianceState, "user">>("/alliance/disputes", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    decide: (
      id: string,
      body: {
        decision: string;
        decidedBy?: string;
        adjustBuyerRefund?: number;
        adjustSupplierClawback?: number;
      },
    ) =>
      request<Omit<AllianceState, "user">>(`/alliance/disputes/${id}/decide`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  wallets: {
    topup: (body: { org: string; amount: number }) =>
      request<{ org: string; balance: number; locked?: number; credited: number }>(
        "/alliance/wallets/topup",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),
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
  tokens: {
    get: () =>
      request<{
        tokenModels: CenterState["tokenModels"];
        tokenPackages: CenterState["tokenPackages"];
        tokenWallet: CenterState["tokenWallet"];
      }>("/center/tokens"),
    purchase: (packageId: string) =>
      request<{
        tokenWallet: CenterState["tokenWallet"];
        tokenModels: CenterState["tokenModels"];
        tokenPackages: CenterState["tokenPackages"];
      }>("/center/tokens/purchase", { method: "POST", body: JSON.stringify({ packageId }) }),
    regenerateKey: () =>
      request<{ apiKey: string; tokenWallet: CenterState["tokenWallet"] }>(
        "/center/tokens/regenerate-key",
        { method: "POST" },
      ),
  },
};
