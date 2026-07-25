import { Link, NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";
import { DEMO_USERS, useWorkDemo } from "./workDemoStore";
import "./workDemo.css";

export function WorkLoginPage() {
  const { login, user } = useWorkDemo();
  const nav = useNavigate();
  if (user) return <Navigate to="/work" replace />;

  return (
    <div className="work-root work-login">
      <div className="work-login-card">
        <div className="brand-mark">
          微短剧 <span>AI Agent</span> 工作端
        </div>
        <p className="lead">
          演示版：对话编排购 Token、发悬赏、应征、托管冻结与验收放款。非 SaaS 后台，非链上钱包。
        </p>
        <div className="work-role-grid">
          {DEMO_USERS.map((u) => (
            <button
              key={u.id}
              type="button"
              className="work-role-btn"
              onClick={() => {
                login(u);
                nav("/work");
              }}
            >
              <strong>
                {u.name} · {u.org}
              </strong>
              <span>{u.role === "client" ? "客户 · 发悬赏 / 确认托管 / 验收" : "供应商 · 接单 / 履约 / 收款"}</span>
            </button>
          ))}
        </div>
        <div className="work-login-foot">
          <Link to="/">返回总入口</Link>
          <span>纯前端演示 · 数据在浏览器内存</span>
        </div>
      </div>
    </div>
  );
}

export function RequireWorkAuth() {
  const { user } = useWorkDemo();
  if (!user) return <Navigate to="/work/login" replace />;
  return <Outlet />;
}

export function WorkLayout() {
  const { user, balance, frozen, logout, resetDemo } = useWorkDemo();
  const nav = useNavigate();
  if (!user) return null;

  return (
    <div className="work-root work-shell">
      <header className="work-top">
        <div className="work-top-brand">
          <strong>微短剧 AI Agent 工作端</strong>
          <span>
            {user.name} · {user.org} · {user.role === "client" ? "客户" : "供应商"}
          </span>
        </div>
        <div className="work-top-actions">
          <span className="work-chip">
            可用 <em>{balance} T</em>
          </span>
          <span className="work-chip">
            冻结 <em>{frozen} T</em>
          </span>
          <NavLink to="/work" end className={({ isActive }) => `work-nav-link${isActive ? " active" : ""}`}>
            工作区
          </NavLink>
          <NavLink to="/work/bounties" className={({ isActive }) => `work-nav-link${isActive ? " active" : ""}`}>
            可接列表
          </NavLink>
          {user.role === "client" && (
            <NavLink to="/work/bounties/new" className={({ isActive }) => `work-nav-link${isActive ? " active" : ""}`}>
              发悬赏
            </NavLink>
          )}
          <NavLink to="/work/orders" className={({ isActive }) => `work-nav-link${isActive ? " active" : ""}`}>
            订单
          </NavLink>
          <NavLink to="/work/wallet" className={({ isActive }) => `work-nav-link${isActive ? " active" : ""}`}>
            钱包
          </NavLink>
          <button type="button" className="work-btn work-btn-ghost" onClick={resetDemo}>
            重置演示
          </button>
          <button
            type="button"
            className="work-btn work-btn-ghost"
            onClick={() => {
              logout();
              nav("/work/login");
            }}
          >
            退出
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
