/**
 * projects-view.tsx — Projects table for the unified Liens workspace.
 *
 * Lists every project (the portfolio) with its highest-risk stream status and
 * next deadline. Rows click through to the project detail page. Registers the
 * "Notices Needed" (left) and "Send Queue" (right) side panels.
 *
 * Previously this was the standalone /liens page (home.tsx).
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Panel, useRightPanel, useLeftPanel } from "@/components/nav/AppShell";
import { QueueList } from "@/components/ui/queue-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { DeadlineCountdown } from "@/components/ui/deadline-countdown";
import { ListPageLayout, ListTableState } from "@/components/ui/list-page";
import { Search } from "lucide-react";

interface LienStream {
  id: string;
  workStream: string;
  status: string;
}

interface QueueNotice {
  id: string;
  status: string;
  monthListed: string;
  project: { id: string; projectName: string } | null;
}

function fmtMonthListed(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface Project {
  id: string;
  hubspotProjectId: string;
  cachedProjectName: string | null;
  cachedHubspotStatus: string | null;
  lienWorkflowType: string;
  contractorTier: string;
  county: string | null;
  legalPropertyAddress: string | null;
  contractStartDate: string | null;
  completionChecklistComplete: boolean;
  streams: LienStream[];
}

function apiFetch<T>(path: string): Promise<T> {
  return fetch(`/api${path}`, { credentials: "include" }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  });
}

const WORKFLOW_LABELS: Record<string, string> = {
  commercial_sub: "Commercial Sub",
  residential_sub: "Residential Sub",
  public_bond: "Public / Bond",
  none: "No Lien Tracking",
};

const RISK_ORDER = ["at_risk", "filing", "lapsed", "notice_active", "filed", "open", "released", "closed"];

function highestRisk(streams: LienStream[]): string {
  if (!streams.length) return "none";
  for (const r of RISK_ORDER) {
    if (streams.some((s) => s.status === r)) return r;
  }
  return streams[0].status;
}

const DAYS_BY_STATUS: Record<string, number> = {
  lapsed: -45, filing: -10, at_risk: -3, notice_active: 14, filed: 30, open: 45,
};

export default function ProjectsView() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = React.useState("");
  const [filterWorkflow, setFilterWorkflow] = React.useState("all");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<{ projects: Project[] }>("/projects"),
    retry: false,
  });

  const { data: queueData } = useQuery({
    queryKey: ["send-queue"],
    queryFn: () => apiFetch<{ notices: QueueNotice[] }>("/monthly/send-queue"),
    retry: false,
    staleTime: 30_000,
  });

  const queueNotices = queueData?.notices ?? [];
  const draftNotices = queueNotices.filter((n) => n.status === "draft");
  const readyNotices = queueNotices.filter((n) => n.status === "approved");
  const draftSig = draftNotices.map((n) => n.id).join(",");
  const readySig = readyNotices.map((n) => n.id).join(",");

  const projects = data?.projects ?? [];

  const filtered = projects.filter((p) => {
    const name = (p.cachedProjectName ?? p.hubspotProjectId).toLowerCase();
    const county = (p.county ?? "").toLowerCase();
    if (search && !name.includes(search.toLowerCase()) && !county.includes(search.toLowerCase())) return false;
    if (filterWorkflow !== "all" && p.lienWorkflowType !== filterWorkflow) return false;
    return true;
  });

  const atRiskCount = projects.filter((p) => {
    const r = highestRisk(p.streams);
    return r === "at_risk" || r === "filing" || r === "lapsed";
  }).length;
  const incompleteCount = projects.filter((p) => !p.completionChecklistComplete).length;

  useLeftPanel(
    <Panel title="Notices Needed" accent="#f59e0b" count={draftNotices.length}>
      <QueueList
        items={
          draftNotices.length > 0
            ? draftNotices.map((n) => ({
                id: n.id,
                title: n.project?.projectName ?? "Unknown project",
                sub: `Draft · ${fmtMonthListed(n.monthListed)}`,
                onClick: () => setLocation(`/send-queue?notice=${n.id}`),
              }))
            : [{ id: "empty", title: "Nothing to send", sub: "No draft notices" }]
        }
      />
    </Panel>,
    [draftSig],
  );

  useRightPanel(
    <Panel title="Send Queue" accent="#6366f1" count={readyNotices.length}>
      <QueueList
        items={
          readyNotices.length > 0
            ? readyNotices.map((n) => ({
                id: n.id,
                title: n.project?.projectName ?? "Unknown project",
                sub: `Approved · ${fmtMonthListed(n.monthListed)}`,
                action: "Send",
                actionTone: "#f59e0b",
                onClick: () => setLocation(`/send-queue?notice=${n.id}`),
              }))
            : [{ id: "empty", title: "Queue empty", sub: "Approve notices to send" }]
        }
      />
    </Panel>,
    [readySig],
  );

  type ProjectRow = Project & { risk: string; days: number };

  const rows: ProjectRow[] = filtered.map((p) => ({
    ...p,
    risk: highestRisk(p.streams),
    days: DAYS_BY_STATUS[highestRisk(p.streams)] ?? 60,
  }));

  const columns = [
    {
      key: "name",
      header: "Project / Client",
      render: (r: ProjectRow) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold" style={{ color: "var(--text-base)" }}>
            {r.cachedProjectName ?? r.hubspotProjectId}
          </div>
          <div className="mt-0.5 truncate text-[11.5px]" style={{ color: "var(--text-muted-color)" }}>
            {r.county ? `${r.county} Co.` : ""}
            {r.county && r.lienWorkflowType ? " · " : ""}
            {WORKFLOW_LABELS[r.lienWorkflowType] ?? r.lienWorkflowType}
          </div>
        </div>
      ),
    },
    {
      key: "tier",
      header: "Tier",
      render: (r: ProjectRow) => (
        <span className="font-mono text-[11px]" style={{ color: "var(--text-dim)" }}>
          {r.contractorTier === "second_tier" ? "T2" : "T1"}
        </span>
      ),
    },
    {
      key: "streams",
      header: "Streams",
      render: (r: ProjectRow) => (
        <span className="font-mono text-[11px]" style={{ color: "var(--text-dim)" }}>
          {r.streams.length}
        </span>
      ),
    },
    {
      key: "deadline",
      header: "Next deadline",
      render: (r: ProjectRow) => r.streams.length > 0
        ? <DeadlineCountdown days={r.days} />
        : <span className="text-[11px]" style={{ color: "var(--text-muted-color)" }}>No streams</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "right" as const,
      render: (r: ProjectRow) => r.risk === "none"
        ? <span className="text-[11px]" style={{ color: "var(--text-muted-color)" }}>No streams</span>
        : <StatusBadge status={r.risk} />,
    },
  ];

  return (
    <ListPageLayout
      kpis={[
        { label: "Total Projects", value: isLoading ? "—" : projects.length, color: "#6366f1" },
        { label: "At Risk", value: isLoading ? "—" : atRiskCount, color: atRiskCount > 0 ? "#eb143f" : "#14eba3" },
        { label: "Setup Incomplete", value: isLoading ? "—" : incompleteCount, color: incompleteCount > 0 ? "#f59f0a" : "#14eba3" },
      ]}
      filters={
        <>
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-muted-color)" }} />
            <input
              placeholder="Search projects or county…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border py-2 pl-9 pr-3 text-[13px] outline-none"
              style={{ background: "var(--surface-2)", borderColor: "var(--helm-border)", color: "var(--text-base)" }}
            />
          </div>
          <div className="flex gap-0.5 rounded-md border p-0.5" style={{ borderColor: "var(--helm-border)" }}>
            {[
              { v: "all", l: "All" },
              { v: "commercial_sub", l: "Commercial" },
              { v: "residential_sub", l: "Residential" },
            ].map(({ v, l }) => (
              <button
                key={v}
                onClick={() => setFilterWorkflow(v)}
                className="rounded px-2.5 py-1 text-[12px] font-semibold"
                style={filterWorkflow === v
                  ? { background: "var(--surface-3)", color: "var(--text-base)" }
                  : { color: "var(--text-dim)" }}
              >
                {l}
              </button>
            ))}
          </div>
        </>
      }
    >
      <ListTableState
        isLoading={isLoading}
        isError={isError}
        isEmpty={filtered.length === 0}
        loadingText="Loading projects…"
        errorText={
          String((error as Error)?.message ?? "").includes("401")
            ? "Your session has expired — please refresh the page to sign in again."
            : `Failed to load: ${(error as Error)?.message}`
        }
        emptyText={
          projects.length === 0 ? "No projects yet. Create one to get started." : "No projects match the current filters."
        }
      >
        <ResponsiveTable
          columns={columns}
          rows={rows}
          gridTemplate="1.5fr .4fr .4fr .8fr .9fr"
          onRowClick={(r: ProjectRow) => {
            window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/projects/${r.id}`;
          }}
        />
      </ListTableState>
    </ListPageLayout>
  );
}
