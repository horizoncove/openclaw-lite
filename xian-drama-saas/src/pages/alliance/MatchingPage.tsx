import { useMemo, useState } from "react";
import { ArrowRightLeft, Sparkles, Wallet } from "lucide-react";
import { useAllianceStore } from "../../store/allianceStore";
import { findScene, payMeta, PAY_MECHANISMS, suggestScene, suggestSupplier } from "../../utils/dealLoop";
import type { MatchNeed, PayMechanism } from "../../types";

export default function MatchingPage() {
  const {
    matches,
    members,
    deals,
    bids,
    orgWallets,
    scenePackages,
    closeDeal,
    reviewBid,
    topUpWallet,
  } = useAllianceStore();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<
    Record<string, { partner: string; sceneId: string; payMechanism: PayMechanism; bidId?: string }>
  >({});

  const openPipeline = useMemo(
    () => matches.filter((m) => m.status === "开放" || m.status === "撮合中"),
    [matches],
  );

  const cfgFor = (m: MatchNeed) => {
    const scene = m.sceneId ? findScene(m.sceneId) : suggestScene(m);
    const partner = m.suggestedPartner || suggestSupplier(m, members);
    return (
      selected[m.id] || {
        partner,
        sceneId: scene?.id || scenePackages[0]?.id || "SCENE-OVERSEAS",
        payMechanism: (m.preferredPayMechanism || "预付") as PayMechanism,
        bidId: undefined,
      }
    );
  };

  const bidsFor = (matchId: string) => (bids || []).filter((b) => b.matchId === matchId && b.status === "待审");

  const onClose = async (m: MatchNeed) => {
    setErr("");
    setBusyId(m.id);
    const cfg = cfgFor(m);
    const scene = findScene(cfg.sceneId);
    const pay = payMeta(cfg.payMechanism);
    const budget = scene?.tokens ?? 0;
    const lockNeed = Math.round(budget * pay.lockRatioOnOpen);
    const wallet = orgWallets.find((w) => w.org === m.org);
    try {
      if ((wallet?.balance ?? 0) < lockNeed) {
        await topUpWallet(m.org, lockNeed - (wallet?.balance ?? 0) + 20000);
      }
      await closeDeal(m.id, {
        supplierOrg: cfg.partner,
        sceneId: cfg.sceneId,
        payMechanism: cfg.payMechanism,
        payMechanismSource:
          cfg.payMechanism === (m.preferredPayMechanism || "预付") ? "buyer" : "negotiated",
        bidId: cfg.bidId,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "成交失败");
    } finally {
      setBusyId(null);
    }
  };

  const onAcceptBid = async (bidId: string) => {
    setErr("");
    setBusyId(bidId);
    try {
      const bid = (bids || []).find((b) => b.id === bidId);
      const match = matches.find((m) => m.id === bid?.matchId);
      if (bid && match) {
        const scene = findScene(match.sceneId || "SCENE-OVERSEAS");
        const pay = payMeta(bid.proposedPayMechanism);
        const budget = bid.quoteTokens || scene?.tokens || 0;
        const lockNeed = Math.round(budget * pay.lockRatioOnOpen);
        const wallet = orgWallets.find((w) => w.org === match.org);
        if ((wallet?.balance ?? 0) < lockNeed) {
          await topUpWallet(match.org, lockNeed - (wallet?.balance ?? 0) + 20000);
        }
      }
      await reviewBid(bidId, "accept");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "采纳应征失败");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <section className="loop-hero broker">
        <div>
          <p className="loop-eyebrow">BROKER VIEW · 秘书处</p>
          <h3>撮合不只选对手，还要谈妥支付机制</h3>
          <p>
            需求方发布时可设预付 / 过程支付 / 验收后支付；供给方应征时可接受或要求改机制。
            你采纳应征或手动成交时，按最终机制冻结首笔托管。
          </p>
        </div>
        <div className="loop-hero-stats">
          <div>
            <strong>{openPipeline.length}</strong>
            <span>待撮合</span>
          </div>
          <div>
            <strong>{(bids || []).filter((b) => b.status === "待审").length}</strong>
            <span>待审应征</span>
          </div>
          <div>
            <strong>{orgWallets.find((w) => w.org === "联盟秘书处")?.balance.toLocaleString() ?? 0}</strong>
            <span>撮合费余额</span>
          </div>
        </div>
      </section>

      {err && <div className="loop-alert">{err}</div>}

      <div className="card">
        <h3>三种支付机制</h3>
        <div className="participant-grid" style={{ marginTop: "0.75rem" }}>
          {PAY_MECHANISMS.map((p) => (
            <article className="participant-card" key={p.id}>
              <h4>{p.label}</h4>
              <p>{p.rule}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>供需流水线 · 机制 + 应征 + 成交</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>需求方</th>
                <th>买方机制</th>
                <th>供给方 / 应征</th>
                <th>场景包</th>
                <th>成交机制</th>
                <th>首冻 / 余额</th>
                <th>动作</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => {
                const cfg = cfgFor(m);
                const scene = findScene(cfg.sceneId);
                const bal = orgWallets.find((w) => w.org === m.org)?.balance ?? 0;
                const deal = deals.find((d) => d.id === m.dealId);
                const pay = payMeta(cfg.payMechanism);
                const lockNeed = Math.round((scene?.tokens ?? 0) * pay.lockRatioOnOpen);
                const pending = bidsFor(m.id);
                return (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.org}</strong>
                      <div style={{ color: "var(--muted)", fontSize: "0.82rem", maxWidth: 220 }}>{m.need}</div>
                      <span className={`tag ${m.status === "已成交" ? "green" : m.status === "撮合中" ? "amber" : "blue"}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>
                      <span className="tag blue">{m.preferredPayMechanism || "预付"}</span>
                      {m.payMechanismNote && (
                        <div style={{ color: "var(--muted)", fontSize: "0.78rem", maxWidth: 140, marginTop: 4 }}>
                          {m.payMechanismNote}
                        </div>
                      )}
                    </td>
                    <td>
                      {m.status === "已成交" ? (
                        m.suggestedPartner
                      ) : (
                        <div style={{ display: "grid", gap: 6, minWidth: 180 }}>
                          <select
                            value={cfg.partner}
                            onChange={(e) =>
                              setSelected((s) => ({
                                ...s,
                                [m.id]: { ...cfg, partner: e.target.value, bidId: undefined },
                              }))
                            }
                          >
                            {members
                              .filter((x) => x.name !== m.org)
                              .map((x) => (
                                <option key={x.id} value={x.name}>
                                  {x.name}
                                </option>
                              ))}
                          </select>
                          {pending.length > 0 && (
                            <div style={{ fontSize: "0.8rem" }}>
                              {pending.map((b) => (
                                <div
                                  key={b.id}
                                  style={{
                                    borderTop: "1px solid var(--border)",
                                    paddingTop: 4,
                                    marginTop: 4,
                                  }}
                                >
                                  <div>
                                    <strong>{b.supplierOrg}</strong>
                                    {!b.acceptBuyerMechanism && (
                                      <span className="tag amber" style={{ marginLeft: 4 }}>
                                        要求改 {b.proposedPayMechanism}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ color: "var(--muted)" }}>{b.note}</div>
                                  <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                                    <button
                                      className="btn btn-primary"
                                      style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                                      disabled={busyId === b.id}
                                      onClick={() => onAcceptBid(b.id)}
                                    >
                                      采纳并成交
                                    </button>
                                    <button
                                      className="btn btn-ghost"
                                      style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                                      onClick={() => reviewBid(b.id, "reject")}
                                    >
                                      拒绝
                                    </button>
                                    <button
                                      className="btn btn-ghost"
                                      style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                                      onClick={() =>
                                        setSelected((s) => ({
                                          ...s,
                                          [m.id]: {
                                            ...cfg,
                                            partner: b.supplierOrg,
                                            payMechanism: b.proposedPayMechanism,
                                            bidId: b.id,
                                          },
                                        }))
                                      }
                                    >
                                      选用条款
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {m.status === "已成交" ? (
                        <span className="tag blue">{deal?.sceneName || scene?.name}</span>
                      ) : (
                        <select
                          value={cfg.sceneId}
                          onChange={(e) =>
                            setSelected((s) => ({ ...s, [m.id]: { ...cfg, sceneId: e.target.value } }))
                          }
                        >
                          {scenePackages.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} · {(p.tokens / 1000).toFixed(0)}k
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {m.status === "已成交" ? (
                        <span className="tag green">{deal?.payMechanism || "预付"}</span>
                      ) : (
                        <select
                          value={cfg.payMechanism}
                          onChange={(e) =>
                            setSelected((s) => ({
                              ...s,
                              [m.id]: {
                                ...cfg,
                                payMechanism: e.target.value as PayMechanism,
                                bidId: undefined,
                              },
                            }))
                          }
                        >
                          {PAY_MECHANISMS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {m.status === "已成交" ? (
                        <span className="tag green">{deal?.escrow?.toLocaleString()}</span>
                      ) : (
                        <span className={bal < lockNeed ? "tag amber" : "tag green"}>
                          <Wallet size={12} /> 冻 {lockNeed.toLocaleString()} / 余 {bal.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td>
                      {m.status === "已成交" ? (
                        <span className="tag green">{m.dealId}</span>
                      ) : (
                        <button
                          className="btn btn-primary"
                          disabled={busyId === m.id || m.status === "关闭"}
                          onClick={() => onClose(m)}
                        >
                          <Sparkles size={14} />
                          {busyId === m.id ? "开立中…" : "成交并开预算"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="loop-footnote">
          <ArrowRightLeft size={14} /> 预付冻 100% · 过程支付冻 40%（不足追加）· 验收后冻 100% 但激励暂挂至结算。
        </p>
      </div>
    </div>
  );
}
