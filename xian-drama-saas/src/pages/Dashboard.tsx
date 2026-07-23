import { Link } from "react-router-dom";
import { useStore } from "../store";

export default function Dashboard() {
  const { members, orders, events, approvals, overseas, distributions, copyrights, ais } =
    useStore();

  const openOrders = orders.filter((o) => o.status !== "完结" && o.status !== "关闭");
  const highRisk = approvals.filter((a) => a.risk === "高" || a.stage === "会诊");

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-4">
        <div className="card">
          <div className="stat-value">{members.filter((m) => m.status === "有效").length}</div>
          <div className="stat-label">有效联盟会员</div>
        </div>
        <div className="card">
          <div className="stat-value">{openOrders.length}</div>
          <div className="stat-label">进行中工单</div>
        </div>
        <div className="card">
          <div className="stat-value">{overseas.length}</div>
          <div className="stat-label">出海在管项目</div>
        </div>
        <div className="card">
          <div className="stat-value">{events.filter((e) => e.status !== "已结束").length}</div>
          <div className="stat-label">进行中活动</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>工单中枢快照</h3>
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
            <Link className="btn btn-secondary" to="/orders">
              进入工单中枢
            </Link>
          </div>
        </div>

        <div className="card">
          <h3>五大中心负荷</h3>
          {[
            ["审批中心", approvals.length, `/centers/approval`],
            ["出海中心", overseas.length, `/centers/overseas`],
            ["发行投流", distributions.length, `/centers/distribution`],
            ["版权中心", copyrights.length, `/centers/copyright`],
            ["AI 研发", ais.length, `/centers/ai`],
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
