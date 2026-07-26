import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Building2,
  CalendarHeart,
  Megaphone,
  LifeBuoy,
  Film,
  Sparkles,
  Wallet,
  LogOut,
} from "lucide-react";
import { useAllianceStore } from "../store/allianceStore";
import { findMemberOrg } from "../utils/memberContext";

const nav = [
  { to: "/alliance/member", label: "会员首页", icon: Home, end: true },
  { to: "/alliance/member/profile", label: "企业档案", icon: Building2 },
  { to: "/alliance/member/events", label: "活动报名", icon: CalendarHeart },
  { to: "/alliance/member/needs", label: "发布供需", icon: Megaphone },
  { to: "/alliance/member/works", label: "作品展示", icon: Film },
  { to: "/alliance/member/discover", label: "推荐发现", icon: Sparkles },
  { to: "/alliance/member/deals", label: "项目钱包", icon: Wallet },
  { to: "/alliance/member/services", label: "服务申请", icon: LifeBuoy },
];

const titles: Record<string, string> = {
  "/alliance/member": "会员服务中心",
  "/alliance/member/profile": "我的企业档案",
  "/alliance/member/events": "联盟活动报名",
  "/alliance/member/needs": "供需发布",
  "/alliance/member/works": "会员作品展示",
  "/alliance/member/discover": "作品与场地推荐",
  "/alliance/member/deals": "我的项目与钱包",
  "/alliance/member/services": "服务申请与进度",
};

export default function MemberLayout() {
  const { user, logout, members, loading, apiOnline } = useAllianceStore();
  const navFn = useNavigate();
  const loc = useLocation();
  const org = findMemberOrg(user, members);
  const title = titles[loc.pathname] ?? "会员服务中心";

  if (user?.role === "alliance") {
    navFn("/alliance/console", { replace: true });
    return null;
  }

  return (
    <div className="app-shell member-shell">
      <aside className="sidebar member-sidebar">
        <div className="brand member-brand">
          <p className="member-badge">会员单位</p>
          <h1>{org?.name ?? user?.org ?? "会员企业"}</h1>
          <p>{org?.tier ?? "联盟会员"} · 西安微短剧产业联盟</p>
        </div>
        <nav className="nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              <item.icon size={16} /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <strong>{user?.name}</strong>
          企业联系人
        </div>
      </aside>

      <div className="main member-main">
        <header className="topbar member-topbar">
          <div>
            <p className="member-top-eyebrow">MEMBER PORTAL</p>
            <h2>{title}</h2>
          </div>
          <div className="topbar-actions">
            <span className={`api-badge ${apiOnline ? "on" : "off"}`}>
              {apiOnline ? "已连接" : "离线"}
            </span>
            <button
              className="btn btn-ghost"
              onClick={() => {
                logout();
                navFn("/alliance/login");
              }}
            >
              <LogOut size={15} /> 退出
            </button>
          </div>
        </header>
        <main className="content">
          {loading ? (
            <div className="member-card" style={{ textAlign: "center", color: "var(--muted)" }}>
              正在加载会员服务…
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
