import type {
  P1ComputeJob,
  P1Demand,
  P1Notice,
  P1Opportunity,
  P1Project,
  P1Task,
  P1User,
  P1Wallet,
  P1LedgerEntry,
  P1Package,
  P1Model,
  P1DemandApplication,
} from "../p1/types";

const USER_KEY = "xian-drama-p1-user";

async function request<T>(path: string, init?: RequestInit & { userId?: string }): Promise<T> {
  const userId = init?.userId || getStoredUserId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (userId) headers["x-user-id"] = userId;
  const res = await fetch(`/api/v1${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || err.error || `请求失败 ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getStoredUserId(): string | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as P1User).id : null;
  } catch {
    return null;
  }
}

export function getStoredUser(): P1User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeUser(user: P1User | null) {
  if (!user) localStorage.removeItem(USER_KEY);
  else localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export const p1Api = {
  listUsers: () =>
    request<{ id: string; name: string; role: string; orgName: string; email: string }[]>(
      "/auth/users",
      { method: "GET", userId: "u-wang" },
    ),
  login: async (userId: string) => {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error("登录失败");
    return res.json() as Promise<{ user: P1User; token: string }>;
  },
  reset: () => request<unknown>("/reset", { method: "POST" }),
  me: () => request<{ user: P1User }>("/me"),
  workspace: () => request<Record<string, unknown>>("/workspace/summary"),
  projects: {
    list: () => request<P1Project[]>("/projects"),
    create: (body: Partial<P1Project>) =>
      request<P1Project>("/projects", { method: "POST", body: JSON.stringify(body) }),
    patch: (id: string, body: Partial<P1Project>) =>
      request<P1Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },
  tasks: {
    list: (q?: string) => request<P1Task[]>(`/tasks${q || ""}`),
    create: (body: Partial<P1Task>) =>
      request<P1Task>("/tasks", { method: "POST", body: JSON.stringify(body) }),
    patch: (id: string, body: Partial<P1Task>) =>
      request<P1Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },
  demands: {
    list: (scope = "plaza") => request<P1Demand[]>(`/demands?scope=${scope}`),
    create: (body: Partial<P1Demand> & { publish?: boolean }) =>
      request<P1Demand>("/demands", { method: "POST", body: JSON.stringify(body) }),
    patch: (id: string, body: Partial<P1Demand>) =>
      request<P1Demand>(`/demands/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    applications: (id: string) => request<P1DemandApplication[]>(`/demands/${id}/applications`),
    apply: (id: string, message: string) =>
      request<P1DemandApplication>(`/demands/${id}/apply`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    confirm: (id: string, applicationId: string) =>
      request<unknown>(`/demands/${id}/confirm`, {
        method: "POST",
        body: JSON.stringify({ applicationId }),
      }),
  },
  opportunities: {
    list: () => request<P1Opportunity[]>("/opportunities"),
    interest: (id: string, note: string) =>
      request<unknown>(`/opportunities/${id}/interest`, {
        method: "POST",
        body: JSON.stringify({ note }),
      }),
  },
  notices: {
    list: () => request<(P1Notice & { read: boolean })[]>("/notices"),
    read: (id: string) => request<unknown>(`/notices/${id}/read`, { method: "POST" }),
    publish: (body: Partial<P1Notice>) =>
      request<P1Notice>("/notices", { method: "POST", body: JSON.stringify(body) }),
  },
  wallet: {
    get: () =>
      request<{
        wallet: P1Wallet;
        ledger: P1LedgerEntry[];
        packages: P1Package[];
        models: P1Model[];
      }>("/wallet"),
    purchase: (packageId: string) =>
      request<{ wallet: P1Wallet; credited: number }>("/wallet/purchase", {
        method: "POST",
        body: JSON.stringify({ packageId }),
      }),
    rotateKey: () =>
      request<{ apiKey: string }>("/wallet/rotate-key", { method: "POST" }),
  },
  compute: {
    list: () => request<P1ComputeJob[]>("/compute/jobs"),
    create: (body: Partial<P1ComputeJob>) =>
      request<P1ComputeJob>("/compute/jobs", { method: "POST", body: JSON.stringify(body) }),
    transition: (id: string, status: string, error?: string) =>
      request<P1ComputeJob>(`/compute/jobs/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({ status, error }),
      }),
  },
  models: () => request<P1Model[]>("/models"),
  supervision: () => request<Record<string, unknown>>("/supervision/overview"),
};
