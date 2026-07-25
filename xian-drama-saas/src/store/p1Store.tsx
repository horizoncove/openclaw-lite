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
import { getStoredUser, p1Api, storeUser } from "../api/p1Client";
import type { P1User } from "../p1/types";

type P1Store = {
  user: P1User | null;
  loading: boolean;
  apiOnline: boolean;
  login: (userId: string) => Promise<void>;
  logout: () => void;
  refreshFlag: number;
  bump: () => void;
  resetDemo: () => Promise<void>;
};

const Ctx = createContext<P1Store | null>(null);

export function P1StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<P1User | null>(() => getStoredUser());
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const probe = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/health");
      setApiOnline(res.ok);
      if (user) {
        const me = await p1Api.me();
        setUser(me.user);
        storeUser(me.user);
      }
    } catch {
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    probe();
  }, [probe]);

  const value = useMemo<P1Store>(
    () => ({
      user,
      loading,
      apiOnline,
      refreshFlag,
      bump: () => setRefreshFlag((n) => n + 1),
      login: async (userId) => {
        const { user: u } = await p1Api.login(userId);
        storeUser(u);
        setUser(u);
      },
      logout: () => {
        storeUser(null);
        setUser(null);
      },
      resetDemo: async () => {
        if (user) await p1Api.reset();
        else {
          await fetch("/api/v1/reset", { method: "POST", headers: { "x-user-id": "u-wang" } });
        }
        setRefreshFlag((n) => n + 1);
      },
    }),
    [user, loading, apiOnline, refreshFlag],
  );

  return createElement(Ctx.Provider, { value }, children);
}

export function useP1Store() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("P1StoreProvider missing");
  return ctx;
}
