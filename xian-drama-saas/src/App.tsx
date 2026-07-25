import type { ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AllianceLayout from "./layouts/AllianceLayout";
import MemberLayout from "./layouts/MemberLayout";
import CenterLayout from "./layouts/CenterLayout";
import OverseasLayout from "./layouts/OverseasLayout";
import OverseasClientLayout from "./layouts/OverseasClientLayout";
import AppLayout from "./layouts/AppLayout";
import { useAllianceStore } from "./store/allianceStore";
import { useCenterStore } from "./store/centerStore";
import { useOverseasStore } from "./store/overseasStore";
import { useP1Store } from "./store/p1Store";
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
import CenterDashboard from "./pages/centers/CenterDashboard";
import CenterOrdersPage from "./pages/centers/CenterOrdersPage";
import CenterKpiPage from "./pages/centers/CenterKpiPage";
import ApprovalPage from "./pages/centers/ApprovalPage";
import OverseasPage from "./pages/centers/OverseasPage";
import DistributionPage from "./pages/centers/DistributionPage";
import CopyrightPage from "./pages/centers/CopyrightPage";
import AIPage from "./pages/centers/AIPage";
import OverseasLandingPage from "./pages/overseas/OverseasLandingPage";
import OverseasLoginPage from "./pages/overseas/OverseasLoginPage";
import OverseasDashboard from "./pages/overseas/ops/OverseasDashboard";
import OverseasProjectsPage from "./pages/overseas/ops/OverseasProjectsPage";
import OverseasLocalizationPage from "./pages/overseas/ops/OverseasLocalizationPage";
import OverseasPlatformsPage from "./pages/overseas/ops/OverseasPlatformsPage";
import OverseasDealsPage from "./pages/overseas/ops/OverseasDealsPage";
import OverseasSettlementPage from "./pages/overseas/ops/OverseasSettlementPage";
import OverseasMarketsPage from "./pages/overseas/ops/OverseasMarketsPage";
import OverseasIntakesPage from "./pages/overseas/ops/OverseasIntakesPage";
import ClientHomePage from "./pages/overseas/client/ClientHomePage";
import ClientSubmitPage from "./pages/overseas/client/ClientSubmitPage";
import ClientProjectsPage from "./pages/overseas/client/ClientProjectsPage";
import AppLoginPage from "./pages/app/AppLoginPage";
import WorkspacePage from "./pages/app/WorkspacePage";
import ProjectsPage from "./pages/app/ProjectsPage";
import DemandsPage from "./pages/app/DemandsPage";
import OpportunitiesPage from "./pages/app/OpportunitiesPage";
import WalletPage from "./pages/app/WalletPage";
import ComputePage from "./pages/app/ComputePage";
import NoticesPage from "./pages/app/NoticesPage";
import SupervisionPage from "./pages/app/SupervisionPage";
import { RequireWorkAuth, WorkLayout, WorkLoginPage } from "./work/WorkShell";
import { WorkAgentPage } from "./work/WorkAgentPage";
import {
  WorkBountyDetailPage,
  WorkBountyNewPage,
  WorkBountiesPage,
  WorkOrderDetailPage,
  WorkOrdersPage,
  WorkWalletPage,
} from "./work/WorkPages";

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

function RequireOverseasOps() {
  const { user } = useOverseasStore();
  if (!user) return <Navigate to="/overseas/login" replace />;
  if (user.role !== "ops") return <Navigate to="/overseas/client" replace />;
  return <Outlet />;
}

function RequireOverseasClient() {
  const { user } = useOverseasStore();
  if (!user) return <Navigate to="/overseas/login" replace />;
  if (user.role !== "client") return <Navigate to="/overseas/console" replace />;
  return <Outlet />;
}

function RequireP1Auth({ children }: { children: ReactNode }) {
  const { user } = useP1Store();
  if (!user) return <Navigate to="/app/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* AI Agent 工作端演示（纯前端） */}
      <Route path="/work/login" element={<WorkLoginPage />} />
      <Route element={<RequireWorkAuth />}>
        <Route path="/work" element={<WorkLayout />}>
          <Route index element={<WorkAgentPage />} />
          <Route path="wallet" element={<WorkWalletPage />} />
          <Route path="bounties" element={<WorkBountiesPage />} />
          <Route path="bounties/new" element={<WorkBountyNewPage />} />
          <Route path="bounties/:id" element={<WorkBountyDetailPage />} />
          <Route path="orders" element={<WorkOrdersPage />} />
          <Route path="orders/:id" element={<WorkOrderDetailPage />} />
        </Route>
      </Route>

      {/* P1 会员协作中枢 */}
      <Route path="/app/login" element={<AppLoginPage />} />
      <Route
        path="/app"
        element={
          <RequireP1Auth>
            <AppLayout />
          </RequireP1Auth>
        }
      >
        <Route index element={<Navigate to="workspace" replace />} />
        <Route path="workspace" element={<WorkspacePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="demands" element={<DemandsPage />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="compute" element={<ComputePage />} />
        <Route path="notices" element={<NoticesPage />} />
        <Route path="supervision" element={<SupervisionPage />} />
      </Route>

      {/* 出海服务中心 SaaS */}
      <Route path="/overseas" element={<OverseasLandingPage />} />
      <Route path="/overseas/login" element={<OverseasLoginPage />} />
      <Route element={<RequireOverseasOps />}>
        <Route path="/overseas/console" element={<OverseasLayout />}>
          <Route index element={<OverseasDashboard />} />
          <Route path="projects" element={<OverseasProjectsPage />} />
          <Route path="localization" element={<OverseasLocalizationPage />} />
          <Route path="platforms" element={<OverseasPlatformsPage />} />
          <Route path="deals" element={<OverseasDealsPage />} />
          <Route path="settlement" element={<OverseasSettlementPage />} />
          <Route path="markets" element={<OverseasMarketsPage />} />
          <Route path="intakes" element={<OverseasIntakesPage />} />
        </Route>
      </Route>
      <Route element={<RequireOverseasClient />}>
        <Route path="/overseas/client" element={<OverseasClientLayout />}>
          <Route index element={<ClientHomePage />} />
          <Route path="submit" element={<ClientSubmitPage />} />
          <Route path="projects" element={<ClientProjectsPage />} />
        </Route>
      </Route>

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
        <Route path="/alliance/member" element={<MemberLayout />}>
          <Route index element={<MemberHomePage />} />
          <Route path="profile" element={<MemberProfilePage />} />
          <Route path="events" element={<MemberEventsPage />} />
          <Route path="needs" element={<MemberNeedsPage />} />
          <Route path="services" element={<MemberServicesPage />} />
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

      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/console/*" element={<Navigate to="/" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
