import { useOverseasStore } from "../../../store/overseasStore";
import type { OverseasDeal } from "../../../types";

const STAGES: OverseasDeal["stage"][] = ["意向", "条款", "签约", "履约", "完结"];

export default function OverseasDealsPage() {
  const { deals, updateDeal } = useOverseasStore();

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-4">
        {["意向", "条款", "签约", "履约"].map((s) => (
          <div className="card" key={s}>
            <div className="stat-value">{deals.filter((d) => d.stage === s).length}</div>
            <div className="stat-label">{s}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>商务谈判管道</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>交易</th>
                <th>平台</th>
                <th>类型</th>
                <th>金额/条款</th>
                <th>负责人</th>
                <th>阶段</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {d.id} · {d.projectId}
                    </div>
                  </td>
                  <td>{d.platform}</td>
                  <td>
                    <span className="tag blue">{d.type}</span>
                  </td>
                  <td>{d.amount}</td>
                  <td>{d.owner}</td>
                  <td>
                    <select
                      value={d.stage}
                      onChange={(e) =>
                        updateDeal(d.id, {
                          stage: e.target.value as OverseasDeal["stage"],
                          updatedAt: new Date().toISOString().slice(0, 10),
                        })
                      }
                    >
                      {STAGES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>{d.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
