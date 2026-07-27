import { Link } from "react-router-dom";
import { useCenterStore } from "../../store/centerStore";

export default function CenterDashboard() {
  const { orders, approvals, overseas, distributions, copyrights, ais, tokenWallet } =
    useCenterStore();
  const openOrders = orders.filter((o) => o.status !== "完结" && o.status !== "关闭");
  const highRisk = approvals.filter((a) => a.risk === "高" || a.stage === "会诊");

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-4">
        <div className="card">
          <div className="stat-value">{openOrders.length}</div>
          <div className="stat-label">进行中工单</div>
        </div>
        <div className="card">
          <div className="stat-value">{approvals.length}</div>
          <div className="stat-label">审批案件</div>
        </div>
        <div className="card">
          <div className="stat-value">{overseas.length}</div>
          <div className="stat-label">出海项目</div>
        </div>
        <div className="card">
          <div className="stat-value">{(tokenWallet.balance / 1000).toFixed(1)}k</div>
          <div className="stat-label">Token 余额</div>
        </div>
      </div>

      <div className="center-quick-links">
        <Link className="center-quick-link" to="/center/console/panorama">
          全景数据看板 →
        </Link>
        <Link className="center-quick-link" to="/center/console/tokens">
          Token 聚合购买 →
        </Link>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>中心工单</h3>
          {openOrders.slice(0, 5).map((o) => (
            <div className="list-row" key={o.id}>
              <div>
                <strong>{o.id}</strong> · {o.product}
                <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  {o.org} · {o.center} · 截止 {o.dueAt}
                </div>
              </div>
              <span className={`tag ${o.priority === "高" ? "red" : "blue"}`}>{o.status}</span>
            </div>
          ))}
          <div style={{ marginTop: "0.8rem" }}>
            <Link className="btn btn-secondary" to="/center/console/orders">
              查看全部工单
            </Link>
          </div>
        </div>

        <div className="card">
          <h3>五大中心负荷</h3>
          {[
            ["审批中心", approvals.length, "/center/console/approval"],
            ["出海中心", overseas.length, "/center/console/overseas"],
            ["发行投流", distributions.length, "/center/console/distribution"],
            ["版权中心", copyrights.length, "/center/console/copyright"],
            ["AI 研发", ais.length, "/center/console/ai"],
          ].map(([name, count, to]) => (
            <div className="list-row" key={name as string}>
              <div>
                <strong>{name}</strong>
                <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>在管 {count as number} 项</div>
              </div>
              <Link className="btn btn-ghost" to={to as string}>
                打开
              </Link>
            </div>
          ))}
          {highRisk.length > 0 && (
            <p style={{ marginTop: "0.6rem", color: "var(--warn)", fontSize: "0.85rem" }}>
              审批侧需关注：{highRisk.length} 个中高风险/会诊案件
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
