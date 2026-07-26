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
  MatchBid,
  MatchNeed,
  Member,
  MemberWork,
  PayMechanism,
  Venue,
  WorkOrder,
} from "../types";
import { ALLIANCE_ROLE_LABEL } from "../types";

const USER_KEY = "xian-drama-alliance-user";

type CloseDealOpts = {
  supplierOrg?: string;
  sceneId?: string;
  bidId?: string;
  payMechanism?: PayMechanism;
  payMechanismSource?: "buyer" | "supplier" | "negotiated";
  payMechanismNote?: string;
  budgetOverride?: number;
};

type PlaceBidOpts = {
  matchId: string;
  supplierOrg: string;
  acceptBuyerMechanism?: boolean;
  proposedPayMechanism: PayMechanism;
  note?: string;
  quoteTokens?: number;
};

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
  closeDeal: (matchId: string, opts?: CloseDealOpts) => Promise<void>;
  placeBid: (opts: PlaceBidOpts) => Promise<void>;
  reviewBid: (bidId: string, action: "accept" | "reject" | "withdraw") => Promise<void>;
  consumeDeal: (dealId: string, amount: number, note?: string, model?: string) => Promise<void>;
  settleDeal: (dealId: string) => Promise<void>;
  confirmDeal: (dealId: string, side: "buyer" | "supplier") => Promise<void>;
  raiseDispute: (opts: {
    dealId: string;
    reason: string;
    claimTokens?: number;
    raisedRole?: "buyer" | "supplier" | "broker";
  }) => Promise<void>;
  decideDispute: (
    disputeId: string,
    opts: {
      decision: string;
      adjustBuyerRefund?: number;
      adjustSupplierClawback?: number;
    },
  ) => Promise<void>;
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
      setState((s) => ({
        ...data,
        bids: data.bids ?? [],
        disputes: data.disputes ?? [],
        deals: (data.deals ?? []).map((d) => ({
          ...d,
          payMechanism: d.payMechanism ?? "预付",
          payMechanismSource: d.payMechanismSource ?? "buyer",
          unfunded: d.unfunded ?? 0,
          heldBroker: d.heldBroker ?? 0,
          heldSupplier: d.heldSupplier ?? 0,
        })),
        user: s.user,
      }));
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
          const { buildDealFromMatch, findScene, lockEscrow } = await import("../utils/dealLoop");
          setState((s) => {
            const match = s.matches.find((m) => m.id === matchId);
            if (!match || match.dealId) return s;
            const scene = findScene(opts?.sceneId || match.sceneId || "SCENE-OVERSEAS");
            if (!scene) return s;
            let partner = opts?.supplierOrg || match.suggestedPartner || "丝路视界传媒";
            let payMechanism = opts?.payMechanism || match.preferredPayMechanism || ("预付" as PayMechanism);
            let payMechanismSource = opts?.payMechanismSource ?? ("buyer" as const);
            let payMechanismNote = opts?.payMechanismNote || match.payMechanismNote;
            let budgetOverride = opts?.budgetOverride;
            let bids = [...(s.bids || [])];
            if (opts?.bidId) {
              const bid = bids.find((b) => b.id === opts.bidId && b.matchId === matchId);
              if (!bid) return s;
              partner = bid.supplierOrg;
              payMechanism = bid.proposedPayMechanism;
              payMechanismSource = bid.acceptBuyerMechanism ? "buyer" : "supplier";
              payMechanismNote = bid.note || payMechanismNote;
              budgetOverride = bid.quoteTokens ?? budgetOverride;
              bids = bids.map((b) => {
                if (b.id === opts.bidId) return { ...b, status: "已采纳" as const };
                if (b.matchId === matchId && b.status === "待审") return { ...b, status: "已拒绝" as const };
                return b;
              });
            }
            const built = buildDealFromMatch({
              match,
              supplierOrg: partner,
              sceneId: scene.id,
              dealIndex: s.deals.length + 1,
              payMechanism,
              payMechanismSource,
              payMechanismNote,
              budgetOverride,
            });
            const wallets = lockEscrow(s.orgWallets, match.org, built.lockAmount);
            if (!wallets) return s;
            return {
              ...s,
              bids,
              orgWallets: wallets,
              deals: [built.deal, ...s.deals],
              orders: [built.order, ...s.orders],
              matches: s.matches.map((m) =>
                m.id === matchId
                  ? {
                      ...m,
                      status: "已成交" as const,
                      dealId: built.deal.id,
                      suggestedPartner: partner,
                      sceneId: scene.id,
                      preferredPayMechanism: payMechanism,
                      updatedAt: new Date().toISOString().slice(0, 10),
                    }
                  : m
              ),
            };
          });
        }
      },
      placeBid: async (opts) => {
        if (apiOnline) {
          const data = await allianceApi.bids.place(opts);
          setState((s) => ({ ...data, user: s.user }));
        } else {
          setState((s) => {
            const match = s.matches.find((m) => m.id === opts.matchId);
            if (!match || !["开放", "撮合中"].includes(match.status)) return s;
            if (match.org === opts.supplierOrg) return s;
            const buyerMech = match.preferredPayMechanism || ("预付" as PayMechanism);
            const proposed = opts.proposedPayMechanism || buyerMech;
            const accept = !!opts.acceptBuyerMechanism && proposed === buyerMech;
            const bid: MatchBid = {
              id: `BID-${String((s.bids?.length || 0) + 1).padStart(3, "0")}`,
              matchId: opts.matchId,
              supplierOrg: opts.supplierOrg,
              acceptBuyerMechanism: accept,
              proposedPayMechanism: proposed,
              note: opts.note || (accept ? "接受需求方支付机制" : `要求改为「${proposed}」`),
              quoteTokens: opts.quoteTokens,
              status: "待审",
              createdAt: new Date().toISOString().slice(0, 10),
            };
            return {
              ...s,
              bids: [bid, ...(s.bids || [])],
              matches: s.matches.map((m) =>
                m.id === opts.matchId && m.status === "开放"
                  ? { ...m, status: "撮合中" as const, updatedAt: bid.createdAt }
                  : m
              ),
            };
          });
        }
      },
      reviewBid: async (bidId, action) => {
        if (apiOnline) {
          const data = await allianceApi.bids.review(bidId, action);
          setState((s) => ({ ...data, user: s.user }));
          return;
        }
        if (action === "accept") {
          const bid = state.bids.find((b) => b.id === bidId);
          if (!bid) return;
          const { buildDealFromMatch, findScene, lockEscrow } = await import("../utils/dealLoop");
          setState((s) => {
            const match = s.matches.find((m) => m.id === bid.matchId);
            if (!match || match.dealId) return s;
            const scene = findScene(match.sceneId || "SCENE-OVERSEAS");
            if (!scene) return s;
            let bids = [...(s.bids || [])];
            const live = bids.find((b) => b.id === bidId);
            if (!live || live.status !== "待审") return s;
            bids = bids.map((b) => {
              if (b.id === bidId) return { ...b, status: "已采纳" as const };
              if (b.matchId === bid.matchId && b.status === "待审") return { ...b, status: "已拒绝" as const };
              return b;
            });
            const built = buildDealFromMatch({
              match,
              supplierOrg: live.supplierOrg,
              sceneId: scene.id,
              dealIndex: s.deals.length + 1,
              payMechanism: live.proposedPayMechanism,
              payMechanismSource: live.acceptBuyerMechanism ? "buyer" : "supplier",
              payMechanismNote: live.note,
              budgetOverride: live.quoteTokens,
            });
            const wallets = lockEscrow(s.orgWallets, match.org, built.lockAmount);
            if (!wallets) return s;
            return {
              ...s,
              bids,
              orgWallets: wallets,
              deals: [built.deal, ...s.deals],
              orders: [built.order, ...s.orders],
              matches: s.matches.map((m) =>
                m.id === bid.matchId
                  ? {
                      ...m,
                      status: "已成交" as const,
                      dealId: built.deal.id,
                      suggestedPartner: live.supplierOrg,
                      sceneId: scene.id,
                      preferredPayMechanism: live.proposedPayMechanism,
                      updatedAt: new Date().toISOString().slice(0, 10),
                    }
                  : m
              ),
            };
          });
          return;
        }
        setState((s) => ({
          ...s,
          bids: (s.bids || []).map((b) =>
            b.id === bidId
              ? { ...b, status: action === "reject" ? ("已拒绝" as const) : ("撤回" as const) }
              : b
          ),
        }));
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
          const { applyConsume, creditOrgWallet, releaseBuyerLocked, topUpEscrow } = await import(
            "../utils/dealLoop"
          );
          setState((s) => {
            let deal = s.deals.find((d) => d.id === dealId);
            if (!deal) return s;
            let wallets = s.orgWallets;
            if (deal.escrow < amount && (deal.unfunded || 0) > 0) {
              const gap = Math.min(amount - deal.escrow, deal.unfunded);
              const topped = topUpEscrow(deal, wallets, gap);
              if (!topped) return s;
              deal = topped.deal;
              wallets = topped.wallets;
            }
            const beforeB = deal.brokerEarned;
            const beforeS = deal.supplierEarned;
            const spend = Math.min(amount, deal.escrow);
            const updated = applyConsume(
              deal,
              amount,
              state.user?.name ?? "中心专员",
              note ?? "履约扣费",
              model,
            );
            wallets = releaseBuyerLocked(wallets, deal.buyerOrg, spend);
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
      settleDeal: async (dealId) => {
        if (apiOnline) {
          const data = await allianceApi.deals.settle(dealId);
          setState((s) => ({ ...data, user: s.user }));
        } else {
          const { settleDeal, unlockEscrow, creditOrgWallet } = await import("../utils/dealLoop");
          setState((s) => {
            const deal = s.deals.find((d) => d.id === dealId);
            if (!deal) return s;
            const { deal: updated, refund, releasedBroker, releasedSupplier } = settleDeal(deal);
            let wallets = refund > 0 ? unlockEscrow(s.orgWallets, deal.buyerOrg, refund) : s.orgWallets;
            if (releasedBroker > 0) wallets = creditOrgWallet(wallets, "联盟秘书处", releasedBroker, "broker");
            if (releasedSupplier > 0)
              wallets = creditOrgWallet(wallets, deal.supplierOrg, releasedSupplier, "supplier");
            return {
              ...s,
              deals: s.deals.map((d) => (d.id === dealId ? updated : d)),
              orgWallets: wallets,
            };
          });
        }
      },
      confirmDeal: async (dealId, side) => {
        if (apiOnline) {
          const data = await allianceApi.deals.confirm(dealId, {
            side,
            actor: state.user?.name,
          });
          setState((s) => ({ ...data, user: s.user }));
        } else {
          const { confirmDealSide } = await import("../utils/dealLoop");
          setState((s) => {
            const deal = s.deals.find((d) => d.id === dealId);
            if (!deal) return s;
            const updated = confirmDealSide(deal, side, state.user?.name ?? side);
            return { ...s, deals: s.deals.map((d) => (d.id === dealId ? updated : d)) };
          });
        }
      },
      raiseDispute: async (opts) => {
        if (apiOnline) {
          const data = await allianceApi.disputes.raise({
            ...opts,
            raisedBy: state.user?.org || state.user?.name,
          });
          setState((s) => ({ ...data, user: s.user }));
        } else {
          throw new Error("离线模式请连接 API 后使用仲裁");
        }
      },
      decideDispute: async (disputeId, opts) => {
        if (apiOnline) {
          const data = await allianceApi.disputes.decide(disputeId, {
            ...opts,
            decidedBy: state.user?.name || "联盟秘书处",
          });
          setState((s) => ({ ...data, user: s.user }));
        } else {
          throw new Error("离线模式请连接 API 后使用仲裁");
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
