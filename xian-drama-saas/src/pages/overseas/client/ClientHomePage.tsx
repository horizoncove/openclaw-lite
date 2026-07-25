import { Link } from "react-router-dom";
import { FilePlus2, FolderKanban } from "lucide-react";
import { useOverseasStore } from "../../../store/overseasStore";

export default function ClientHomePage() {
  const { user, projects, intakes } = useOverseasStore();
  const myProjects = projects.filter((p) => p.org === user?.org);
  const myIntakes = intakes.filter((i) => i.org === user?.org);

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="member-hero-card os-client-hero">
        <div>
          <p className="member-hero-label">制片方门户</p>
          <h3>{user?.org ?? "我的机构"}</h3>
          <p className="member-hero-desc">提交出海需求，跟踪选品、译制与上线进度。</p>
        </div>
        <div className="member-hero-stat">
          <div className="stat-value">{myProjects.length}</div>
          <div className="stat-label">进行中项目</div>
        </div>
      </div>

      <div className="member-quick-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Link className="member-quick-card" to="/overseas/client/submit">
          <FilePlus2 size={22} />
          <strong>提交出海需求</strong>
          <span>选品诊断 / 译制 / 平台对接</span>
        </Link>
        <Link className="member-quick-card" to="/overseas/client/projects">
          <FolderKanban size={22} />
          <strong>查看我的项目</strong>
          <span>阶段进度与市场信息</span>
        </Link>
      </div>

      <div className="card">
        <h3>我的进件</h3>
        {myIntakes.length === 0 ? (
          <div className="empty">暂无进件，先提交一条出海需求吧。</div>
        ) : (
          myIntakes.map((i) => (
            <div className="list-row" key={i.id}>
              <div>
                <strong>{i.title}</strong>
                <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  {i.market} · {i.createdAt}
                </div>
              </div>
              <span className="tag">{i.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
