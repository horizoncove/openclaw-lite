import { useOverseasStore } from "../../../store/overseasStore";
import type { IntakeRequest } from "../../../types";

const STATUSES: IntakeRequest["status"][] = ["新建", "评估中", "已立项", "关闭"];

export default function OverseasIntakesPage() {
  const { intakes, updateIntake } = useOverseasStore();

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-4">
        {STATUSES.map((s) => (
          <div className="card" key={s}>
            <div className="stat-value">{intakes.filter((i) => i.status === s).length}</div>
            <div className="stat-label">{s}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>客户进件队列</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>需求</th>
                <th>机构 / 联系人</th>
                <th>目标市场</th>
                <th>提交日</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {intakes.map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong>{i.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 4 }}>
                      {i.need}
                    </div>
                  </td>
                  <td>
                    {i.org}
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{i.contact}</div>
                  </td>
                  <td>{i.market}</td>
                  <td>{i.createdAt}</td>
                  <td>
                    <select
                      value={i.status}
                      onChange={(e) =>
                        updateIntake(i.id, {
                          status: e.target.value as IntakeRequest["status"],
                        })
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
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
