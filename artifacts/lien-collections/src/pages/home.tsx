import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Panel, useRightPanel } from "@/components/nav/AppShell";
import { QueueList } from "@/components/ui/queue-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { DeadlineCountdown } from "@/components/ui/deadline-countdown";
import { Search, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";

interface LienStream {
  id: string;
  workStream: string;
  status: string;
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

export default function HomePage() {
  const [search, setSearch] = React.useState("");
  const [filterWorkflow, setFilterWorkflow] = React.useState("all");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<{ projects: Project[] }>("/projects"),
    retry: false,
  });

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

  useRightPanel(
    <Panel title="Quick Actions" accent="#f59e0b">
      <QueueList
        items={[
          { id: "q1", title: "New project", sub: "Register a new fire protection job", action: "Create", actionTone: "#f59e0b" },
          { id: "q2", title: "Monthly report", sub: "All active streams this month", action: "View report", actionTone: "#6366f1" },
        ]}
      />
    </Panel>,
    [],
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
    <>
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Projects", value: isLoading ? "—" : projects.length, color: "#6366f1" },
          { label: "At Risk", value: isLoading ? "—" : atRiskCount, color: atRiskCount > 0 ? "#eb143f" : "#14eba3" },
          { label: "Setup Incomplete", value: isLoading ? "—" : incompleteCount, color: incompleteCount > 0 ? "#f59f0a" : "#14eba3" },
        ].map((k) => (
          <div key={k.label} className="relative overflow-hidden rounded-lg border px-4 pb-3.5 pt-4" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
            <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: k.color }} />
            <div className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted-color)" }}>{k.label}</div>
            <div className="mt-1.5 font-mono text-[24px] font-bold leading-none" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
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
        <Link href="/projects/new">
          <div
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[12.5px] font-semibold cursor-pointer"
            style={{ background: "rgba(245,158,11,.14)", color: "#f59e0b", border: "1px solid rgba(245,158,11,.3)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            New Project
          </div>
        </Link>
      </div>

      {/* Project list */}
      {isLoading ? (
        <div className="rounded-lg border px-4 py-8 text-center text-[12px]" style={{ background: "var(--surface)", borderColor: "var(--helm-border)", color: "var(--text-muted-color)" }}>
          Loading projects…
        </div>
      ) : isError ? (
        <div className="rounded-lg border px-4 py-6 text-center text-[12px]" style={{ background: "rgba(235,20,63,.06)", borderColor: "rgba(235,20,63,.3)", color: "#eb143f" }}>
          {String((error as Error)?.message ?? "").includes("401")
            ? "Not authenticated — visit /api/dev/session to establish a dev session."
            : `Failed to load: ${(error as Error)?.message}`}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border px-4 py-8 text-center text-[12px]" style={{ background: "var(--surface)", borderColor: "var(--helm-border)", color: "var(--text-muted-color)" }}>
          {projects.length === 0 ? "No projects yet. Create one to get started." : "No projects match the current filters."}
        </div>
      ) : (
        <ResponsiveTable
          columns={columns}
          rows={rows}
          gridTemplate="1.5fr .4fr .4fr .8fr .9fr"
          onRowClick={(r: ProjectRow) => {
            window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/projects/${r.id}`;
          }}
        />
      )}
    </>
  );
}
