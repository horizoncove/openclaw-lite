import { useOverseasStore } from "../../../store/overseasStore";

export default function ClientProjectsPage() {
  const { user, projects } = useOverseasStore();
  const mine = projects.filter((p) => p.org === user?.org);

  return (
    <div className="card">
      <h3>我的出海项目</h3>
      {mine.length === 0 ? (
        <div className="empty">暂无已立项项目。</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>项目</th>
                <th>市场</th>
                <th>阶段</th>
                <th>评分</th>
                <th>进度</th>
                <th>平台</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{p.summary}</div>
                  </td>
                  <td>{p.market}</td>
                  <td>
                    <span className="tag">{p.stage}</span>
                  </td>
                  <td>{p.score}</td>
                  <td>
                    <div className="os-progress"><div className="os-progress-track"><i style={{ width: `${p.progress}%` }} /></div><span>{p.progress}%</span>
                    </div>
                  </td>
                  <td>{p.platforms.length ? p.platforms.join("、") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
