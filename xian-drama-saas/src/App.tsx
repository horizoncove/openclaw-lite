import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AllianceLayout from "./layouts/AllianceLayout";
import MemberLayout from "./layouts/MemberLayout";
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
import MemberHomePage from "./pages/alliance/member/MemberHomePage";
import MemberProfilePage from "./pages/alliance/member/MemberProfilePage";
import MemberEventsPage from "./pages/alliance/member/MemberEventsPage";
import MemberNeedsPage from "./pages/alliance/member/MemberNeedsPage";
import MemberServicesPage from "./pages/alliance/member/MemberServicesPage";
import MemberWorksPage from "./pages/alliance/member/MemberWorksPage";
import MemberDiscoverPage from "./pages/alliance/member/MemberDiscoverPage";
import ShowcasePage from "./pages/alliance/ShowcasePage";
import EcosystemLoopPage from "./pages/alliance/EcosystemLoopPage";
import MemberDealsPage from "./pages/alliance/member/MemberDealsPage";
import CenterDashboard from "./pages/centers/CenterDashboard";
import CenterPanoramaPage from "./pages/centers/CenterPanoramaPage";
import CenterOrdersPage from "./pages/centers/CenterOrdersPage";
import CenterKpiPage from "./pages/centers/CenterKpiPage";
import TokenHubPage from "./pages/centers/TokenHubPage";
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
          <Route path="loop" element={<EcosystemLoopPage />} />
          <Route path="showcase" element={<ShowcasePage />} />
          <Route path="orders" element={<AllianceOrdersPage />} />
          <Route path="kpi" element={<AllianceKpiPage />} />
        </Route>
        <Route path="/alliance/member" element={<MemberLayout />}>
          <Route index element={<MemberHomePage />} />
          <Route path="profile" element={<MemberProfilePage />} />
          <Route path="events" element={<MemberEventsPage />} />
          <Route path="needs" element={<MemberNeedsPage />} />
          <Route path="services" element={<MemberServicesPage />} />
          <Route path="works" element={<MemberWorksPage />} />
          <Route path="discover" element={<MemberDiscoverPage />} />
          <Route path="deals" element={<MemberDealsPage />} />
        </Route>
      </Route>

      <Route path="/center/login" element={<CenterLoginPage />} />
      <Route element={<RequireCenterAuth />}>
        <Route path="/center/console" element={<CenterLayout />}>
          <Route index element={<CenterDashboard />} />
          <Route path="panorama" element={<CenterPanoramaPage />} />
          <Route path="tokens" element={<TokenHubPage />} />
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
