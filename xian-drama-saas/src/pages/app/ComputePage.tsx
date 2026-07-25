import { useEffect, useState } from "react";
import { p1Api } from "../../api/p1Client";
import { useP1Store } from "../../store/p1Store";
import type { P1ComputeJob, P1Project } from "../../p1/types";

export default function ComputePage() {
  const { user, bump, refreshFlag } = useP1Store();
  const [jobs, setJobs] = useState<P1ComputeJob[]>([]);
  const [projects, setProjects] = useState<P1Project[]>([]);
  const [jobType, setJobType] = useState("subtitle_batch");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");

  const load = async () => {
    const [j, p] = await Promise.all([p1Api.compute.list(), p1Api.projects.list()]);
    setJobs(j);
    setProjects(p);
    if (!projectId && p[0]) setProjectId(p[0].id);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [refreshFlag]);

  const isOps = user?.role === "ops" || user?.role === "secretariat";

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <p className="member-page-intro">
        算力调度最小闭环：提交作业入队 → 运维推进 running/succeeded。预扣费用，取消未开始作业可退回。
      </p>

      {user?.orgId && (
        <div className="card">
          <h3>提交算力作业</h3>
          <div className="toolbar">
            <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
              {[
                "subtitle_batch",
                "dubbing_qc",
                "poster_gen",
                "compliance_scan",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high")}
            >
              <option value="low">低优先级</option>
              <option value="normal">普通</option>
              <option value="high">高优先级</option>
            </select>
            <button
              className="btn btn-primary"
              onClick={async () => {
                await p1Api.compute.create({
                  jobType,
                  projectId: projectId || null,
                  priority,
                  cost: priority === "high" ? 12000 : 5000,
                  payload: { source: "member-ui" },
                });
                bump();
                await load();
              }}
            >
              提交（预扣费）
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h3>作业队列</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>作业</th>
                <th>类型</th>
                <th>优先级</th>
                <th>费用</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>
                    <strong>{j.id}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {j.projectId || "无项目"} · {j.createdAt.slice(0, 19)}
                    </div>
                  </td>
                  <td>{j.jobType}</td>
                  <td>{j.priority}</td>
                  <td>{j.cost.toLocaleString()}</td>
                  <td>
                    <span
                      className={`tag ${
                        j.status === "succeeded"
                          ? "green"
                          : j.status === "failed"
                            ? "red"
                            : j.status === "running"
                              ? "amber"
                              : "blue"
                      }`}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td>
                    <div className="toolbar" style={{ margin: 0 }}>
                      {isOps && j.status === "queued" && (
                        <button
                          className="btn btn-secondary"
                          onClick={async () => {
                            await p1Api.compute.transition(j.id, "running");
                            bump();
                            await load();
                          }}
                        >
                          开始
                        </button>
                      )}
                      {isOps && j.status === "running" && (
                        <>
                          <button
                            className="btn btn-primary"
                            onClick={async () => {
                              await p1Api.compute.transition(j.id, "succeeded");
                              bump();
                              await load();
                            }}
                          >
                            完成
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={async () => {
                              await p1Api.compute.transition(j.id, "failed", "节点执行失败");
                              bump();
                              await load();
                            }}
                          >
                            失败
                          </button>
                        </>
                      )}
                      {j.status === "queued" && j.orgId === user?.orgId && (
                        <button
                          className="btn btn-ghost"
                          onClick={async () => {
                            await p1Api.compute.transition(j.id, "cancelled");
                            bump();
                            await load();
                          }}
                        >
                          取消
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {jobs.length === 0 && <div className="empty">暂无作业</div>}
        {!isOps && (
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
            提示：用「韩磊 / ops」账号登录可推进作业状态（模拟算力节点）。
          </p>
        )}
      </div>
    </div>
  );
}
