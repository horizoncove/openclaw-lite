import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import { useStore } from "./store";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import OrdersPage from "./pages/OrdersPage";
import KpiPage from "./pages/KpiPage";
import MembersPage from "./pages/alliance/MembersPage";
import EventsPage from "./pages/alliance/EventsPage";
import MatchingPage from "./pages/alliance/MatchingPage";
import ApprovalPage from "./pages/centers/ApprovalPage";
import OverseasPage from "./pages/centers/OverseasPage";
import DistributionPage from "./pages/centers/DistributionPage";
import CopyrightPage from "./pages/centers/CopyrightPage";
import AIPage from "./pages/centers/AIPage";

function RequireAuth() {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/console" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="kpi" element={<KpiPage />} />
          <Route path="alliance/members" element={<MembersPage />} />
          <Route path="alliance/events" element={<EventsPage />} />
          <Route path="alliance/matching" element={<MatchingPage />} />
          <Route path="centers/approval" element={<ApprovalPage />} />
          <Route path="centers/overseas" element={<OverseasPage />} />
          <Route path="centers/distribution" element={<DistributionPage />} />
          <Route path="centers/copyright" element={<CopyrightPage />} />
          <Route path="centers/ai" element={<AIPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
