import { Link } from "react-router-dom";
import { useOverseasStore } from "../../../store/overseasStore";
import type { OsStage } from "../../../types";

const STAGES: OsStage[] = ["选品", "合规", "译制", "谈判", "上线", "结算"];

export default function OverseasDashboard() {
  const { projects, localizations, platforms, deals, settlements, intakes } = useOverseasStore();

  const stageCounts = STAGES.map((s) => ({
    stage: s,
    count: projects.filter((p) => p.stage === s).length,
  }));
  const pendingLoc = localizations.filter((l) => l.status !== "已交付").length;
  const openDeals = deals.filter((d) => d.stage !== "完结").length;
  const pendingSettle = settlements.filter((s) => s.status === "待核对").length;
  const openIntakes = intakes.filter((i) => i.status === "新建" || i.status === "评估中").length;
  const livePlatforms = platforms.filter((p) => p.status === "合作中").length;

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-4">
        <div className="card os-stat">
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">出海项目</div>
        </div>
        <div className="card os-stat">
          <div className="stat-value">{pendingLoc}</div>
          <div className="stat-label">进行中译制</div>
        </div>
        <div className="card os-stat">
          <div className="stat-value">{openDeals}</div>
          <div className="stat-label">进行中商务</div>
        </div>
        <div className="card os-stat">
          <div className="stat-value">{pendingSettle}</div>
          <div className="stat-label">待核对结算</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>项目阶段漏斗</h3>
          <div className="os-funnel">
            {stageCounts.map((s) => (
              <div key={s.stage} className="os-funnel-row">
                <span>{s.stage}</span>
                <div className="os-funnel-bar">
                  <i style={{ width: `${Math.max(8, s.count * 28)}%` }} />
                </div>
                <strong>{s.count}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>运营快览</h3>
          <div className="list-row">
            <span>合作中平台</span>
            <strong>{livePlatforms}</strong>
          </div>
          <div className="list-row">
            <span>待处理进件</span>
            <strong>{openIntakes}</strong>
          </div>
          <div className="list-row">
            <span>高优先级项目</span>
            <strong>{projects.filter((p) => p.priority === "高").length}</strong>
          </div>
          <div className="list-row">
            <span>本月已打款单</span>
            <strong>{settlements.filter((s) => s.status === "已打款").length}</strong>
          </div>
          <div className="os-quick-links">
            <Link className="btn btn-secondary" to="/overseas/console/projects">
              项目漏斗
            </Link>
            <Link className="btn btn-secondary" to="/overseas/console/intakes">
              客户进件
            </Link>
            <Link className="btn btn-secondary" to="/overseas/console/settlement">
              结算对账
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>重点项目</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>项目</th>
                <th>市场</th>
                <th>阶段</th>
                <th>评分</th>
                <th>进度</th>
                <th>预估收入</th>
              </tr>
            </thead>
            <tbody>
              {projects
                .filter((p) => p.priority === "高")
                .map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.title}</strong>
                      <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{p.org}</div>
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
                    <td>{p.revenueEst}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
