import { MapPin, Phone, Sparkles, Star } from "lucide-react";
import { useAllianceStore } from "../../../store/allianceStore";

export default function MemberDiscoverPage() {
  const { works, venues } = useAllianceStore();
  const featuredWorks = works.filter((w) => w.featured);
  const featuredVenues = venues.filter((v) => v.featured);

  return (
    <div className="member-page">
      <section className="member-hero-card discover-hero">
        <div>
          <p className="member-hero-label">联盟推荐</p>
          <h3>作品推荐 · 场地推荐</h3>
          <p className="member-hero-desc">
            秘书处精选优质短剧与西安取景场地，助力会员找片、找景、找合作。
          </p>
        </div>
        <div className="member-hero-stat">
          <div className="stat-value">{featuredWorks.length}</div>
          <div className="stat-label">精选作品</div>
        </div>
      </section>

      <div className="member-card">
        <div className="discover-section-head">
          <Sparkles size={18} />
          <h3>秘书处推荐作品</h3>
        </div>
        <div className="work-grid compact">
          {featuredWorks.map((w) => (
            <article className="work-card horizontal" key={w.id}>
              <div className="work-cover sm" style={{ background: w.coverColor }}>
                <Star size={14} />
              </div>
              <div className="work-body">
                <h4>{w.title}</h4>
                <p className="work-org">{w.org} · {w.genre} · {w.episodes}集</p>
                <p className="work-summary">{w.summary}</p>
                <div className="work-meta">
                  <span className="tag green">{w.status}</span>
                  {w.playCount && <span>播放 {w.playCount}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="member-card" style={{ marginTop: "1rem" }}>
        <div className="discover-section-head">
          <MapPin size={18} />
          <h3>取景场地推荐</h3>
        </div>
        <div className="venue-grid">
          {venues.map((v) => (
            <article className={`venue-card ${v.featured ? "featured" : ""}`} key={v.id}>
              <div className="venue-card-head">
                <div>
                  <h4>{v.name}</h4>
                  <p>{v.district} · {v.type} · {v.area}</p>
                </div>
                <span className={`tag ${v.status === "可预约" ? "green" : v.status === "紧张" ? "amber" : "red"}`}>
                  {v.status}
                </span>
              </div>
              <p className="venue-summary">{v.summary}</p>
              <div className="member-tags" style={{ marginBottom: "0.5rem" }}>
                {v.tags.map((t) => (
                  <span className="tag gray" key={t}>{t}</span>
                ))}
              </div>
              <div className="venue-card-foot">
                <strong>{v.price}</strong>
                <span><Phone size={13} /> {v.contact} {v.phone}</span>
              </div>
              {v.featured && <span className="venue-featured-badge">联盟推荐</span>}
            </article>
          ))}
        </div>
      </div>

      {featuredVenues.length > 0 && (
        <div className="member-card" style={{ marginTop: "1rem" }}>
          <h3>热门场地速览</h3>
          {featuredVenues.map((v) => (
            <div className="list-row" key={v.id}>
              <div>
                <strong>{v.name}</strong>
                <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  {v.district} · {v.type} · {v.price}
                </div>
              </div>
              <span className="tag green">{v.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
