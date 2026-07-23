import { useNavigate } from "react-router-dom";
import type { AllianceRole } from "../types";
import { ALLIANCE_ROLE_LABEL } from "../types";
import { useAllianceStore } from "../store/allianceStore";

const roles: AllianceRole[] = ["alliance", "member"];

export default function AllianceLoginPage() {
  const { login } = useAllianceStore();
  const nav = useNavigate();

  return (
    <div className="login-page alliance-login">
      <div className="login-card">
        <p className="portal-tag">联盟入口</p>
        <h1>产业联盟 SaaS</h1>
        <p className="sub">
          会员管理、活动运营与供需撮合。本入口数据与五大中心完全隔离。
        </p>
        <div className="role-grid alliance-role-grid">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              className={role === "member" ? "role-member" : "role-secretariat"}
              onClick={async () => {
                await login(role);
                nav(role === "member" ? "/alliance/member" : "/alliance/console");
              }}
            >
              <strong>{ALLIANCE_ROLE_LABEL[role]}</strong>
              <span>
                {role === "member"
                  ? "会员门户：活动报名、供需发布、服务申请"
                  : "秘书处：会员管理、活动运营、撮合与工单"}
              </span>
            </button>
          ))}
        </div>
        <p className="login-switch">
          五大中心运营？<a href="/center/login">前往中心入口 →</a>
        </p>
      </div>
    </div>
  );
}
