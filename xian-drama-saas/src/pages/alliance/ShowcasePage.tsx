import { useAllianceStore } from "../../store/allianceStore";

export default function AllianceShowcasePage() {
  const { works, venues, updateWork, updateVenue } = useAllianceStore();

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-4">
        <div className="card">
          <div className="stat-value">{works.length}</div>
          <div className="stat-label">展示作品</div>
        </div>
        <div className="card">
          <div className="stat-value">{works.filter((w) => w.featured).length}</div>
          <div className="stat-label">精选推荐</div>
        </div>
        <div className="card">
          <div className="stat-value">{venues.length}</div>
          <div className="stat-label">合作场地</div>
        </div>
        <div className="card">
          <div className="stat-value">{venues.filter((v) => v.featured).length}</div>
          <div className="stat-label">推荐场地</div>
        </div>
      </div>

      <div className="card">
        <h3>作品推荐管理</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>作品</th>
                <th>出品方</th>
                <th>题材</th>
                <th>状态</th>
                <th>精选推荐</th>
              </tr>
            </thead>
            <tbody>
              {works.map((w) => (
                <tr key={w.id}>
                  <td>
                    <strong>{w.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{w.id}</div>
                  </td>
                  <td>{w.org}</td>
                  <td>{w.genre}</td>
                  <td><span className="tag blue">{w.status}</span></td>
                  <td>
                    <button
                      className={`btn btn-ghost ${w.featured ? "featured-on" : ""}`}
                      onClick={() => updateWork(w.id, { featured: !w.featured })}
                    >
                      {w.featured ? "已推荐" : "设为推荐"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>场地推荐管理</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>场地</th>
                <th>区域</th>
                <th>类型</th>
                <th>价格</th>
                <th>状态</th>
                <th>联盟推荐</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((v) => (
                <tr key={v.id}>
                  <td>
                    <strong>{v.name}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{v.summary.slice(0, 30)}…</div>
                  </td>
                  <td>{v.district}</td>
                  <td>{v.type}</td>
                  <td>{v.price}</td>
                  <td>
                    <span className={`tag ${v.status === "可预约" ? "green" : v.status === "紧张" ? "amber" : "red"}`}>
                      {v.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn btn-ghost ${v.featured ? "featured-on" : ""}`}
                      onClick={() => updateVenue(v.id, { featured: !v.featured })}
                    >
                      {v.featured ? "已推荐" : "设为推荐"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
