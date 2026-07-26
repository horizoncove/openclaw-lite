import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Coins, Lock, ArrowRightLeft } from "lucide-react";
import { useAllianceStore } from "../../../store/allianceStore";
import { findMemberOrg } from "../../../utils/memberContext";
import { PAY_MECHANISMS } from "../../../utils/dealLoop";
import { buildOrgWalletView } from "../../../utils/walletView";

export default function MemberWalletsPage() {
  const { user, members, orgWallets, deals, topUpWallet } = useAllianceStore();
  const org = findMemberOrg(user, members);
  const view = useMemo(
    () => (org ? buildOrgWalletView(org.name, orgWallets, deals) : null),
    [org, orgWallets, deals],
  );

  if (!org || !view) {
    return (
      <div className="member-card">
        <h3>未绑定企业</h3>
        <p style={{ color: "var(--muted)" }}>请使用会员演示账号登录查看钱包。</p>
      </div>
    );
  }

  const { formula, projectRows, ledger } = view;
  const totalPower = formula.free + formula.locked;

  return (
    <div className="member-page">
      <section className="member-hero-card wallet-member-hero">
        <div>
          <p className="member-hero-label">企业钱包 · 托管视角</p>
          <h3>{org.name}</h3>
          <p className="member-hero-desc">
            可用用于开单；锁定=已冻进项目托管的对价；暂挂=验收后支付尚未到手的激励。
            Token 是履约燃料，不是积分。
          </p>
        </div>
        <div className="member-hero-stat">
          <div className="stat-value">{(totalPower / 1000).toFixed(0)}k</div>
          <div className="stat-label">总占用（可用+锁定）</div>
        </div>
      </section>

      <div className="wallet-metric-grid" style={{ marginTop: "1rem" }}>
        <div className="wallet-metric free">
          <span>可用 balance</span>
          <strong>{formula.free.toLocaleString()}</strong>
          <small>可开新单 / 过程支付追加</small>
        </div>
        <div className="wallet-metric locked">
          <span>
            <Lock size={12} /> 锁定 locked
          </span>
          <strong>{formula.locked.toLocaleString()}</strong>
          <small>应对齐在途托管 {formula.escrowInProjects.toLocaleString()}</small>
        </div>
        <div className="wallet-metric held">
          <span>供给暂挂</span>
          <strong>{formula.heldReceivable.toLocaleString()}</strong>
          <small>验收结算后入可用</small>
        </div>
        <div className="wallet-metric earned">
          <span>已实现激励</span>
          <strong>{formula.realizedIncentive.toLocaleString()}</strong>
          <small>累计计入供给计提</small>
        </div>
      </div>

      <div className="member-card" style={{ marginTop: "1rem" }}>
        <div className="showcase-toolbar">
          <div>
            <h3>补充可用额度</h3>
            <p className="member-page-intro" style={{ margin: 0 }}>
              补额只增加可用；成交时才按支付机制冻结进锁定/托管。
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => topUpWallet(org.name, 50000)}>
            <Coins size={15} /> 补充 50k
          </button>
        </div>
        {Math.abs(formula.lockEscrowDrift) > 1 && (
          <p className="wallet-unfunded" style={{ marginTop: "0.75rem" }}>
            对账提示：锁定与在途托管偏差 {formula.lockEscrowDrift.toLocaleString()}（演示种子或仲裁后退回可能导致短暂偏差）
          </p>
        )}
        {formula.unfunded > 0 && (
          <p className="wallet-unfunded">
            过程支付仍有未冻 {formula.unfunded.toLocaleString()}，节点消耗不足时将从可用追加锁定。
          </p>
        )}
      </div>

      <div className="member-card" style={{ marginTop: "1rem" }}>
        <h3>支付机制如何动用你的钱</h3>
        <div className="wallet-mech-row">
          {PAY_MECHANISMS.map((p) => (
            <div className="wallet-mech-chip" key={p.id}>
              <strong>{p.label}</strong>
              <span>开单冻 {Math.round(p.lockRatioOnOpen * 100)}%</span>
              <span>{p.releaseIncentivesOnConsume ? "激励即时到账" : "激励暂挂待验收"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="member-card" style={{ marginTop: "1rem" }}>
        <div className="showcase-toolbar">
          <h3>在途托管 / 暂挂明细</h3>
          <Link className="btn btn-ghost" to="/alliance/member/deals">
            项目列表 <ArrowRightLeft size={14} />
          </Link>
        </div>
        {projectRows.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>暂无在途。去发布供需或等待撮合成交。</p>
        ) : (
          projectRows.map((r) => (
            <div className="deal-mini" key={`${r.side}-${r.deal.id}`}>
              <div className="deal-card-head">
                <strong>
                  {r.deal.sceneName} · {r.deal.id}
                </strong>
                <span className={`tag ${r.side === "买方" ? "blue" : "green"}`}>{r.side}</span>
              </div>
              <p style={{ fontSize: "0.85rem" }}>
                机制 {r.deal.payMechanism || "预付"} · {r.lockHint}
              </p>
              {r.side === "买方" ? (
                <p style={{ fontSize: "0.85rem" }}>
                  托管剩余 {r.escrow.toLocaleString()}
                  {r.unfunded > 0 ? ` · 未冻 ${r.unfunded.toLocaleString()}` : ""}
                  {" · "}已释放 {r.deal.spent.toLocaleString()} / {r.deal.budget.toLocaleString()}
                </p>
              ) : (
                <p style={{ fontSize: "0.85rem" }}>
                  已计提激励 {r.earned.toLocaleString()}
                  {r.held > 0 ? ` · 暂挂 ${r.held.toLocaleString()}` : ""}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="member-card" style={{ marginTop: "1rem" }}>
        <h3>我的相关流水</h3>
        {ledger.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>成交与履约后，托管锁定/消耗/激励/仲裁会显示在此。</p>
        ) : (
          ledger.slice(0, 15).map((l) => (
            <div className="list-row" key={`${l.dealId}-${l.id}`}>
              <div>
                <strong>{l.type}</strong> · {l.note}
                <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                  {l.dealId} · {l.createdAt}
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
