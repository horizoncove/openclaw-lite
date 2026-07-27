import { useMemo, useState } from "react";
import { useAllianceStore } from "../../../store/allianceStore";
import { findMemberOrg } from "../../../utils/memberContext";
import { PAY_MECHANISMS, payMeta } from "../../../utils/dealLoop";
import type { MatchNeed, PayMechanism } from "../../../types";

export default function MemberNeedsPage() {
  const { user, members, matches, bids, addMatch, placeBid, reviewBid } = useAllianceStore();
  const org = findMemberOrg(user, members);
  const myMatches = matches.filter((m) => m.org === org?.name);
  const [need, setNeed] = useState("");
  const [offer, setOffer] = useState("");
  const [payMechanism, setPayMechanism] = useState<PayMechanism>("预付");
  const [payNote, setPayNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const openOthers = useMemo(
    () =>
      matches.filter(
        (m) =>
          m.org !== org?.name &&
          (m.status === "开放" || m.status === "撮合中") &&
          !m.dealId,
      ),
    [matches, org],
  );

  const myBids = useMemo(
    () => (bids || []).filter((b) => b.supplierOrg === org?.name),
    [bids, org],
  );

  const [bidForm, setBidForm] = useState<
    Record<string, { accept: boolean; proposed: PayMechanism; note: string }>
  >({});

  const bidCfg = (m: MatchNeed) => {
    const buyer = (m.preferredPayMechanism || "预付") as PayMechanism;
    return (
      bidForm[m.id] || {
        accept: true,
        proposed: buyer,
        note: "",
      }
    );
  };

  const publish = () => {
    if (!org || !need.trim() || !offer.trim()) return;
    const meta = payMeta(payMechanism);
    const item: MatchNeed = {
      id: `N${String(matches.length + 1).padStart(3, "0")}`,
      org: org.name,
      need: need.trim(),
      offer: offer.trim(),
      status: "开放",
      owner: `${user?.name ?? "联系人"}（待撮合）`,
      updatedAt: new Date().toISOString().slice(0, 10),
      preferredPayMechanism: payMechanism,
      payMechanismNote: payNote.trim() || meta.buyerDesc,
    };
    addMatch(item);
    setNeed("");
    setOffer("");
    setPayNote("");
    setPayMechanism("预付");
  };

  const submitBid = async (m: MatchNeed) => {
    if (!org) return;
    setErr("");
    setBusy(m.id);
    const cfg = bidCfg(m);
    try {
      await placeBid({
        matchId: m.id,
        supplierOrg: org.name,
        acceptBuyerMechanism: cfg.accept,
        proposedPayMechanism: cfg.accept
          ? ((m.preferredPayMechanism || "预付") as PayMechanism)
          : cfg.proposed,
        note:
          cfg.note ||
          (cfg.accept
            ? "接受需求方支付机制，可承接交付"
            : `要求将支付机制改为「${cfg.proposed}」`),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "应征失败");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="member-page">
      <div className="member-card">
        <h3>发布供需信息</h3>
        <p className="member-page-intro" style={{ marginBottom: "1rem" }}>
          填写需求与可提供资源，并设定支付机制（预付 / 过程支付 / 验收后支付）。供给方应征时可接受或要求改机制。
        </p>
        <div className="field">
          <label>我需要</label>
          <textarea
            placeholder="例：寻找北美发行渠道与英语配音团队"
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            rows={3}
          />
        </div>
        <div className="field">
          <label>我可提供</label>
          <textarea
            placeholder="例：可提供 2 部已成片都市逆袭题材"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            rows={3}
          />
        </div>
        <div className="field">
          <label>支付机制（需求方设定）</label>
          <div style={{ display: "grid", gap: 8 }}>
            {PAY_MECHANISMS.map((p) => (
              <label
                key={p.id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "0.6rem 0.75rem",
                  border: `1px solid ${payMechanism === p.id ? "var(--accent, #2563eb)" : "var(--border)"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="pay"
                  checked={payMechanism === p.id}
                  onChange={() => setPayMechanism(p.id)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong>{p.label}</strong>
                  <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{p.buyerDesc}</div>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label>机制说明（可选）</label>
          <input
            placeholder="例：希望分阶段冻结，降低一次性资金占用"
            value={payNote}
            onChange={(e) => setPayNote(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={publish} disabled={!org}>
          提交发布
        </button>
      </div>

      <div className="member-card" style={{ marginTop: "1rem" }}>
        <h3>我的发布记录</h3>
        {myMatches.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>暂无发布，填写上方表单即可提交。</p>
        ) : (
          myMatches.map((m) => (
            <div className="member-need-item" key={m.id}>
              <div className="member-tags" style={{ marginBottom: 8 }}>
                <span className={`tag ${m.status === "撮合中" ? "amber" : m.status === "已成交" ? "green" : "blue"}`}>
                  {m.status}
                </span>
                <span className="tag">{m.preferredPayMechanism || "预付"}</span>
                <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>更新 {m.updatedAt}</span>
              </div>
              <p>
                <strong>需求：</strong>
                {m.need}
              </p>
              <p>
                <strong>提供：</strong>
                {m.offer}
              </p>
              {m.payMechanismNote && (
                <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>机制说明：{m.payMechanismNote}</p>
              )}
              {(bids || []).filter((b) => b.matchId === m.id).length > 0 && (
                <div style={{ marginTop: 8, fontSize: "0.85rem" }}>
                  <strong>收到的应征</strong>
                  {(bids || [])
                    .filter((b) => b.matchId === m.id)
                    .map((b) => (
                      <div key={b.id} style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid var(--border)" }}>
                        {b.supplierOrg} · {b.status} ·{" "}
                        {b.acceptBuyerMechanism ? "接受原机制" : `要求 ${b.proposedPayMechanism}`}
                        <div style={{ color: "var(--muted)" }}>{b.note}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="member-card" style={{ marginTop: "1rem" }}>
        <h3>应征开放供需 · 可要求改变支付机制</h3>
        <p className="member-page-intro" style={{ marginBottom: "0.75rem" }}>
          作为供给方，可接受买方机制，或提出预付 / 过程支付 / 验收后支付的变更要求。
        </p>
        {err && <div className="loop-alert">{err}</div>}
        {!org ? (
          <p style={{ color: "var(--muted)" }}>请登录会员账号后应征。</p>
        ) : openOthers.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>暂无其他会员的开放供需。</p>
        ) : (
          openOthers.map((m) => {
            const cfg = bidCfg(m);
            const already = myBids.find((b) => b.matchId === m.id && b.status === "待审");
            return (
              <div className="member-need-item" key={m.id}>
                <div className="member-tags" style={{ marginBottom: 8 }}>
                  <strong>{m.org}</strong>
                  <span className="tag blue">{m.preferredPayMechanism || "预付"}</span>
                  <span className="tag">{m.status}</span>
                </div>
                <p>
                  <strong>需求：</strong>
                  {m.need}
                </p>
                <p>
                  <strong>对方提供：</strong>
                  {m.offer}
                </p>
                {already ? (
                  <div style={{ marginTop: 8 }}>
                    <span className="tag amber">已应征 · {already.proposedPayMechanism}</span>
                    <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{already.note}</p>
                    <button className="btn btn-ghost" onClick={() => reviewBid(already.id, "withdraw")}>
                      撤回应征
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={cfg.accept}
                        onChange={(e) =>
                          setBidForm((s) => ({
                            ...s,
                            [m.id]: {
                              ...cfg,
                              accept: e.target.checked,
                              proposed: e.target.checked
                                ? ((m.preferredPayMechanism || "预付") as PayMechanism)
                                : cfg.proposed,
                            },
                          }))
                        }
                      />
                      接受需求方机制「{m.preferredPayMechanism || "预付"}」
                    </label>
                    {!cfg.accept && (
                      <select
                        value={cfg.proposed}
                        onChange={(e) =>
                          setBidForm((s) => ({
                            ...s,
                            [m.id]: { ...cfg, proposed: e.target.value as PayMechanism },
                          }))
                        }
                      >
                        {PAY_MECHANISMS.map((p) => (
                          <option key={p.id} value={p.id}>
                            要求改为：{p.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      placeholder="应征说明 / 改机制理由"
                      value={cfg.note}
                      onChange={(e) =>
                        setBidForm((s) => ({ ...s, [m.id]: { ...cfg, note: e.target.value } }))
                      }
                    />
                    <button
                      className="btn btn-primary"
                      disabled={busy === m.id}
                      onClick={() => submitBid(m)}
                    >
                      {busy === m.id ? "提交中…" : "提交应征"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
