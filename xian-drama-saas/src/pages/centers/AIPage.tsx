import { Link } from "react-router-dom";
import { useCenterStore } from "../../store/centerStore";

export default function AIPage() {
  const { ais, tokenWallet } = useCenterStore();

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="card token-ai-banner">
        <div>
          <strong>AI 产线 Token 消耗</strong>
          <p>本月已用 {(tokenWallet.usedThisMonth / 1000).toFixed(1)}k Tokens，通过统一 API 网关调用多模型。</p>
        </div>
        <Link className="btn btn-primary" to="/center/console/tokens">
          充值 / 查看模型目录
        </Link>
      </div>
      <div className="grid grid-4">
        {["剧本辅助", "译制提速", "素材工厂", "合规辅助"].map((line) => (
          <div className="card" key={line}>
            <div className="stat-value">{ais.filter((a) => a.line === line).length}</div>
            <div className="stat-label">{line}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>AI 产线接入与效果</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>机构</th>
                <th>产线</th>
                <th>状态</th>
                <th>效率提升</th>
                <th>负责人</th>
              </tr>
            </thead>
            <tbody>
              {ais.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.org}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{a.id}</div>
                  </td>
                  <td>{a.line}</td>
                  <td>
                    <span className={`tag ${a.status === "已固化" ? "green" : a.status === "试点" ? "amber" : "blue"}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>{a.lift || "评估中"}</td>
                  <td>{a.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
