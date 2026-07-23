import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Stamp,
  Globe2,
  Megaphone,
  Scale,
  Bot,
  ClipboardList,
  ChartColumnIncreasing,
  LogOut,
  RotateCcw,
} from "lucide-react";
import { useCenterStore } from "../store/centerStore";
import { CENTER_ROLE_LABEL } from "../types";

const nav = [
  { to: "/center/console", label: "中心总览", icon: LayoutDashboard, end: true },
  { to: "/center/console/approval", label: "审批中心", icon: Stamp },
  { to: "/center/console/overseas", label: "出海中心", icon: Globe2 },
  { to: "/center/console/distribution", label: "发行投流", icon: Megaphone },
  { to: "/center/console/copyright", label: "版权中心", icon: Scale },
  { to: "/center/console/ai", label: "AI 研发", icon: Bot },
  { to: "/center/console/orders", label: "中心工单", icon: ClipboardList },
  { to: "/center/console/kpi", label: "KPI 看板", icon: ChartColumnIncreasing },
];

const titles: Record<string, string> = {
  "/center/console": "五大中心运营总览",
  "/center/console/approval": "审批中心运营",
  "/center/console/overseas": "出海中心运营",
  "/center/console/distribution": "发行投流中心运营",
  "/center/console/copyright": "版权中心运营",
  "/center/console/ai": "AI 研发中心运营",
  "/center/console/orders": "中心工单",
  "/center/console/kpi": "中心 KPI",
};

export default function CenterLayout() {
  const { user, logout, resetDemo, apiOnline, loading } = useCenterStore();
  const navFn = useNavigate();
  const loc = useLocation();
  const title = titles[loc.pathname] ?? "五大中心运营 SaaS";

  return (
    <div className="app-shell">
      <aside className="sidebar center-sidebar">
        <div className="brand">
          <h1>五大中心</h1>
          <p>审批 · 出海 · 发行 · 版权 · AI</p>
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
          {user ? CENTER_ROLE_LABEL[user.role] : ""}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h2>{title}</h2>
          <div className="topbar-actions">
            <span className={`api-badge ${apiOnline ? "on" : "off"}`}>
              {apiOnline ? "中心 API" : "离线模式"}
            </span>
            <button className="btn btn-secondary" onClick={() => resetDemo()}>
              <RotateCcw size={15} /> 重置演示数据
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                logout();
                navFn("/center/login");
              }}
            >
              <LogOut size={15} /> 退出
            </button>
          </div>
        </header>
        <main className="content">
          {loading ? (
            <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
              正在连接中心服务平台…
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
