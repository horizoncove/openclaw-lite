import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Clapperboard,
  Languages,
  Building2,
  Handshake,
  Wallet,
  Globe2,
  Inbox,
  LogOut,
  RotateCcw,
} from "lucide-react";
import { useOverseasStore } from "../store/overseasStore";
import { OVERSEAS_ROLE_LABEL } from "../types";

const nav = [
  { to: "/overseas/console", label: "出海总览", icon: LayoutDashboard, end: true },
  { to: "/overseas/console/projects", label: "项目漏斗", icon: Clapperboard },
  { to: "/overseas/console/localization", label: "译制本地化", icon: Languages },
  { to: "/overseas/console/platforms", label: "平台伙伴", icon: Building2 },
  { to: "/overseas/console/deals", label: "商务谈判", icon: Handshake },
  { to: "/overseas/console/settlement", label: "结算对账", icon: Wallet },
  { to: "/overseas/console/markets", label: "市场情报", icon: Globe2 },
  { to: "/overseas/console/intakes", label: "客户进件", icon: Inbox },
];

const titles: Record<string, string> = {
  "/overseas/console": "出海服务中心总览",
  "/overseas/console/projects": "出海项目漏斗",
  "/overseas/console/localization": "译制与本地化",
  "/overseas/console/platforms": "海外平台伙伴",
  "/overseas/console/deals": "商务谈判与合同",
  "/overseas/console/settlement": "结算对账",
  "/overseas/console/markets": "目标市场情报",
  "/overseas/console/intakes": "客户进件管理",
};

export default function OverseasLayout() {
  const { user, logout, resetDemo, apiOnline, loading } = useOverseasStore();
  const navFn = useNavigate();
  const loc = useLocation();
  const title = titles[loc.pathname] ?? "出海服务中心";

  return (
    <div className="app-shell overseas-shell">
      <aside className="sidebar overseas-sidebar">
        <div className="brand">
          <h1>出海服务中心</h1>
          <p>选品 · 译制 · 平台 · 结算</p>
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
          {user ? OVERSEAS_ROLE_LABEL[user.role] : ""}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h2>{title}</h2>
          <div className="topbar-actions">
            <span className={`api-badge ${apiOnline ? "on" : "off"}`}>
              {apiOnline ? "出海 API" : "离线模式"}
            </span>
            <button className="btn btn-secondary" onClick={() => resetDemo()}>
              <RotateCcw size={15} /> 重置演示数据
            </button>
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
          {loading ? (
            <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
              正在连接出海服务平台…
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
