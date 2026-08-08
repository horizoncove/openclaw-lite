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
import { allianceApi, getAllianceToken, setAllianceToken } from "../api/client";
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

const USER_KEY = "xian-drama-alliance-user";
const ALLOW_OFFLINE =
  import.meta.env.VITE_ALLOW_OFFLINE_AUTH === "1" ||
  import.meta.env.VITE_ALLOW_OFFLINE_AUTH === "true";

type AllianceStore = AllianceState & {
  loading: boolean;
  apiOnline: boolean;
  login: (role: AllianceRole) => Promise<void>;
  logout: () => void;
  upsertMember: (m: Member) => Promise<void>;
  addEvent: (e: EventItem) => Promise<void>;
  updateEvent: (id: string, patch: Partial<EventItem>) => Promise<void>;
  addMatch: (m: MatchNeed) => Promise<void>;
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
      if (!getAllianceToken()) {
        setState({ ...allianceSeed(), user: null });
        return;
      }
      try {
        const { user } = await allianceApi.me();
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        const data = await allianceApi.state();
        setState({ ...data, user });
      } catch {
        // forged / expired session
        setAllianceToken(null);
        localStorage.removeItem(USER_KEY);
        setState({ ...allianceSeed(), user: null });
      }
    } catch {
      setApiOnline(false);
      if (!ALLOW_OFFLINE) {
        setAllianceToken(null);
        localStorage.removeItem(USER_KEY);
        setState({ ...allianceSeed(), user: null });
      } else {
        setState((s) => ({ ...allianceSeed(), user: s.user }));
      }
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
        const { user, token } = await allianceApi.login(role);
        setAllianceToken(token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        setApiOnline(true);
        try {
          const data = await allianceApi.state();
          setState({ ...data, user });
        } catch {
          setState((s) => ({ ...s, user }));
        }
      },
      logout: () => {
        setAllianceToken(null);
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
      updateEvent: async (id, patch) => {
        if (apiOnline) {
          const saved = await allianceApi.events.update(id, patch);
          setState((s) => ({
            ...s,
            events: s.events.map((x) => (x.id === id ? saved : x)),
          }));
        } else {
          setState((s) => ({
            ...s,
            events: s.events.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }));
        }
      },
      addMatch: async (m) => {
        if (apiOnline) {
          const saved = await allianceApi.matches.save(m);
          setState((s) => ({ ...s, matches: [saved, ...s.matches] }));
        } else {
          setState((s) => ({ ...s, matches: [m, ...s.matches] }));
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
