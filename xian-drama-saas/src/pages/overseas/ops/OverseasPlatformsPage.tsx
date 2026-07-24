import { useOverseasStore } from "../../../store/overseasStore";

export default function OverseasPlatformsPage() {
  const { platforms } = useOverseasStore();

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid grid-3">
        <div className="card">
          <div className="stat-value">{platforms.filter((p) => p.status === "合作中").length}</div>
          <div className="stat-label">合作中平台</div>
        </div>
        <div className="card">
          <div className="stat-value">{platforms.filter((p) => p.status === "洽谈中").length}</div>
          <div className="stat-label">洽谈中</div>
        </div>
        <div className="card">
          <div className="stat-value">
            {platforms.reduce((n, p) => n + p.titlesLive, 0)}
          </div>
          <div className="stat-label">在播标题数</div>
        </div>
      </div>

      <div className="os-platform-grid">
        {platforms.map((p) => (
          <article key={p.id} className="card os-platform-card">
            <div className="os-platform-head">
              <h3>{p.name}</h3>
              <span
                className={`tag ${p.status === "合作中" ? "green" : p.status === "洽谈中" ? "amber" : "gray"}`}
              >
                {p.status}
              </span>
            </div>
            <p className="os-platform-region">{p.region}</p>
            <div className="os-detail-grid">
              <div>
                <label>合作模式</label>
                <p>{p.model}</p>
              </div>
              <div>
                <label>对接人</label>
                <p>{p.contact}</p>
              </div>
              <div>
                <label>在播</label>
                <p>{p.titlesLive} 部</p>
              </div>
              <div>
                <label>月收入</label>
                <p>{p.monthlyRevenue}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
