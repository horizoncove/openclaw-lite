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
  MemberWork,
  Venue,
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
  updateEvent: (id: string, patch: Partial<EventItem>) => Promise<void>;
  addMatch: (m: MatchNeed) => Promise<void>;
  updateMatch: (id: string, patch: Partial<MatchNeed>) => Promise<void>;
  upsertOrder: (o: WorkOrder) => Promise<void>;
  upsertWork: (w: MemberWork) => Promise<void>;
  updateWork: (id: string, patch: Partial<MemberWork>) => Promise<void>;
  updateVenue: (id: string, patch: Partial<Venue>) => Promise<void>;
  closeDeal: (matchId: string, opts?: { supplierOrg?: string; sceneId?: string }) => Promise<void>;
  consumeDeal: (dealId: string, amount: number, note?: string, model?: string) => Promise<void>;
  topUpWallet: (org: string, amount: number) => Promise<void>;
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
      upsertWork: async (w) => {
        if (apiOnline) {
          const saved = state.works.some((x) => x.id === w.id)
            ? await allianceApi.works.update(w.id, w)
            : await allianceApi.works.save(w);
          setState((s) => ({
            ...s,
            works: s.works.some((x) => x.id === w.id)
              ? s.works.map((x) => (x.id === w.id ? saved : x))
              : [saved, ...s.works],
          }));
        } else {
          setState((s) => {
            const exists = s.works.some((x) => x.id === w.id);
            return {
              ...s,
              works: exists ? s.works.map((x) => (x.id === w.id ? w : x)) : [w, ...s.works],
            };
          });
        }
      },
      updateWork: async (id, patch) => {
        if (apiOnline) {
          const saved = await allianceApi.works.update(id, patch);
          setState((s) => ({
            ...s,
            works: s.works.map((x) => (x.id === id ? saved : x)),
          }));
        } else {
          setState((s) => ({
            ...s,
            works: s.works.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }));
        }
      },
      updateVenue: async (id, patch) => {
        if (apiOnline) {
          const saved = await allianceApi.venues.update(id, patch);
          setState((s) => ({
            ...s,
            venues: s.venues.map((x) => (x.id === id ? saved : x)),
          }));
        } else {
          setState((s) => ({
            ...s,
            venues: s.venues.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }));
        }
      },
      closeDeal: async (matchId, opts) => {
        if (apiOnline) {
          const data = await allianceApi.deals.close({ matchId, ...opts });
          setState((s) => ({ ...data, user: s.user }));
        } else {
          const { buildDealFromMatch, findScene, debitOrgWallet } = await import("../utils/dealLoop");
          setState((s) => {
            const match = s.matches.find((m) => m.id === matchId);
            if (!match || match.dealId) return s;
            const scene = findScene(opts?.sceneId || match.sceneId || "SCENE-OVERSEAS");
            if (!scene) return s;
            const partner = opts?.supplierOrg || match.suggestedPartner || "丝路视界传媒";
            const wallets = debitOrgWallet(s.orgWallets, match.org, scene.tokens);
            if (!wallets) return s;
            const { deal, order } = buildDealFromMatch({
              match,
              supplierOrg: partner,
              sceneId: scene.id,
              dealIndex: s.deals.length + 1,
            });
            return {
              ...s,
              orgWallets: wallets,
              deals: [deal, ...s.deals],
              orders: [order, ...s.orders],
              matches: s.matches.map((m) =>
                m.id === matchId
                  ? {
                      ...m,
                      status: "已成交" as const,
                      dealId: deal.id,
                      suggestedPartner: partner,
                      sceneId: scene.id,
                      updatedAt: new Date().toISOString().slice(0, 10),
                    }
                  : m
              ),
            };
          });
        }
      },
      consumeDeal: async (dealId, amount, note, model) => {
        if (apiOnline) {
          const data = await allianceApi.deals.consume(dealId, {
            amount,
            note,
            model,
            actor: state.user?.name,
          });
          setState((s) => ({ ...data, user: s.user }));
        } else {
          const { applyConsume, creditOrgWallet } = await import("../utils/dealLoop");
          setState((s) => {
            const deal = s.deals.find((d) => d.id === dealId);
            if (!deal) return s;
            const beforeB = deal.brokerEarned;
            const beforeS = deal.supplierEarned;
            const updated = applyConsume(deal, amount, state.user?.name ?? "中心专员", note ?? "履约扣费", model);
            let wallets = s.orgWallets;
            const bd = updated.brokerEarned - beforeB;
            const sd = updated.supplierEarned - beforeS;
            if (bd > 0) wallets = creditOrgWallet(wallets, "联盟秘书处", bd, "broker");
            if (sd > 0) wallets = creditOrgWallet(wallets, deal.supplierOrg, sd, "supplier");
            return {
              ...s,
              deals: s.deals.map((d) => (d.id === dealId ? updated : d)),
              orgWallets: wallets,
            };
          });
        }
      },
      topUpWallet: async (org, amount) => {
        if (apiOnline) {
          await allianceApi.wallets.topup({ org, amount });
          const data = await allianceApi.state();
          setState((s) => ({ ...data, user: s.user }));
        } else {
          const { topUpOrgWallet } = await import("../utils/dealLoop");
          setState((s) => ({ ...s, orgWallets: topUpOrgWallet(s.orgWallets, org, amount) }));
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
