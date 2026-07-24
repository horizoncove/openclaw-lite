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
import { overseasApi } from "../api/client";
import { overseasSeed } from "../data/overseasSeed";
import type {
  IntakeRequest,
  LocalizationJob,
  OsProject,
  OverseasDeal,
  OverseasHubState,
  OverseasRole,
  OverseasUser,
  SettlementRecord,
} from "../types";
import { OVERSEAS_ROLE_LABEL } from "../types";

const USER_KEY = "xian-drama-overseas-user";

type OverseasStore = OverseasHubState & {
  loading: boolean;
  apiOnline: boolean;
  login: (role: OverseasRole) => Promise<void>;
  logout: () => void;
  updateProject: (id: string, patch: Partial<OsProject>) => Promise<void>;
  saveProject: (p: OsProject) => Promise<void>;
  updateLocalization: (id: string, patch: Partial<LocalizationJob>) => Promise<void>;
  updateDeal: (id: string, patch: Partial<OverseasDeal>) => Promise<void>;
  updateSettlement: (id: string, patch: Partial<SettlementRecord>) => Promise<void>;
  updateIntake: (id: string, patch: Partial<IntakeRequest>) => Promise<void>;
  saveIntake: (i: IntakeRequest) => Promise<void>;
  resetDemo: () => Promise<void>;
};

const Ctx = createContext<OverseasStore | null>(null);

function loadUser(): OverseasUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function OverseasStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OverseasHubState>(() => ({
    ...overseasSeed(),
    user: loadUser(),
  }));
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      await overseasApi.health();
      setApiOnline(true);
      const data = await overseasApi.state();
      setState((s) => ({ ...data, user: s.user }));
    } catch {
      setApiOnline(false);
      setState((s) => ({ ...overseasSeed(), user: s.user }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const store = useMemo<OverseasStore>(
    () => ({
      ...state,
      loading,
      apiOnline,
      login: async (role) => {
        try {
          const { user } = await overseasApi.login(role);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          setState((s) => ({ ...s, user }));
        } catch {
          const fallback: OverseasUser = {
            id: `os-${role}`,
            name: role === "ops" ? "韩磊" : "王敏",
            role,
            org: OVERSEAS_ROLE_LABEL[role],
          };
          localStorage.setItem(USER_KEY, JSON.stringify(fallback));
          setState((s) => ({ ...s, user: fallback }));
        }
      },
      logout: () => {
        localStorage.removeItem(USER_KEY);
        setState((s) => ({ ...s, user: null }));
      },
      updateProject: async (id, patch) => {
        if (apiOnline) {
          const saved = await overseasApi.projects.update(id, patch);
          setState((s) => ({
            ...s,
            projects: s.projects.map((x) => (x.id === id ? saved : x)),
          }));
        } else {
          setState((s) => ({
            ...s,
            projects: s.projects.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }));
        }
      },
      saveProject: async (p) => {
        if (apiOnline) {
          const saved = await overseasApi.projects.save(p);
          setState((s) => ({
            ...s,
            projects: s.projects.some((x) => x.id === p.id)
              ? s.projects.map((x) => (x.id === p.id ? saved : x))
              : [saved, ...s.projects],
          }));
        } else {
          setState((s) => ({
            ...s,
            projects: s.projects.some((x) => x.id === p.id)
              ? s.projects.map((x) => (x.id === p.id ? p : x))
              : [p, ...s.projects],
          }));
        }
      },
      updateLocalization: async (id, patch) => {
        if (apiOnline) {
          const saved = await overseasApi.localizations.update(id, patch);
          setState((s) => ({
            ...s,
            localizations: s.localizations.map((x) => (x.id === id ? saved : x)),
          }));
        } else {
          setState((s) => ({
            ...s,
            localizations: s.localizations.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }));
        }
      },
      updateDeal: async (id, patch) => {
        if (apiOnline) {
          const saved = await overseasApi.deals.update(id, patch);
          setState((s) => ({
            ...s,
            deals: s.deals.map((x) => (x.id === id ? saved : x)),
          }));
        } else {
          setState((s) => ({
            ...s,
            deals: s.deals.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }));
        }
      },
      updateSettlement: async (id, patch) => {
        if (apiOnline) {
          const saved = await overseasApi.settlements.update(id, patch);
          setState((s) => ({
            ...s,
            settlements: s.settlements.map((x) => (x.id === id ? saved : x)),
          }));
        } else {
          setState((s) => ({
            ...s,
            settlements: s.settlements.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }));
        }
      },
      updateIntake: async (id, patch) => {
        if (apiOnline) {
          const saved = await overseasApi.intakes.update(id, patch);
          setState((s) => ({
            ...s,
            intakes: s.intakes.map((x) => (x.id === id ? saved : x)),
          }));
        } else {
          setState((s) => ({
            ...s,
            intakes: s.intakes.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }));
        }
      },
      saveIntake: async (i) => {
        if (apiOnline) {
          const saved = await overseasApi.intakes.save(i);
          setState((s) => ({
            ...s,
            intakes: s.intakes.some((x) => x.id === i.id)
              ? s.intakes.map((x) => (x.id === i.id ? saved : x))
              : [saved, ...s.intakes],
          }));
        } else {
          setState((s) => ({
            ...s,
            intakes: s.intakes.some((x) => x.id === i.id)
              ? s.intakes.map((x) => (x.id === i.id ? i : x))
              : [i, ...s.intakes],
          }));
        }
      },
      resetDemo: async () => {
        if (apiOnline) {
          const data = (await overseasApi.reset()) as Omit<OverseasHubState, "user">;
          setState((s) => ({ ...data, user: s.user }));
        } else {
          setState((s) => ({ ...overseasSeed(), user: s.user }));
        }
      },
    }),
    [state, loading, apiOnline],
  );

  return createElement(Ctx.Provider, { value: store }, children);
}

export function useOverseasStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("OverseasStoreProvider missing");
  return ctx;
}
