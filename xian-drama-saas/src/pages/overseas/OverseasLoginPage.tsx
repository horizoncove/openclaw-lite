import { useNavigate, Link } from "react-router-dom";
import type { OverseasRole } from "../../types";
import { OVERSEAS_ROLE_LABEL } from "../../types";
import { useOverseasStore } from "../../store/overseasStore";

const roles: { role: OverseasRole; hint: string }[] = [
  { role: "ops", hint: "项目漏斗、译制、平台、谈判、结算全链路运营" },
  { role: "client", hint: "提交出海需求、查看项目进度与进件状态" },
];

export default function OverseasLoginPage() {
  const { login } = useOverseasStore();
  const nav = useNavigate();

  return (
    <div className="login-page overseas-login">
      <div className="login-card">
        <p className="portal-tag overseas">出海入口</p>
        <h1>微短剧出海服务中心</h1>
        <p className="sub">选择角色进入运营台或制片方门户。数据独立于联盟与五大中心。</p>
        <div className="role-grid">
          {roles.map(({ role, hint }) => (
            <button
              key={role}
              type="button"
              className={role === "ops" ? "role-ops" : "role-client"}
              onClick={async () => {
                await login(role);
                nav(role === "ops" ? "/overseas/console" : "/overseas/client");
              }}
            >
              <strong>{OVERSEAS_ROLE_LABEL[role]}</strong>
              <span>{hint}</span>
            </button>
          ))}
        </div>
        <p className="login-switch">
          <Link to="/overseas">返回出海首页</Link>
          {" · "}
          <Link to="/">总平台入口</Link>
        </p>
      </div>
    </div>
  );
}
