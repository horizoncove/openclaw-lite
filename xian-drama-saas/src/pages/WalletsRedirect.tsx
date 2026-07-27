import { Navigate } from "react-router-dom";
import { useAllianceStore } from "../store/allianceStore";
import { useCenterStore } from "../store/centerStore";

/** 对齐 Trae `#/wallets`：按登录角色落到托管理论钱包中心 */
export default function WalletsRedirect() {
  const alliance = useAllianceStore();
  const center = useCenterStore();

  if (alliance.user?.role === "alliance") {
    return <Navigate to="/alliance/console/wallets" replace />;
  }
  if (alliance.user?.role === "member") {
    return <Navigate to="/alliance/member/wallets" replace />;
  }
  if (center.user) {
    return <Navigate to="/center/console/tokens" replace />;
  }
  return <Navigate to="/alliance/login" replace />;
}
