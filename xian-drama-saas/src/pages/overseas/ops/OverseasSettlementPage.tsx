import { useOverseasStore } from "../../../store/overseasStore";
import type { SettlementRecord } from "../../../types";

const STATUSES: SettlementRecord["status"][] = ["待核对", "已确认", "已打款"];

export default function OverseasSettlementPage() {
  const { settlements, updateSettlement } = useOverseasStore();

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-3">
        {STATUSES.map((s) => (
          <div className="card" key={s}>
            <div className="stat-value">{settlements.filter((x) => x.status === s).length}</div>
            <div className="stat-label">{s}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>结算对账单</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>项目</th>
                <th>平台</th>
                <th>账期</th>
                <th>流水</th>
                <th>分成/到账</th>
                <th>状态</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{s.projectId}</div>
                  </td>
                  <td>{s.platform}</td>
                  <td>{s.period}</td>
                  <td>{s.gross}</td>
                  <td>
                    <strong>{s.share}</strong>
                  </td>
                  <td>
                    <select
                      value={s.status}
                      onChange={(e) =>
                        updateSettlement(s.id, {
                          status: e.target.value as SettlementRecord["status"],
                          updatedAt: new Date().toISOString().slice(0, 10),
                        })
                      }
                    >
                      {STATUSES.map((st) => (
                        <option key={st}>{st}</option>
                      ))}
                    </select>
                  </td>
                  <td>{s.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
