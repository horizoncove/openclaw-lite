import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useCenterStore } from "../../store/centerStore";
import type { OverseasProject } from "../../types";

export default function OverseasPage() {
  const { overseas, updateOverseas } = useCenterStore();

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="card os-upgrade-banner">
        <div>
          <h3 style={{ marginBottom: "0.35rem" }}>出海服务中心 SaaS 已上线</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            完整能力（项目漏斗、译制、平台、谈判、结算、进件）已迁移至独立出海门户。
          </p>
        </div>
        <Link className="btn btn-primary" to="/overseas">
          打开出海服务中心 <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-4">
        {["选品", "译制", "谈判", "上线"].map((stage) => (
          <div className="card" key={stage}>
            <div className="stat-value">{overseas.filter((o) => o.stage === stage).length}</div>
            <div className="stat-label">{stage}阶段</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>出海项目漏斗（中心侧摘要）</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>项目</th>
                <th>目标市场</th>
                <th>评分</th>
                <th>阶段</th>
                <th>负责人</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              {overseas.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{o.id}</div>
                  </td>
                  <td>{o.market}</td>
                  <td>{o.score}</td>
                  <td>
                    <select
                      value={o.stage}
                      onChange={(e) =>
                        updateOverseas(o.id, {
                          stage: e.target.value as OverseasProject["stage"],
                          updatedAt: new Date().toISOString().slice(0, 10),
                        })
                      }
                    >
                      {["选品", "合规", "译制", "谈判", "上线", "结算"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>{o.owner}</td>
                  <td>{o.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
