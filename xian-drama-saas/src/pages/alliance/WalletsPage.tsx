import { useMemo, useState } from "react";
import { Coins, Lock, Scale, Wallet } from "lucide-react";
import { useAllianceStore } from "../../store/allianceStore";
import { PAY_MECHANISMS } from "../../utils/dealLoop";
import { buildOrgWalletView, networkWalletStats } from "../../utils/walletView";

export default function WalletsPage() {
  const { orgWallets, deals, topUpWallet } = useAllianceStore();
  const net = useMemo(() => networkWalletStats(orgWallets, deals), [orgWallets, deals]);
  const [focusOrg, setFocusOrg] = useState(orgWallets[0]?.org || "长安映缔影视");
  const view = useMemo(
    () => buildOrgWalletView(focusOrg, orgWallets, deals),
    [focusOrg, orgWallets, deals],
  );

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <section className="loop-hero broker wallet-hero">
        <div>
          <p className="loop-eyebrow">WALLETS · 托管账本</p>
          <h3>Token 不是游戏币：可用可开单，锁定在托管池，暂挂待验收</h3>
          <p>
            恒等式（演示）：机构锁定 ≈ 其作为买方的在途 escrow 之和；履约从托管三拆；结算退回剩余；
            验收后支付的撮合费/激励先进暂挂。
          </p>
        </div>
        <div className="loop-hero-stats">
          <div>
            <strong>{(net.free / 1000).toFixed(0)}k</strong>
            <span>全网可用</span>
          </div>
          <div>
            <strong>{(net.locked / 1000).toFixed(0)}k</strong>
            <span>全网锁定</span>
          </div>
          <div>
            <strong>{(net.escrow / 1000).toFixed(0)}k</strong>
            <span>项目托管</span>
          </div>
          <div>
            <strong>{(net.held / 1000).toFixed(0)}k</strong>
            <span>激励暂挂</span>
          </div>
        </div>
      </section>

      <div className="card">
        <h3>
          <Scale size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
          资金占用公式
        </h3>
        <div className="tx-formula" style={{ marginTop: "0.75rem" }}>
          <span>可用 balance</span>
          <span className="arrow">—机制冻结→</span>
          <span>锁定 locked</span>
          <span className="arrow">=</span>
          <span>项目 escrow</span>
          <span className="arrow">—履约→</span>
          <span>费 / 激励 / 中心</span>
          <span className="arrow">—结算→</span>
          <span>退回可用</span>
        </div>
        <div className="wallet-mech-row">
          {PAY_MECHANISMS.map((p) => (
            <div className="wallet-mech-chip" key={p.id}>
              <strong>{p.label}</strong>
              <span>首冻 {Math.round(p.lockRatioOnOpen * 100)}%</span>
              <span>{p.releaseIncentivesOnConsume ? "激励即时" : "激励暂挂"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>机构台账</h3>
          <div className="table-wrap" style={{ marginTop: "0.5rem" }}>
            <table>
              <thead>
                <tr>
                  <th>机构</th>
                  <th>可用</th>
                  <th>锁定</th>
                  <th>角色</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orgWallets.map((w) => (
                  <tr key={w.org} className={w.org === focusOrg ? "wallet-row-active" : undefined}>
                    <td>
                      <strong>{w.org}</strong>
                    </td>
                    <td>{w.balance.toLocaleString()}</td>
                    <td>{(w.locked ?? 0).toLocaleString()}</td>
                    <td>
                      <span className="tag">{w.role}</span>
                    </td>
                    <td>
                      <button className="btn btn-ghost" onClick={() => setFocusOrg(w.org)}>
                        透视
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card wallet-focus">
          <div className="showcase-toolbar">
            <div>
              <h3>
                <Wallet size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
                {focusOrg}
              </h3>
              <p className="member-page-intro" style={{ margin: 0 }}>
                对账：锁定 {view.formula.locked.toLocaleString()} · 在途托管{" "}
                {view.formula.escrowInProjects.toLocaleString()}
                {Math.abs(view.formula.lockEscrowDrift) > 1 && (
                  <span className="tag amber" style={{ marginLeft: 8 }}>
                    偏差 {view.formula.lockEscrowDrift.toLocaleString()}
                  </span>
                )}
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => topUpWallet(focusOrg, 50000)}>
              <Coins size={14} /> 补 50k
            </button>
          </div>

          <div className="wallet-metric-grid">
            <div className="wallet-metric free">
              <span>可用</span>
              <strong>{view.formula.free.toLocaleString()}</strong>
              <small>可开新单 / 过程追加冻结</small>
            </div>
            <div className="wallet-metric locked">
              <span>
                <Lock size={12} /> 锁定
              </span>
              <strong>{view.formula.locked.toLocaleString()}</strong>
              <small>已进项目托管池</small>
            </div>
            <div className="wallet-metric held">
              <span>应收暂挂</span>
              <strong>{view.formula.heldReceivable.toLocaleString()}</strong>
              <small>验收后支付未释放</small>
            </div>
            <div className="wallet-metric earned">
              <span>已实现激励</span>
              <strong>{view.formula.realizedIncentive.toLocaleString()}</strong>
              <small>已入可用（累计计提）</small>
            </div>
          </div>

          {(view.formula.unfunded > 0) && (
            <p className="wallet-unfunded">
              过程支付未冻额度合计 {view.formula.unfunded.toLocaleString()}（履约不足时将从可用追加锁定）
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <h3>在途项目拆解 · {focusOrg}</h3>
        {view.projectRows.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>无在途项目。成交后此处按买方托管 / 供给暂挂展开。</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>角色</th>
                  <th>项目</th>
                  <th>机制</th>
                  <th>托管/未冻</th>
                  <th>暂挂</th>
                  <th>已计提</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {view.projectRows.map((r) => (
                  <tr key={`${r.side}-${r.deal.id}`}>
                    <td>
                      <span className={`tag ${r.side === "买方" ? "blue" : "green"}`}>{r.side}</span>
                    </td>
                    <td>
                      <strong>{r.deal.id}</strong>
                      <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{r.deal.sceneName}</div>
                    </td>
                    <td>{r.deal.payMechanism || "预付"}</td>
                    <td>
                      {r.side === "买方"
                        ? `${r.escrow.toLocaleString()}${r.unfunded ? ` / 未冻 ${r.unfunded.toLocaleString()}` : ""}`
                        : "—"}
                    </td>
                    <td>{r.held ? r.held.toLocaleString() : "—"}</td>
                    <td>{r.earned ? r.earned.toLocaleString() : "—"}</td>
                    <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{r.lockHint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>相关流水（最近）</h3>
        {view.ledger.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>暂无流水。</p>
        ) : (
          view.ledger.slice(0, 12).map((l) => (
            <div className="list-row" key={`${l.dealId}-${l.id}`}>
              <div>
                <strong>{l.type}</strong> · {l.note}
                <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                  {l.dealId} · {l.sceneName} · {l.actor} · {l.createdAt}
                </div>
              </div>
              <span className={`tag ${l.amount >= 0 ? "green" : "amber"}`}>
                {l.amount > 0 ? "+" : ""}
                {l.amount.toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
