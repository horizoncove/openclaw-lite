import { useMemo } from "react";
import { Coins, Handshake, Package } from "lucide-react";
import { useAllianceStore } from "../../../store/allianceStore";
import { findMemberOrg } from "../../../utils/memberContext";

export default function MemberDealsPage() {
  const { user, members, deals, orgWallets, scenePackages, topUpWallet } = useAllianceStore();
  const org = findMemberOrg(user, members);
  const wallet = orgWallets.find((w) => w.org === org?.name);

  const asBuyer = useMemo(() => deals.filter((d) => d.buyerOrg === org?.name), [deals, org]);
  const asSupplier = useMemo(() => deals.filter((d) => d.supplierOrg === org?.name), [deals, org]);

  if (!org) {
    return (
      <div className="member-card">
        <h3>未绑定企业</h3>
        <p style={{ color: "var(--muted)" }}>请使用会员演示账号登录以查看项目钱包。</p>
      </div>
    );
  }

  return (
    <div className="member-page">
      <section className="member-hero-card">
        <div>
          <p className="member-hero-label">我的项目与钱包</p>
          <h3>{org.name}</h3>
          <p className="member-hero-desc">
            作为需求方：预算锁在项目里，超支有墙。作为供给方：交付节点自动拿激励。
            你不用懂「¥/1M tokens」，只要看「这个合作还剩多少」。
          </p>
        </div>
        <div className="member-hero-stat">
          <div className="stat-value">{((wallet?.balance ?? 0) / 1000).toFixed(0)}k</div>
          <div className="stat-label">企业 Token 余额</div>
        </div>
      </section>

      <div className="member-card" style={{ marginTop: "1rem" }}>
        <div className="showcase-toolbar">
          <div>
            <h3>企业钱包</h3>
            <p className="member-page-intro" style={{ margin: 0 }}>
              余额用于开立场景包。不足时一键补额，再去成交或履约。
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => topUpWallet(org.name, 50000)}>
            <Coins size={15} /> 补充 50k Tokens
          </button>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: "1rem" }}>
        <div className="member-card">
          <div className="discover-section-head">
            <Package size={18} />
            <h3>我是需求方 · {asBuyer.length} 个项目</h3>
          </div>
          {asBuyer.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>暂无买方项目。发布供需并由秘书处成交后会出现在这里。</p>
          ) : (
            asBuyer.map((d) => (
              <div className="deal-mini" key={d.id}>
                <div className="deal-card-head">
                  <strong>{d.sceneName}</strong>
                  <span className="tag blue">{d.status}</span>
                </div>
                <p>供给方：{d.supplierOrg}</p>
                <div className="deal-budget-bar"><div style={{ width: `${Math.round((d.spent / d.budget) * 100)}%` }} /></div>
                <div className="deal-budget-labels">
                  <span>{d.spent.toLocaleString()} / {d.budget.toLocaleString()}</span>
                </div>
                <p className="deal-next"><b>你的下一步：</b>{d.nextActionBuyer}</p>
              </div>
            ))
          )}
        </div>

        <div className="member-card">
          <div className="discover-section-head">
            <Handshake size={18} />
            <h3>我是供给方 · {asSupplier.length} 个项目</h3>
          </div>
          {asSupplier.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>暂无卖方项目。被撮合为供给方后，激励会回流到此。</p>
          ) : (
            asSupplier.map((d) => (
              <div className="deal-mini" key={d.id}>
                <div className="deal-card-head">
                  <strong>{d.sceneName}</strong>
                  <span className="tag green">激励 {d.supplierEarned.toLocaleString()}</span>
                </div>
                <p>需求方：{d.buyerOrg}</p>
                <p className="deal-next"><b>你的下一步：</b>{d.nextActionSupplier}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="member-card" style={{ marginTop: "1rem" }}>
        <h3>可选场景包（成交时锁定）</h3>
        <div className="scene-grid compact">
          {scenePackages.map((s) => (
            <article className="scene-card" key={s.id}>
              <strong>{s.name}</strong>
              <span className="tag">{(s.tokens / 1000).toFixed(0)}k</span>
              <p>{s.forBuyer}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
