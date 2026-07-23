import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Handshake,
  ClipboardList,
  Stamp,
  Globe2,
  Megaphone,
  Scale,
  Bot,
  ChartColumnIncreasing,
  LogOut,
  RotateCcw,
} from "lucide-react";
import { roleName, useStore } from "../store";

const allianceNav = [
  { to: "/console/alliance/members", label: "会员管理", icon: Users },
  { to: "/console/alliance/events", label: "活动运营", icon: CalendarDays },
  { to: "/console/alliance/matching", label: "供需撮合", icon: Handshake },
];

const centerNav = [
  { to: "/console/centers/approval", label: "审批中心", icon: Stamp },
  { to: "/console/centers/overseas", label: "出海中心", icon: Globe2 },
  { to: "/console/centers/distribution", label: "发行投流", icon: Megaphone },
  { to: "/console/centers/copyright", label: "版权中心", icon: Scale },
  { to: "/console/centers/ai", label: "AI 研发", icon: Bot },
];

const titles: Record<string, string> = {
  "/console": "运营总览",
  "/console/orders": "工单中枢",
  "/console/kpi": "KPI 看板",
  "/console/alliance/members": "联盟 · 会员管理",
  "/console/alliance/events": "联盟 · 活动运营",
  "/console/alliance/matching": "联盟 · 供需撮合",
  "/console/centers/approval": "审批中心运营",
  "/console/centers/overseas": "出海中心运营",
  "/console/centers/distribution": "发行投流中心运营",
  "/console/centers/copyright": "版权中心运营",
  "/console/centers/ai": "AI 研发中心运营",
};

export default function AppLayout() {
  const { user, logout, resetDemo, apiOnline, loading } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const title = titles[loc.pathname] ?? "运营 SaaS";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>西安微短剧产业服务中心</h1>
          <p>联盟运行 SaaS · 五大中心运营 SaaS</p>
        </div>
        <nav className="nav">
          <div className="nav-group">
            <div className="nav-label">总控</div>
            <NavLink to="/console" end className={({ isActive }) => (isActive ? "active" : undefined)}>
              <LayoutDashboard size={16} /> 运营总览
            </NavLink>
            <NavLink to="/console/orders" className={({ isActive }) => (isActive ? "active" : undefined)}>
              <ClipboardList size={16} /> 工单中枢
            </NavLink>
            <NavLink to="/console/kpi" className={({ isActive }) => (isActive ? "active" : undefined)}>
              <ChartColumnIncreasing size={16} /> KPI 看板
            </NavLink>
          </div>
          <div className="nav-group">
            <div className="nav-label">联盟运行</div>
            {allianceNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                <item.icon size={16} /> {item.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-group">
            <div className="nav-label">五大中心</div>
            {centerNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                <item.icon size={16} /> {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="sidebar-foot">
          <strong>{user?.name}</strong>
          {user ? roleName(user.role) : ""}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h2>{title}</h2>
        <div className="topbar-actions">
          <span className={`api-badge ${apiOnline ? "on" : "off"}`}>
            {apiOnline ? "API 在线" : "离线模式"}
          </span>
          <button className="btn btn-secondary" onClick={() => resetDemo()}>
              <RotateCcw size={15} /> 重置演示数据
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                logout();
                nav("/login");
              }}
            >
              <LogOut size={15} /> 退出
            </button>
          </div>
        </header>
        <main className="content">
          {loading ? (
            <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
              正在连接服务平台…
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
