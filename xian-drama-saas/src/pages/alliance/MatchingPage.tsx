import { useMemo, useState } from "react";
import { ArrowRightLeft, Sparkles, Wallet } from "lucide-react";
import { useAllianceStore } from "../../store/allianceStore";
import { findScene, suggestScene, suggestSupplier } from "../../utils/dealLoop";
import type { MatchNeed } from "../../types";

export default function MatchingPage() {
  const { matches, members, deals, orgWallets, scenePackages, updateMatch, closeDeal, topUpWallet } =
    useAllianceStore();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<Record<string, { partner: string; sceneId: string }>>({});

  const openPipeline = useMemo(
    () => matches.filter((m) => m.status === "开放" || m.status === "撮合中"),
    [matches],
  );

  const cfgFor = (m: MatchNeed) => {
    const scene = m.sceneId
      ? findScene(m.sceneId)
      : suggestScene(m);
    const partner = m.suggestedPartner || suggestSupplier(m, members);
    return (
      selected[m.id] || {
        partner,
        sceneId: scene?.id || scenePackages[0]?.id || "SCENE-OVERSEAS",
      }
    );
  };

  const onClose = async (m: MatchNeed) => {
    setErr("");
    setBusyId(m.id);
    const cfg = cfgFor(m);
    const scene = findScene(cfg.sceneId);
    const wallet = orgWallets.find((w) => w.org === m.org);
    try {
      if (scene && (wallet?.balance ?? 0) < scene.tokens) {
        await topUpWallet(m.org, scene.tokens - (wallet?.balance ?? 0) + 20000);
      }
      await closeDeal(m.id, { supplierOrg: cfg.partner, sceneId: cfg.sceneId });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "成交失败");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <section className="loop-hero broker">
        <div>
          <p className="loop-eyebrow">BROKER VIEW · 秘书处</p>
          <h3>撮合不是改状态，是开一条可履约的资金与服务链路</h3>
          <p>
            你替双方省下的是「找谁、谈什么、钱先冻在哪」。成交瞬间：双边确认（演示自动）→ 冻结对价进托管 →
            生成中心工单 → 履约时从托管池切割费用。
          </p>
        </div>
        <div className="loop-hero-stats">
          <div>
            <strong>{openPipeline.length}</strong>
            <span>待撮合</span>
          </div>
          <div>
            <strong>{deals.length}</strong>
            <span>项目在途</span>
          </div>
          <div>
            <strong>{orgWallets.find((w) => w.org === "联盟秘书处")?.balance.toLocaleString() ?? 0}</strong>
            <span>撮合费余额</span>
          </div>
        </div>
      </section>

      {err && <div className="loop-alert">{err}</div>}

      <div className="card">
        <h3>供需流水线 · 一键成交开预算</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>需求方在想什么</th>
                <th>可提供</th>
                <th>建议供给方</th>
                <th>场景包</th>
                <th>买方余额</th>
                <th>状态</th>
                <th>动作</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => {
                const cfg = cfgFor(m);
                const scene = findScene(cfg.sceneId);
                const bal = orgWallets.find((w) => w.org === m.org)?.balance ?? 0;
                const deal = deals.find((d) => d.id === m.dealId);
                return (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.org}</strong>
                      <div style={{ color: "var(--muted)", fontSize: "0.82rem", maxWidth: 220 }}>{m.need}</div>
                    </td>
                    <td style={{ maxWidth: 180, fontSize: "0.88rem" }}>{m.offer}</td>
                    <td>
                      {m.status === "已成交" ? (
                        m.suggestedPartner
                      ) : (
                        <select
                          value={cfg.partner}
                          onChange={(e) =>
                            setSelected((s) => ({ ...s, [m.id]: { ...cfg, partner: e.target.value } }))
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
                      <span className={scene && bal < scene.tokens ? "tag amber" : "tag green"}>
                        <Wallet size={12} /> {bal.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <select
                        value={m.status}
                        disabled={m.status === "已成交"}
                        onChange={(e) =>
                          updateMatch(m.id, {
                            status: e.target.value as MatchNeed["status"],
                            updatedAt: new Date().toISOString().slice(0, 10),
                          })
                        }
                      >
                        {["开放", "撮合中", "已成交", "关闭"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
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
          <ArrowRightLeft size={14} /> 成交后：买方可用→锁定（托管）→履约三拆（撮合费/供给激励/中心保留）→结算退回剩余。
        </p>
      </div>
    </div>
  );
}
