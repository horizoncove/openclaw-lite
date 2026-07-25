import { useEffect, useState } from "react";
import { p1Api } from "../../api/p1Client";
import { useP1Store } from "../../store/p1Store";
import type { P1Project, P1Task, ProjectStatus, TaskStatus } from "../../p1/types";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "筹备",
  in_production: "制作中",
  post: "后期",
  distributing: "发行/出海",
  closed: "结案",
};

export default function ProjectsPage() {
  const { bump, refreshFlag } = useP1Store();
  const [projects, setProjects] = useState<P1Project[]>([]);
  const [tasks, setTasks] = useState<P1Task[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("自制");
  const [selected, setSelected] = useState<string>("");
  const [taskTitle, setTaskTitle] = useState("");

  const load = async () => {
    const [p, t] = await Promise.all([p1Api.projects.list(), p1Api.tasks.list()]);
    setProjects(p);
    setTasks(t);
    if (!selected && p[0]) setSelected(p[0].id);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [refreshFlag]);

  const projectTasks = tasks.filter((t) => t.projectId === selected);

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="card">
        <h3>新建项目</h3>
        <div className="toolbar">
          <input placeholder="项目名称" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {["自制", "承制", "出海", "投放", "版权", "其他"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (!title.trim()) return;
              await p1Api.projects.create({ title: title.trim(), type, summary: "" });
              setTitle("");
              bump();
              await load();
            }}
          >
            创建
          </button>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>项目列表</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>项目</th>
                  <th>类型</th>
                  <th>阶段</th>
                  <th>进度</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr
                    key={p.id}
                    style={{ cursor: "pointer", background: selected === p.id ? "#ecfeff" : undefined }}
                    onClick={() => setSelected(p.id)}
                  >
                    <td>
                      <strong>{p.title}</strong>
                      <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{p.summary}</div>
                    </td>
                    <td>{p.type}</td>
                    <td>
                      <select
                        value={p.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                          await p1Api.projects.patch(p.id, {
                            status: e.target.value as ProjectStatus,
                          });
                          bump();
                          await load();
                        }}
                      >
                        {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{p.progress}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>项目任务</h3>
          <div className="toolbar">
            <input
              placeholder="新任务标题"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <button
              className="btn btn-secondary"
              disabled={!selected}
              onClick={async () => {
                if (!taskTitle.trim() || !selected) return;
                const due = new Date();
                due.setDate(due.getDate() + 7);
                await p1Api.tasks.create({
                  projectId: selected,
                  title: taskTitle.trim(),
                  dueAt: due.toISOString().slice(0, 10),
                });
                setTaskTitle("");
                bump();
                await load();
              }}
            >
              添加任务
            </button>
          </div>
          {projectTasks.map((t) => (
            <div className="list-row" key={t.id}>
              <div>
                <strong>{t.title}</strong>
                <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  {t.assigneeName} · 截止 {t.dueAt}
                </div>
              </div>
              <select
                value={t.status}
                onChange={async (e) => {
                  await p1Api.tasks.patch(t.id, { status: e.target.value as TaskStatus });
                  bump();
                  await load();
                }}
              >
                {["todo", "doing", "blocked", "done", "cancelled"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {projectTasks.length === 0 && <div className="empty">选择项目后查看或添加任务</div>}
        </div>
      </div>
    </div>
  );
}
