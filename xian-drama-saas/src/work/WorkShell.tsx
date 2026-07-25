import { Link, NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";
import { DEMO_USERS, useWorkDemo } from "./workDemoStore";
import "./workDemo.css";

export function WorkLoginPage() {
  const { login, user } = useWorkDemo();
  const nav = useNavigate();
  if (user) return <Navigate to="/work" replace />;

  return (
    <div className="work-root work-login">
      <section className="work-login-hero">
        <p className="eyebrow">Xi’an Short Drama · Work Client</p>
        <h1>
          微短剧
          <br />
          <em>AI Agent</em>
          <br />
          工作端
        </h1>
        <p className="lead">
          在对话里发悬赏、找人、托管与验收。关键扣款与放款由你确认——不是 SaaS 后台，也不是链上钱包。
        </p>
      </section>
      <section className="work-login-panel">
        <h2>选择身份进入</h2>
        <p className="hint">演示数据仅存浏览器内存，可随时重置。</p>
        <div className="work-role-list">
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
              <span>
                {u.role === "client"
                  ? "客户 · 购 Token / 发悬赏 / 确认托管 / 验收"
                  : "供应商 · 接单 / 履约 / 收款"}
              </span>
            </button>
          ))}
        </div>
        <div className="work-login-foot">
          <Link to="/">返回总入口</Link>
          <span>纯前端演示</span>
        </div>
      </section>
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
          <strong>
            微短剧 <em>Agent</em> 工作端
          </strong>
          <span>
            {user.name} · {user.org} · {user.role === "client" ? "客户" : "供应商"}
          </span>
        </div>
        <div className="work-top-right">
          <div className="work-balance">
            可用 <b>{balance} T</b>
            <span style={{ margin: "0 0.45rem", color: "var(--line)" }}>|</span>
            冻结 <b>{frozen} T</b>
          </div>
          <nav className="work-nav">
            <NavLink to="/work" end>
              工作区
            </NavLink>
            <NavLink to="/work/bounties">悬赏</NavLink>
            {user.role === "client" && <NavLink to="/work/bounties/new">发布</NavLink>}
            <NavLink to="/work/orders">订单</NavLink>
            <NavLink to="/work/wallet">钱包</NavLink>
            <button type="button" className="work-text" onClick={resetDemo}>
              重置
            </button>
            <button
              type="button"
              className="work-text"
              onClick={() => {
                logout();
                nav("/work/login");
              }}
            >
              退出
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
