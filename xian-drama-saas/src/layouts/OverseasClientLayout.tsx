import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, FilePlus2, FolderKanban, LogOut } from "lucide-react";
import { useOverseasStore } from "../store/overseasStore";

const nav = [
  { to: "/overseas/client", label: "我的出海", icon: Home, end: true },
  { to: "/overseas/client/submit", label: "提交需求", icon: FilePlus2 },
  { to: "/overseas/client/projects", label: "我的项目", icon: FolderKanban },
];

export default function OverseasClientLayout() {
  const { user, logout } = useOverseasStore();
  const navFn = useNavigate();

  return (
    <div className="app-shell overseas-shell">
      <aside className="sidebar overseas-client-sidebar">
        <div className="brand">
          <span className="member-badge">CLIENT</span>
          <h1>制片方门户</h1>
          <p>出海需求 · 项目进度</p>
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
          {user?.org}
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <h2>出海客户门户</h2>
          <div className="topbar-actions">
            <button
              className="btn btn-ghost"
              onClick={() => {
                logout();
                navFn("/overseas/login");
              }}
            >
              <LogOut size={15} /> 退出
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
