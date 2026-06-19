import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/nav/AppShell";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import HomePage from "@/pages/home";
import ConfigPage from "@/pages/config";
import ProjectDetailPage from "@/pages/project-detail";
import ProjectNewPage from "@/pages/project-new";
import VendorHoldsPage from "@/pages/vendor-holds";
import CollectionsPage from "@/pages/collections";
import AccountDetailPage from "@/pages/account-detail";
import MonthlyReportPage from "@/pages/monthly-report";
import SendQueuePage from "@/pages/send-queue";
import WaiversPage from "@/pages/waivers";
import FilingPage from "@/pages/filing";
import ReportsPage from "@/pages/reports";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/liens" component={HomePage} />
        <Route path="/projects/new" component={ProjectNewPage} />
        <Route path="/projects/:id" component={ProjectDetailPage} />
        <Route path="/holds" component={VendorHoldsPage} />
        <Route path="/collections" component={CollectionsPage} />
        <Route path="/collections/:accountId" component={AccountDetailPage} />
        <Route path="/monthly" component={MonthlyReportPage} />
        <Route path="/send-queue" component={SendQueuePage} />
        <Route path="/waivers" component={WaiversPage} />
        <Route path="/filing/:streamId" component={FilingPage} />
        <Route path="/reports/:projectId/timeline" component={ReportsPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/settings" component={ConfigPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
