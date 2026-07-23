import { Link } from "react-router-dom";
import { useAllianceStore } from "../../store/allianceStore";

export default function AllianceDashboard() {
  const { members, orders, events, matches, works, venues } = useAllianceStore();
  const openOrders = orders.filter((o) => o.status !== "完结" && o.status !== "关闭");

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-4">
        <div className="card">
          <div className="stat-value">{members.filter((m) => m.status === "有效").length}</div>
          <div className="stat-label">有效会员</div>
        </div>
        <div className="card">
          <div className="stat-value">{openOrders.length}</div>
          <div className="stat-label">进行中工单</div>
        </div>
        <div className="card">
          <div className="stat-value">{events.filter((e) => e.status !== "已结束").length}</div>
          <div className="stat-label">进行中活动</div>
        </div>
        <div className="card">
          <div className="stat-value">{matches.filter((m) => m.status !== "关闭").length}</div>
          <div className="stat-label">供需撮合</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>联盟工单</h3>
          {openOrders.slice(0, 5).map((o) => (
            <div className="list-row" key={o.id}>
              <div>
                <strong>{o.id}</strong> · {o.product}
                <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  {o.org} · 截止 {o.dueAt}
                </div>
              </div>
              <span className={`tag ${o.priority === "高" ? "red" : "blue"}`}>{o.status}</span>
            </div>
          ))}
          <div style={{ marginTop: "0.8rem" }}>
            <Link className="btn btn-secondary" to="/alliance/console/orders">
              查看全部工单
            </Link>
          </div>
        </div>

        <div className="card">
          <h3>快捷入口</h3>
          {[
            ["会员管理", members.length, "/alliance/console/members"],
            ["活动运营", events.length, "/alliance/console/events"],
            ["供需撮合", matches.length, "/alliance/console/matching"],
            ["内容推荐", works.length + venues.length, "/alliance/console/showcase"],
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
        </div>
      </div>
    </div>
  );
}
