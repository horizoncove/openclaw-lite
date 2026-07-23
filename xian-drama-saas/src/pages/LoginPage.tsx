import { useNavigate } from "react-router-dom";
import type { Role } from "../types";
import { ROLE_LABEL } from "../types";
import { useStore } from "../store";

const roles: Role[] = [
  "admin",
  "alliance",
  "approval",
  "overseas",
  "distribution",
  "copyright",
  "ai",
];

export default function LoginPage() {
  const { login } = useStore();
  const nav = useNavigate();

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>运营 SaaS 登录</h1>
        <p className="sub">
          演示环境：选择角色进入对应工作台。数据保存在浏览器本地，可随时重置。
          若本页样式异常，可打开仓库内 <code>demo/index.html</code> 查看截图演示。
        </p>
        <div className="role-grid">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={async () => {
                await login(role);
                nav("/console");
              }}
            >
              <strong>{ROLE_LABEL[role]}</strong>
              <span>进入{role === "admin" ? "总控看板" : "业务工作台"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
