import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./modules/lien_collections/layout/AppShell.jsx";
import Dashboard from "./modules/lien_collections/pages/Dashboard.jsx";
import Liens from "./modules/lien_collections/pages/Liens.jsx";
import VendorHolds from "./modules/lien_collections/pages/VendorHolds.jsx";
import MonthlyReport from "./modules/lien_collections/pages/MonthlyReport.jsx";
import SendQueue from "./modules/lien_collections/pages/SendQueue.jsx";
import ProjectLienDetail from "./modules/lien_collections/pages/ProjectLienDetail.jsx";
import WaiverWorkspace from "./modules/lien_collections/pages/WaiverWorkspace.jsx";
import FilingWorkspace from "./modules/lien_collections/pages/FilingWorkspace.jsx";
import CollectionsPipeline from "./modules/lien_collections/pages/CollectionsPipeline.jsx";
import AccountDetail from "./modules/lien_collections/pages/AccountDetail.jsx";
import TenantConfig from "./modules/lien_collections/pages/TenantConfig.jsx";

/**
 * Routes mirror UI_SPEC Section 2. In Helm these mount under the global
 * app shell; here AppShell recreates the Helm sidebar + header so the
 * module looks identical standalone. Integration = drop pages/components
 * into src/modules/lien_collections and register routes.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/lien-collections" replace />} />
      <Route path="/lien-collections" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="liens" element={<Liens />} />
        <Route path="holds" element={<VendorHolds />} />
        <Route path="monthly" element={<MonthlyReport />} />
        <Route path="send-queue" element={<SendQueue />} />
        <Route path="projects/:id" element={<ProjectLienDetail />} />
        <Route path="waivers" element={<WaiverWorkspace />} />
        <Route path="filing/:streamId" element={<FilingWorkspace />} />
        <Route path="collections" element={<CollectionsPipeline />} />
        <Route path="collections/:accountId" element={<AccountDetail />} />
        <Route path="config" element={<TenantConfig />} />
      </Route>
    </Routes>
  );
}
