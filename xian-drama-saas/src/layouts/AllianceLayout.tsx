import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Handshake,
  ClipboardList,
  ChartColumnIncreasing,
  LogOut,
  RotateCcw,
} from "lucide-react";
import { useAllianceStore } from "../store/allianceStore";
import { ALLIANCE_ROLE_LABEL } from "../types";

const nav = [
  { to: "/alliance/console", label: "联盟总览", icon: LayoutDashboard, end: true },
  { to: "/alliance/console/members", label: "会员管理", icon: Users },
  { to: "/alliance/console/events", label: "活动运营", icon: CalendarDays },
  { to: "/alliance/console/matching", label: "供需撮合", icon: Handshake },
  { to: "/alliance/console/orders", label: "联盟工单", icon: ClipboardList },
  { to: "/alliance/console/kpi", label: "KPI 看板", icon: ChartColumnIncreasing },
];

const titles: Record<string, string> = {
  "/alliance/console": "联盟运营总览",
  "/alliance/console/members": "会员管理",
  "/alliance/console/events": "活动运营",
  "/alliance/console/matching": "供需撮合",
  "/alliance/console/orders": "联盟工单",
  "/alliance/console/kpi": "联盟 KPI",
};

export default function AllianceLayout() {
  const { user, logout, resetDemo, apiOnline, loading } = useAllianceStore();
  const navFn = useNavigate();
  const loc = useLocation();
  const title = titles[loc.pathname] ?? "联盟运行 SaaS";

  return (
    <div className="app-shell">
      <aside className="sidebar alliance-sidebar">
        <div className="brand">
          <h1>产业联盟</h1>
          <p>会员 · 活动 · 撮合</p>
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
          {user ? ALLIANCE_ROLE_LABEL[user.role] : ""}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h2>{title}</h2>
          <div className="topbar-actions">
            <span className={`api-badge ${apiOnline ? "on" : "off"}`}>
              {apiOnline ? "联盟 API" : "离线模式"}
            </span>
            <button className="btn btn-secondary" onClick={() => resetDemo()}>
              <RotateCcw size={15} /> 重置演示数据
            </button>
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
            <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
              正在连接联盟服务平台…
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
