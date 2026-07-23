import { Link } from "react-router-dom";
import { CalendarHeart, Megaphone, LifeBuoy, ShieldCheck } from "lucide-react";
import { useAllianceStore } from "../../../store/allianceStore";
import { findMemberOrg } from "../../../utils/memberContext";

export default function MemberHomePage() {
  const { user, members, events, matches, orders } = useAllianceStore();
  const org = findMemberOrg(user, members);
  const myMatches = matches.filter((m) => m.org === org?.name);
  const myOrders = orders.filter((o) => o.org === org?.name);
  const openEvents = events.filter((e) => e.status === "报名中" || e.status === "筹备");

  return (
    <div className="member-page">
      <section className="member-hero-card">
        <div>
          <p className="member-hero-label">欢迎回来</p>
          <h3>{user?.name}，{org?.name ?? "会员企业"}</h3>
          <p className="member-hero-desc">
            这里是您的会员服务门户：查看权益、报名活动、发布供需、提交服务申请。
          </p>
          <div className="member-tags">
            <span className={`tag ${org?.status === "有效" ? "green" : "amber"}`}>
              {org?.status ?? "待认证"}
            </span>
            <span className="tag">{org?.tier ?? "会员"}</span>
            {org?.tags?.slice(0, 3).map((t) => (
              <span className="tag gray" key={t}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="member-hero-stat">
          <div className="stat-value">{myOrders.filter((o) => !["完结", "关闭"].includes(o.status)).length}</div>
          <div className="stat-label">进行中申请</div>
        </div>
      </section>

      <div className="member-quick-grid">
        <Link to="/alliance/member/events" className="member-quick-card">
          <CalendarHeart size={22} />
          <strong>活动报名</strong>
          <span>{openEvents.length} 场可报名</span>
        </Link>
        <Link to="/alliance/member/needs" className="member-quick-card">
          <Megaphone size={22} />
          <strong>发布供需</strong>
          <span>{myMatches.length} 条我的发布</span>
        </Link>
        <Link to="/alliance/member/services" className="member-quick-card">
          <LifeBuoy size={22} />
          <strong>服务申请</strong>
          <span>入会 / 对接 / 咨询</span>
        </Link>
        <Link to="/alliance/member/profile" className="member-quick-card">
          <ShieldCheck size={22} />
          <strong>企业档案</strong>
          <span>查看会员权益</span>
        </Link>
      </div>

      <div className="grid grid-2">
        <div className="member-card">
          <h3>近期联盟活动</h3>
          {openEvents.slice(0, 3).map((e) => (
            <div className="list-row" key={e.id}>
              <div>
                <strong>{e.title}</strong>
                <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  {e.date} · {e.place}
                </div>
              </div>
              <span className="tag green">{e.status}</span>
            </div>
          ))}
          <Link className="btn btn-secondary" to="/alliance/member/events" style={{ marginTop: "0.75rem" }}>
            查看全部活动
          </Link>
        </div>

        <div className="member-card">
          <h3>我的服务进度</h3>
          {myOrders.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>暂无服务申请，可前往「服务申请」提交。</p>
          ) : (
            myOrders.slice(0, 4).map((o) => (
              <div className="list-row" key={o.id}>
                <div>
                  <strong>{o.product}</strong>
                  <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{o.id}</div>
                </div>
                <span className="tag blue">{o.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
