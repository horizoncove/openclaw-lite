import { Link } from "react-router-dom";
import { CalendarHeart, Megaphone, LifeBuoy, ShieldCheck, Film, Sparkles, Wallet } from "lucide-react";
import { useAllianceStore } from "../../../store/allianceStore";
import { findMemberOrg } from "../../../utils/memberContext";

export default function MemberHomePage() {
  const { user, members, events, matches, orders, works, venues, deals, orgWallets } = useAllianceStore();
  const org = findMemberOrg(user, members);
  const myMatches = matches.filter((m) => m.org === org?.name);
  const myOrders = orders.filter((o) => o.org === org?.name);
  const myWorks = works.filter((w) => w.org === org?.name);
  const myDeals = deals.filter((d) => d.buyerOrg === org?.name || d.supplierOrg === org?.name);
  const wallet = orgWallets.find((w) => w.org === org?.name);
  const openEvents = events.filter((e) => e.status === "报名中" || e.status === "筹备");
  const featuredWorks = works.filter((w) => w.featured).slice(0, 3);

  return (
    <div className="member-page">
      <section className="member-hero-card">
        <div>
          <p className="member-hero-label">欢迎回来</p>
          <h3>{user?.name}，{org?.name ?? "会员企业"}</h3>
          <p className="member-hero-desc">
            这里是您的会员门户：展示作品、发现场地、跟踪项目预算与 Token 流向。
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
          <div className="stat-value">{myDeals.length}</div>
          <div className="stat-label">在途项目</div>
        </div>
      </section>

      <div className="member-quick-grid">
        <Link to="/alliance/member/wallets" className="member-quick-card">
          <Wallet size={22} />
          <strong>托管钱包</strong>
          <span>
            可用 {((wallet?.balance ?? 0) / 1000).toFixed(0)}k · 锁{" "}
            {(((wallet?.locked ?? 0) / 1000) || 0).toFixed(0)}k
          </span>
        </Link>
        <Link to="/alliance/member/works" className="member-quick-card">
          <Film size={22} />
          <strong>作品展示</strong>
          <span>{myWorks.length} 部我的作品</span>
        </Link>
        <Link to="/alliance/member/discover" className="member-quick-card">
          <Sparkles size={22} />
          <strong>推荐发现</strong>
          <span>{venues.filter((v) => v.featured).length} 个推荐场地</span>
        </Link>
        <Link to="/alliance/member/needs" className="member-quick-card">
          <Megaphone size={22} />
          <strong>发布供需</strong>
          <span>{myMatches.length} 条我的发布</span>
        </Link>
      </div>

      <div className="member-quick-grid secondary">
        <Link to="/alliance/member/events" className="member-quick-card">
          <CalendarHeart size={22} />
          <strong>活动报名</strong>
          <span>{openEvents.length} 场可报名</span>
        </Link>
        <Link to="/alliance/member/services" className="member-quick-card">
          <LifeBuoy size={22} />
          <strong>服务申请</strong>
          <span>{myOrders.filter((o) => !["完结", "关闭"].includes(o.status)).length} 进行中</span>
        </Link>
        <Link to="/alliance/member/profile" className="member-quick-card">
          <ShieldCheck size={22} />
          <strong>企业档案</strong>
          <span>查看会员权益</span>
        </Link>
      </div>

      <div className="grid grid-2">
        <div className="member-card">
          <h3>秘书处推荐作品</h3>
          {featuredWorks.map((w) => (
            <div className="list-row" key={w.id}>
              <div>
                <strong>{w.title}</strong>
                <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  {w.org} · {w.genre} · {w.playCount ? `播放 ${w.playCount}` : w.status}
                </div>
              </div>
              <span className="tag green">精选</span>
            </div>
          ))}
          <Link className="btn btn-secondary" to="/alliance/member/discover" style={{ marginTop: "0.75rem" }}>
            查看更多推荐
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
