import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AllianceLayout from "./layouts/AllianceLayout";
import CenterLayout from "./layouts/CenterLayout";
import { useAllianceStore } from "./store/allianceStore";
import { useCenterStore } from "./store/centerStore";
import LandingPage from "./pages/LandingPage";
import AllianceLoginPage from "./pages/AllianceLoginPage";
import CenterLoginPage from "./pages/CenterLoginPage";
import AllianceDashboard from "./pages/alliance/AllianceDashboard";
import AllianceOrdersPage from "./pages/alliance/AllianceOrdersPage";
import AllianceKpiPage from "./pages/alliance/AllianceKpiPage";
import MembersPage from "./pages/alliance/MembersPage";
import EventsPage from "./pages/alliance/EventsPage";
import MatchingPage from "./pages/alliance/MatchingPage";
import CenterDashboard from "./pages/centers/CenterDashboard";
import CenterOrdersPage from "./pages/centers/CenterOrdersPage";
import CenterKpiPage from "./pages/centers/CenterKpiPage";
import ApprovalPage from "./pages/centers/ApprovalPage";
import OverseasPage from "./pages/centers/OverseasPage";
import DistributionPage from "./pages/centers/DistributionPage";
import CopyrightPage from "./pages/centers/CopyrightPage";
import AIPage from "./pages/centers/AIPage";

function RequireAllianceAuth() {
  const { user } = useAllianceStore();
  if (!user) return <Navigate to="/alliance/login" replace />;
  return <Outlet />;
}

function RequireCenterAuth() {
  const { user } = useCenterStore();
  if (!user) return <Navigate to="/center/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/alliance/login" element={<AllianceLoginPage />} />
      <Route element={<RequireAllianceAuth />}>
        <Route path="/alliance/console" element={<AllianceLayout />}>
          <Route index element={<AllianceDashboard />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="matching" element={<MatchingPage />} />
          <Route path="orders" element={<AllianceOrdersPage />} />
          <Route path="kpi" element={<AllianceKpiPage />} />
        </Route>
      </Route>

      <Route path="/center/login" element={<CenterLoginPage />} />
      <Route element={<RequireCenterAuth />}>
        <Route path="/center/console" element={<CenterLayout />}>
          <Route index element={<CenterDashboard />} />
          <Route path="approval" element={<ApprovalPage />} />
          <Route path="overseas" element={<OverseasPage />} />
          <Route path="distribution" element={<DistributionPage />} />
          <Route path="copyright" element={<CopyrightPage />} />
          <Route path="ai" element={<AIPage />} />
          <Route path="orders" element={<CenterOrdersPage />} />
          <Route path="kpi" element={<CenterKpiPage />} />
        </Route>
      </Route>

      {/* 旧路径重定向 */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/console/*" element={<Navigate to="/" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
