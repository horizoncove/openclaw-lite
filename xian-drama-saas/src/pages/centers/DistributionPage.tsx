import { useCenterStore } from "../../store/centerStore";

export default function DistributionPage() {
  const { distributions } = useCenterStore();

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-3">
        <div className="card">
          <div className="stat-value">{distributions.length}</div>
          <div className="stat-label">发行体检/投放项目</div>
        </div>
        <div className="card">
          <div className="stat-value">{distributions.filter((d) => d.stage === "冷启动").length}</div>
          <div className="stat-label">冷启动中</div>
        </div>
        <div className="card">
          <div className="stat-value">{distributions.filter((d) => d.stage === "复盘").length}</div>
          <div className="stat-label">已复盘</div>
        </div>
      </div>
      <div className="card">
        <h3>发行投流运营台</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>项目</th>
                <th>平台</th>
                <th>预算</th>
                <th>阶段</th>
                <th>ROI</th>
                <th>负责人</th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{d.id}</div>
                  </td>
                  <td>{d.platform}</td>
                  <td>{d.budget}</td>
                  <td>
                    <span className="tag amber">{d.stage}</span>
                  </td>
                  <td>{d.roi || "—"}</td>
                  <td>{d.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
