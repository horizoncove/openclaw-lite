import { useStore } from "../../store";

export default function CopyrightPage() {
  const { copyrights } = useStore();

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-4">
        {["确权", "登记辅导", "授权", "维权"].map((type) => (
          <div className="card" key={type}>
            <div className="stat-value">{copyrights.filter((c) => c.type === type).length}</div>
            <div className="stat-label">{type}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>版权服务台账</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>事项</th>
                <th>类型</th>
                <th>机构</th>
                <th>状态</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              {copyrights.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{c.id}</div>
                  </td>
                  <td>
                    <span className="tag blue">{c.type}</span>
                  </td>
                  <td>{c.org}</td>
                  <td>
                    <span className={`tag ${c.status === "已完成" ? "green" : c.status === "转介" ? "amber" : "gray"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>{c.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
