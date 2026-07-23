import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

const STORAGE_KEY = "xian-drama-saas-v1";

type Store = AppState & {
  login: (role: Role) => void;
  logout: () => void;
  upsertMember: (m: Member) => void;
  addEvent: (e: EventItem) => void;
  updateMatch: (id: string, patch: Partial<MatchNeed>) => void;
  upsertOrder: (o: WorkOrder) => void;
  updateApproval: (id: string, patch: Partial<ApprovalCase>) => void;
  updateOverseas: (id: string, patch: Partial<OverseasProject>) => void;
  resetDemo: () => void;
};

const Ctx = createContext<Store | null>(null);

const demoUsers: Record<Role, User> = {
  admin: { id: "u1", name: "张衡", role: "admin", org: "服务中心主任办" },
  alliance: { id: "u2", name: "陈希", role: "alliance", org: "联盟秘书处" },
  approval: { id: "u3", name: "刘芳", role: "approval", org: "审批中心" },
  overseas: { id: "u4", name: "韩磊", role: "overseas", org: "出海中心" },
  distribution: { id: "u5", name: "苏晚", role: "distribution", org: "发行投流中心" },
  copyright: { id: "u6", name: "顾清", role: "copyright", org: "版权中心" },
  ai: { id: "u7", name: "蒋一", role: "ai", org: "AI 研发中心" },
};

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    return { ...seedState(), ...JSON.parse(raw), user: JSON.parse(raw).user ?? null };
  } catch {
    return seedState();
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const api = useMemo<Store>(
    () => ({
      ...state,
      login: (role) => setState((s) => ({ ...s, user: demoUsers[role] })),
      logout: () => setState((s) => ({ ...s, user: null })),
      upsertMember: (m) =>
        setState((s) => {
          const exists = s.members.some((x) => x.id === m.id);
          return {
            ...s,
            members: exists
              ? s.members.map((x) => (x.id === m.id ? m : x))
              : [m, ...s.members],
          };
        }),
      addEvent: (e) => setState((s) => ({ ...s, events: [e, ...s.events] })),
      updateMatch: (id, patch) =>
        setState((s) => ({
          ...s,
          matches: s.matches.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      upsertOrder: (o) =>
        setState((s) => {
          const exists = s.orders.some((x) => x.id === o.id);
          return {
            ...s,
            orders: exists
              ? s.orders.map((x) => (x.id === o.id ? o : x))
              : [o, ...s.orders],
          };
        }),
      updateApproval: (id, patch) =>
        setState((s) => ({
          ...s,
          approvals: s.approvals.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      updateOverseas: (id, patch) =>
        setState((s) => ({
          ...s,
          overseas: s.overseas.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      resetDemo: () => setState({ ...seedState(), user: state.user }),
    }),
    [state],
  );

  return createElement(Ctx.Provider, { value: api }, children);
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("StoreProvider missing");
  return ctx;
}

export function roleName(role: Role) {
  return ROLE_LABEL[role];
}
