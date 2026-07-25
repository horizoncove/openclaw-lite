import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { p1Api } from "../../api/p1Client";
import { useP1Store } from "../../store/p1Store";

type Row = { id: string; name: string; role: string; orgName: string; email: string };

export default function AppLoginPage() {
  const { login } = useP1Store();
  const nav = useNavigate();
  const [users, setUsers] = useState<Row[]>([]);

  useEffect(() => {
    p1Api.listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  return (
    <div className="login-page p1-login">
      <div className="login-card">
        <p className="portal-tag overseas">P1 会员中枢</p>
        <h1>微短剧产业服务 SaaS</h1>
        <p className="sub">管项目、全联盟需求、进度、API 聚合与算力调度、撮合与通知。</p>
        <div className="role-grid">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={async () => {
                await login(u.id);
                nav("/app/workspace");
              }}
            >
              <strong>
                {u.name} · {u.orgName}
              </strong>
              <span>
                {u.role} · {u.email}
              </span>
            </button>
          ))}
        </div>
        <p className="login-switch">
          <Link to="/">返回总平台</Link>
        </p>
      </div>
    </div>
  );
}
