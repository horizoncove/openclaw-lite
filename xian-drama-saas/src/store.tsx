import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api as apiClient } from "./api/client";
import { seedState } from "./data/seed";
import type {
  AppState,
  ApprovalCase,
  EventItem,
  MatchNeed,
  Member,
  OverseasProject,
  Role,
  User,
  WorkOrder,
} from "./types";
import { ROLE_LABEL } from "./types";

const USER_KEY = "xian-drama-saas-user";

type Store = AppState & {
  loading: boolean;
  apiOnline: boolean;
  refresh: () => Promise<void>;
  login: (role: Role) => Promise<void>;
  logout: () => void;
  upsertMember: (m: Member) => Promise<void>;
  addEvent: (e: EventItem) => Promise<void>;
  updateMatch: (id: string, patch: Partial<MatchNeed>) => Promise<void>;
  upsertOrder: (o: WorkOrder) => Promise<void>;
  updateApproval: (id: string, patch: Partial<ApprovalCase>) => Promise<void>;
  updateOverseas: (id: string, patch: Partial<OverseasProject>) => Promise<void>;
  resetDemo: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const { user: _u, ...rest } = seedState();
    return { ...rest, user: loadUser() };
  });
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      await apiClient.health();
      setApiOnline(true);
      const data = await apiClient.state();
      setState((s) => ({ ...data, user: s.user }));
    } catch {
      setApiOnline(false);
      const { user: _u, ...rest } = seedState();
      setState((s) => ({ ...rest, user: s.user }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const store = useMemo<Store>(
    () => ({
      ...state,
      loading,
      apiOnline,
      refresh,
      login: async (role) => {
        try {
          const { user } = await apiClient.login(role);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          setState((s) => ({ ...s, user }));
        } catch {
          const fallback: User = {
            id: `u-${role}`,
            name: ROLE_LABEL[role].split("/")[0].trim(),
            role,
            org: ROLE_LABEL[role],
          };
          localStorage.setItem(USER_KEY, JSON.stringify(fallback));
          setState((s) => ({ ...s, user: fallback }));
        }
      },
      logout: () => {
        localStorage.removeItem(USER_KEY);
        setState((s) => ({ ...s, user: null }));
      },
      upsertMember: async (m) => {
        if (apiOnline) {
          const saved = state.members.some((x) => x.id === m.id)
            ? await apiClient.members.update(m.id, m)
            : await apiClient.members.save(m);
          setState((s) => ({
            ...s,
            members: s.members.some((x) => x.id === m.id)
              ? s.members.map((x) => (x.id === m.id ? saved : x))
              : [saved, ...s.members],
          }));
        } else {
          setState((s) => {
            const exists = s.members.some((x) => x.id === m.id);
            return {
              ...s,
              members: exists
                ? s.members.map((x) => (x.id === m.id ? m : x))
                : [m, ...s.members],
            };
          });
        }
      },
      addEvent: async (e) => {
        if (apiOnline) {
          const saved = await apiClient.events.save(e);
          setState((s) => ({ ...s, events: [saved, ...s.events] }));
        } else {
          setState((s) => ({ ...s, events: [e, ...s.events] }));
        }
      },
      updateMatch: async (id, patch) => {
        if (apiOnline) {
          const saved = await apiClient.matches.update(id, patch);
          setState((s) => ({
            ...s,
            matches: s.matches.map((x) => (x.id === id ? saved : x)),
          }));
        } else {
          setState((s) => ({
            ...s,
            matches: s.matches.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }));
        }
      },
      upsertOrder: async (o) => {
        if (apiOnline) {
          const saved = state.orders.some((x) => x.id === o.id)
            ? await apiClient.orders.update(o.id, o)
            : await apiClient.orders.save(o);
          setState((s) => ({
            ...s,
            orders: s.orders.some((x) => x.id === o.id)
              ? s.orders.map((x) => (x.id === o.id ? saved : x))
              : [saved, ...s.orders],
          }));
        } else {
          setState((s) => {
            const exists = s.orders.some((x) => x.id === o.id);
            return {
              ...s,
              orders: exists
                ? s.orders.map((x) => (x.id === o.id ? o : x))
                : [o, ...s.orders],
            };
          });
        }
      },
      updateApproval: async (id, patch) => {
        if (apiOnline) {
          const saved = await apiClient.approvals.update(id, patch);
          setState((s) => ({
            ...s,
            approvals: s.approvals.map((x) => (x.id === id ? saved : x)),
          }));
        } else {
          setState((s) => ({
            ...s,
            approvals: s.approvals.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }));
        }
      },
      updateOverseas: async (id, patch) => {
        if (apiOnline) {
          const saved = await apiClient.overseas.update(id, patch);
          setState((s) => ({
            ...s,
            overseas: s.overseas.map((x) => (x.id === id ? saved : x)),
          }));
        } else {
          setState((s) => ({
            ...s,
            overseas: s.overseas.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }));
        }
      },
      resetDemo: async () => {
        if (apiOnline) {
          const data = (await apiClient.reset()) as Omit<AppState, "user">;
          setState((s) => ({ ...data, user: s.user }));
        } else {
          const { user: _u, ...rest } = seedState();
          setState((s) => ({ ...rest, user: s.user }));
        }
      },
    }),
    [state, loading, apiOnline, refresh],
  );

  return createElement(Ctx.Provider, { value: store }, children);
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("StoreProvider missing");
  return ctx;
}

export function roleName(role: Role) {
  return ROLE_LABEL[role];
}
