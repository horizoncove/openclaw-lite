import { useMemo, useState } from "react";
import { useOverseasStore } from "../../../store/overseasStore";
import type { OsProject, OsStage } from "../../../types";

const STAGES: OsStage[] = ["选品", "合规", "译制", "谈判", "上线", "结算"];

export default function OverseasProjectsPage() {
  const { projects, updateProject } = useOverseasStore();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("全部");
  const [selected, setSelected] = useState<OsProject | null>(null);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const okQ =
        !q ||
        p.title.includes(q) ||
        p.org.includes(q) ||
        p.market.includes(q) ||
        p.id.toLowerCase().includes(q.toLowerCase());
      const okS = stage === "全部" || p.stage === stage;
      return okQ && okS;
    });
  }, [projects, q, stage]);

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-4">
        {STAGES.slice(0, 4).map((s) => (
          <div className="card" key={s}>
            <div className="stat-value">{projects.filter((p) => p.stage === s).length}</div>
            <div className="stat-label">{s}阶段</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <input
            placeholder="搜索项目 / 机构 / 市场"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option>全部</option>
            {STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>项目</th>
                <th>目标市场</th>
                <th>题材</th>
                <th>评分</th>
                <th>优先级</th>
                <th>阶段</th>
                <th>负责人</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {p.id} · {p.org}
                    </div>
                  </td>
                  <td>{p.market}</td>
                  <td>{p.genre}</td>
                  <td>{p.score}</td>
                  <td>
                    <span
                      className={`tag ${p.priority === "高" ? "red" : p.priority === "中" ? "amber" : "gray"}`}
                    >
                      {p.priority}
                    </span>
                  </td>
                  <td>
                    <select
                      value={p.stage}
                      onChange={(e) =>
                        updateProject(p.id, {
                          stage: e.target.value as OsStage,
                          updatedAt: new Date().toISOString().slice(0, 10),
                        })
                      }
                    >
                      {STAGES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>{p.owner}</td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => setSelected(p)}>
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal os-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{selected.title}</h3>
            <p className="os-modal-meta">
              {selected.id} · {selected.org} · {selected.market}
            </p>
            <div className="os-detail-grid">
              <div>
                <label>题材 / 集数</label>
                <p>
                  {selected.genre} · {selected.episodes} 集
                </p>
              </div>
              <div>
                <label>语言</label>
                <p>{selected.languages.join(" / ")}</p>
              </div>
              <div>
                <label>目标平台</label>
                <p>{selected.platforms.length ? selected.platforms.join("、") : "待匹配"}</p>
              </div>
              <div>
                <label>预估收入</label>
                <p>{selected.revenueEst}</p>
              </div>
            </div>
            <div className="field">
              <label>项目摘要</label>
              <p>{selected.summary}</p>
            </div>
            <div className="os-progress" style={{ marginBottom: "1rem" }}><div className="os-progress-track"><i style={{ width: `${selected.progress}%` }} /></div><span>进度 {selected.progress}%</span>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
