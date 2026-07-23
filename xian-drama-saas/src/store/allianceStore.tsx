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
import { allianceApi } from "../api/client";
import { allianceSeed } from "../data/seed";
import type {
  AllianceRole,
  AllianceState,
  AllianceUser,
  EventItem,
  MatchNeed,
  Member,
  WorkOrder,
} from "../types";
import { ALLIANCE_ROLE_LABEL } from "../types";

const USER_KEY = "xian-drama-alliance-user";

type AllianceStore = AllianceState & {
  loading: boolean;
  apiOnline: boolean;
  login: (role: AllianceRole) => Promise<void>;
  logout: () => void;
  upsertMember: (m: Member) => Promise<void>;
  addEvent: (e: EventItem) => Promise<void>;
  updateMatch: (id: string, patch: Partial<MatchNeed>) => Promise<void>;
  upsertOrder: (o: WorkOrder) => Promise<void>;
  resetDemo: () => Promise<void>;
};

const Ctx = createContext<AllianceStore | null>(null);

function loadUser(): AllianceUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AllianceStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AllianceState>(() => ({
    ...allianceSeed(),
    user: loadUser(),
  }));
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      await allianceApi.health();
      setApiOnline(true);
      const data = await allianceApi.state();
      setState((s) => ({ ...data, user: s.user }));
    } catch {
      setApiOnline(false);
      setState((s) => ({ ...allianceSeed(), user: s.user }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const store = useMemo<AllianceStore>(
    () => ({
      ...state,
      loading,
      apiOnline,
      login: async (role) => {
        try {
          const { user } = await allianceApi.login(role);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          setState((s) => ({ ...s, user }));
        } catch {
          const fallback: AllianceUser = {
            id: `u-${role}`,
            name: ALLIANCE_ROLE_LABEL[role].split("/")[0].trim(),
            role,
            org: ALLIANCE_ROLE_LABEL[role],
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
            ? await allianceApi.members.update(m.id, m)
            : await allianceApi.members.save(m);
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
              members: exists ? s.members.map((x) => (x.id === m.id ? m : x)) : [m, ...s.members],
            };
          });
        }
      },
      addEvent: async (e) => {
        if (apiOnline) {
          const saved = await allianceApi.events.save(e);
          setState((s) => ({ ...s, events: [saved, ...s.events] }));
        } else {
          setState((s) => ({ ...s, events: [e, ...s.events] }));
        }
      },
      updateMatch: async (id, patch) => {
        if (apiOnline) {
          const saved = await allianceApi.matches.update(id, patch);
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
            ? await allianceApi.orders.update(o.id, o)
            : await allianceApi.orders.save(o);
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
          const data = (await allianceApi.reset()) as Omit<AllianceState, "user">;
          setState((s) => ({ ...data, user: s.user }));
        } else {
          setState((s) => ({ ...allianceSeed(), user: s.user }));
        }
      },
    }),
    [state, loading, apiOnline],
  );

  return createElement(Ctx.Provider, { value: store }, children);
}

export function useAllianceStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AllianceStoreProvider missing");
  return ctx;
}
