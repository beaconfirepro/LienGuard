/**
 * lien_collections module barrel.
 * Integration into Helm: copy this folder to src/modules/lien_collections,
 * register the routes from App.jsx, and replace data/mock.js with the
 * react-query hooks that call DATA_MODEL Section 3 endpoints. Component
 * names + IDs are unchanged, so it's a move, not a rewrite (SCOPE §12).
 */
export * from "./components";
export { default as AppShell, useRightPanel } from "./layout/AppShell";
export { useResponsive } from "./hooks/useResponsive";

export { default as Dashboard } from "./pages/Dashboard";
export { default as Liens } from "./pages/Liens";
export { default as VendorHolds } from "./pages/VendorHolds";
export { default as MonthlyReport } from "./pages/MonthlyReport";
export { default as SendQueue } from "./pages/SendQueue";
export { default as ProjectLienDetail } from "./pages/ProjectLienDetail";
export { default as WaiverWorkspace } from "./pages/WaiverWorkspace";
export { default as FilingWorkspace } from "./pages/FilingWorkspace";
export { default as CollectionsPipeline } from "./pages/CollectionsPipeline";
export { default as AccountDetail } from "./pages/AccountDetail";
export { default as TenantConfig } from "./pages/TenantConfig";
