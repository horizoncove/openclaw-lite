import { useOverseasStore } from "../../../store/overseasStore";
import type { LocalizationJob } from "../../../types";

const STATUSES: LocalizationJob["status"][] = ["排队", "进行中", "质检", "已交付"];

export default function OverseasLocalizationPage() {
  const { localizations, updateLocalization } = useOverseasStore();

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-4">
        {STATUSES.map((s) => (
          <div className="card" key={s}>
            <div className="stat-value">{localizations.filter((l) => l.status === s).length}</div>
            <div className="stat-label">{s}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>译制任务看板</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>任务</th>
                <th>语言</th>
                <th>类型</th>
                <th>供应商</th>
                <th>进度</th>
                <th>截止</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {localizations.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {l.id} · {l.projectId}
                    </div>
                  </td>
                  <td>{l.language}</td>
                  <td>
                    <span className="tag blue">{l.type}</span>
                  </td>
                  <td>{l.vendor}</td>
                  <td>
                    <div className="os-progress"><div className="os-progress-track"><i style={{ width: `${l.progress}%` }} /></div><span>{l.progress}%</span>
                    </div>
                  </td>
                  <td>{l.dueAt}</td>
                  <td>
                    <select
                      value={l.status}
                      onChange={(e) =>
                        updateLocalization(l.id, {
                          status: e.target.value as LocalizationJob["status"],
                          progress:
                            e.target.value === "已交付"
                              ? 100
                              : e.target.value === "排队"
                                ? 0
                                : l.progress,
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
