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
import { centerApi } from "../api/client";
import { centerSeed } from "../data/seed";
import type {
  ApprovalCase,
  CenterRole,
  CenterState,
  CenterUser,
  OverseasProject,
  WorkOrder,
} from "../types";
import { CENTER_ROLE_LABEL } from "../types";

const USER_KEY = "xian-drama-center-user";

type CenterStore = CenterState & {
  loading: boolean;
  apiOnline: boolean;
  login: (role: CenterRole) => Promise<void>;
  logout: () => void;
  updateApproval: (id: string, patch: Partial<ApprovalCase>) => Promise<void>;
  updateOverseas: (id: string, patch: Partial<OverseasProject>) => Promise<void>;
  upsertOrder: (o: WorkOrder) => Promise<void>;
  resetDemo: () => Promise<void>;
};

const Ctx = createContext<CenterStore | null>(null);

function loadUser(): CenterUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function CenterStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CenterState>(() => ({
    ...centerSeed(),
    user: loadUser(),
  }));
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      await centerApi.health();
      setApiOnline(true);
      const data = await centerApi.state();
      setState((s) => ({ ...data, user: s.user }));
    } catch {
      setApiOnline(false);
      setState((s) => ({ ...centerSeed(), user: s.user }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const store = useMemo<CenterStore>(
    () => ({
      ...state,
      loading,
      apiOnline,
      login: async (role) => {
        try {
          const { user } = await centerApi.login(role);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          setState((s) => ({ ...s, user }));
        } catch {
          const fallback: CenterUser = {
            id: `u-${role}`,
            name: CENTER_ROLE_LABEL[role].split("/")[0].trim(),
            role,
            org: CENTER_ROLE_LABEL[role],
          };
          localStorage.setItem(USER_KEY, JSON.stringify(fallback));
          setState((s) => ({ ...s, user: fallback }));
        }
      },
      logout: () => {
        localStorage.removeItem(USER_KEY);
        setState((s) => ({ ...s, user: null }));
      },
      updateApproval: async (id, patch) => {
        if (apiOnline) {
          const saved = await centerApi.approvals.update(id, patch);
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
          const saved = await centerApi.overseas.update(id, patch);
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
      upsertOrder: async (o) => {
        if (apiOnline) {
          const saved = state.orders.some((x) => x.id === o.id)
            ? await centerApi.orders.update(o.id, o)
            : await centerApi.orders.save(o);
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
              orders: exists ? s.orders.map((x) => (x.id === o.id ? o : x)) : [o, ...s.orders],
            };
          });
        }
      },
      resetDemo: async () => {
        if (apiOnline) {
          const data = (await centerApi.reset()) as Omit<CenterState, "user">;
          setState((s) => ({ ...data, user: s.user }));
        } else {
          setState((s) => ({ ...centerSeed(), user: s.user }));
        }
      },
    }),
    [state, loading, apiOnline],
  );

  return createElement(Ctx.Provider, { value: store }, children);
}

export function useCenterStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("CenterStoreProvider missing");
  return ctx;
}
