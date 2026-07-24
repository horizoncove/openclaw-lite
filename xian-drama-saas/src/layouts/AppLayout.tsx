import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Handshake,
  Sparkles,
  Cpu,
  Bell,
  LogOut,
  RotateCcw,
  BriefcaseBusiness,
} from "lucide-react";
import { useP1Store } from "../store/p1Store";

const nav = [
  { to: "/app/workspace", label: "工作台", icon: LayoutDashboard },
  { to: "/app/projects", label: "我的项目", icon: FolderKanban },
  { to: "/app/demands", label: "工作需求", icon: BriefcaseBusiness },
  { to: "/app/opportunities", label: "撮合机会", icon: Handshake },
  { to: "/app/wallet", label: "API 与算力", icon: Sparkles },
  { to: "/app/compute", label: "算力作业", icon: Cpu },
  { to: "/app/notices", label: "联盟通知", icon: Bell },
];

const titles: Record<string, string> = {
  "/app/workspace": "工作台",
  "/app/projects": "我的项目",
  "/app/demands": "工作需求广场",
  "/app/opportunities": "撮合机会",
  "/app/wallet": "API 聚合与钱包",
  "/app/compute": "算力作业队列",
  "/app/notices": "联盟通知",
};

export default function AppLayout() {
  const { user, logout, resetDemo, apiOnline, loading } = useP1Store();
  const navFn = useNavigate();
  const loc = useLocation();
  const title = titles[loc.pathname] ?? "会员协作中枢";

  return (
    <div className="app-shell p1-shell">
      <aside className="sidebar p1-sidebar">
        <div className="brand">
          <h1>产业服务 SaaS</h1>
          <p>项目 · 需求 · API · 算力</p>
        </div>
        <nav className="nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              <item.icon size={16} /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <strong>{user?.name}</strong>
          {user?.orgName} · {user?.role}
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <h2>{title}</h2>
          <div className="topbar-actions">
            <span className={`api-badge ${apiOnline ? "on" : "off"}`}>
              {apiOnline ? "P1 API" : "离线"}
            </span>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                await resetDemo();
                window.location.reload();
              }}
            >
              <RotateCcw size={15} /> 重置演示
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                logout();
                navFn("/app/login");
              }}
            >
              <LogOut size={15} /> 退出
            </button>
          </div>
        </header>
        <main className="content">
          {loading ? <div className="card empty">连接服务中…</div> : <Outlet />}
        </main>
      </div>
    </div>
  );
}
