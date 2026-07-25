import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { p1Api } from "../../api/p1Client";
import { useP1Store } from "../../store/p1Store";
import type { P1Task } from "../../p1/types";

export default function WorkspacePage() {
  const { refreshFlag } = useP1Store();
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    p1Api.workspace().then(setSummary).catch(() => setSummary(null));
  }, [refreshFlag]);

  if (!summary) return <div className="card empty">加载工作台…</div>;

  const overdue = (summary.overdueTasks as P1Task[]) || [];
  const blocked = (summary.blockedTasks as P1Task[]) || [];
  const wallet = summary.wallet as { balance?: number } | null;

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-4">
        <div className="card os-stat">
          <div className="stat-value">{String(summary.projectCount)}</div>
          <div className="stat-label">我的项目</div>
        </div>
        <div className="card os-stat">
          <div className="stat-value">{String(summary.taskTodo)}</div>
          <div className="stat-label">进行中任务</div>
        </div>
        <div className="card os-stat">
          <div className="stat-value">{String(summary.unreadNoticeCount)}</div>
          <div className="stat-label">未读通知</div>
        </div>
        <div className="card os-stat">
          <div className="stat-value">{String(summary.openDemandCount)}</div>
          <div className="stat-label">广场开放需求</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>待办与阻塞</h3>
          {blocked.length === 0 && overdue.length === 0 ? (
            <div className="empty">暂无逾期或阻塞任务</div>
          ) : (
            <>
              {blocked.map((t) => (
                <div className="list-row" key={t.id}>
                  <div>
                    <strong>{t.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                      阻塞：{t.blockedReason || "未说明"} · 截止 {t.dueAt}
                    </div>
                  </div>
                  <span className="tag red">阻塞</span>
                </div>
              ))}
              {overdue.map((t) => (
                <div className="list-row" key={t.id}>
                  <div>
                    <strong>{t.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>截止 {t.dueAt}</div>
                  </div>
                  <span className="tag amber">逾期</span>
                </div>
              ))}
            </>
          )}
        </div>
        <div className="card">
          <h3>快捷入口</h3>
          <div className="os-quick-links">
            <Link className="btn btn-secondary" to="/app/projects">
              我的项目
            </Link>
            <Link className="btn btn-secondary" to="/app/demands">
              需求广场
            </Link>
            <Link className="btn btn-secondary" to="/app/wallet">
              API / 钱包
            </Link>
            <Link className="btn btn-secondary" to="/app/compute">
              算力作业
            </Link>
            <Link className="btn btn-secondary" to="/app/notices">
              联盟通知
            </Link>
          </div>
          <div className="list-row" style={{ marginTop: "1rem" }}>
            <span>钱包余额</span>
            <strong>{wallet?.balance?.toLocaleString?.() ?? "—"}</strong>
          </div>
          <div className="list-row">
            <span>待确认应征</span>
            <strong>{String(summary.pendingApplicationCount)}</strong>
          </div>
          <div className="list-row">
            <span>进行中算力作业</span>
            <strong>{String(summary.activeJobs)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
