import { useStore } from "../../store";
import type { ApprovalCase } from "../../types";

export default function ApprovalPage() {
  const { approvals, updateApproval, orders } = useStore();
  const related = orders.filter((o) => o.center === "审批");

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-3">
        <div className="card">
          <div className="stat-value">{approvals.length}</div>
          <div className="stat-label">预检案件</div>
        </div>
        <div className="card">
          <div className="stat-value">{approvals.filter((a) => a.stage !== "已送审" && a.stage !== "已出具意见").length}</div>
          <div className="stat-label">处理中</div>
        </div>
        <div className="card">
          <div className="stat-value">{related.length}</div>
          <div className="stat-label">关联工单</div>
        </div>
      </div>

      <div className="card">
        <h3>备案预检流水线</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>项目</th>
                <th>机构</th>
                <th>风险</th>
                <th>阶段</th>
                <th>意见</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{a.id}</div>
                  </td>
                  <td>{a.org}</td>
                  <td>
                    <span className={`tag ${a.risk === "高" ? "red" : a.risk === "中" ? "amber" : "green"}`}>
                      {a.risk}
                    </span>
                  </td>
                  <td>
                    <select
                      value={a.stage}
                      onChange={(e) =>
                        updateApproval(a.id, {
                          stage: e.target.value as ApprovalCase["stage"],
                          updatedAt: new Date().toISOString().slice(0, 10),
                        })
                      }
                    >
                      {["收件", "预检中", "会诊", "已出具意见", "已送审"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={a.result || ""}
                      onChange={(e) =>
                        updateApproval(a.id, {
                          result: (e.target.value || undefined) as ApprovalCase["result"],
                          stage: "已出具意见",
                          updatedAt: new Date().toISOString().slice(0, 10),
                        })
                      }
                    >
                      <option value="">未出具</option>
                      {["通过建议", "修改后送审", "高风险暂缓"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>{a.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
