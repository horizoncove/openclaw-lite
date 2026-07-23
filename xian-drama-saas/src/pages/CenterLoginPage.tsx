import { useNavigate } from "react-router-dom";
import type { CenterRole } from "../types";
import { CENTER_ROLE_LABEL } from "../types";
import { useCenterStore } from "../store/centerStore";

const roles: CenterRole[] = [
  "approval",
  "overseas",
  "distribution",
  "copyright",
  "ai",
];

export default function CenterLoginPage() {
  const { login } = useCenterStore();
  const nav = useNavigate();

  return (
    <div className="login-page center-login">
      <div className="login-card">
        <p className="portal-tag center">中心入口</p>
        <h1>五大中心运营 SaaS</h1>
        <p className="sub">
          审批、出海、发行投流、版权与 AI 研发运营。本入口数据与联盟会员完全隔离。
        </p>
        <div className="role-grid">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={async () => {
                await login(role);
                nav("/center/console");
              }}
            >
              <strong>{CENTER_ROLE_LABEL[role]}</strong>
              <span>进入业务工作台</span>
            </button>
          ))}
        </div>
        <p className="login-switch">
          联盟会员服务？<a href="/alliance/login">前往联盟入口 →</a>
        </p>
      </div>
    </div>
  );
}
