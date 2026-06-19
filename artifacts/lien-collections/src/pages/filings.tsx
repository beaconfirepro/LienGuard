/**
 * filings.tsx — Filings index.
 *
 * Route: /filing
 *
 * Lists every lien stream across all projects so a user can jump straight into
 * the per-stream Filing Workspace (/filing/:streamId). Previously the filing
 * workspace was only reachable from a project's detail page.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Panel, useRightPanel, useLeftPanel } from "@/components/nav/AppShell";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search } from "lucide-react";

interface LienStream {
  id: string;
  workStream: "construction" | "design" | string;
  status: string;
  openedAt: string | null;
}

interface Project {
  id: string;
  hubspotProjectId: string;
  cachedProjectName: string | null;
  county: string | null;
  lienWorkflowType: string;
  streams: LienStream[];
}

interface FilingRow {
  streamId: string;
  projectId: string;
  projectName: string;
  county: string | null;
  workStream: string;
  status: string;
  openedAt: string | null;
}

const WORKSTREAM_LABELS: Record<string, string> = {
  construction: "Construction",
  design: "Design",
};

const STATUS_FILTERS: { v: string; l: string }[] = [
  { v: "all", l: "All Filings" },
  { v: "at_risk", l: "At Risk" },
  { v: "filing", l: "Filing" },
  { v: "lapsed", l: "Rights Lapsed" },
  { v: "notice_active", l: "Notice Active" },
  { v: "filed", l: "Filed" },
  { v: "open", l: "Open" },
  { v: "released", l: "Released" },
  { v: "closed", l: "Closed" },
];

function apiFetch<T>(path: string): Promise<T> {
  return fetch(`/api${path}`, { credentials: "include" }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function FilingsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("all");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["projects", "all"],
    queryFn: () => apiFetch<{ projects: Project[] }>("/projects?limit=200"),
    retry: false,
  });

  const projects = data?.projects ?? [];

  const allFilings: FilingRow[] = projects.flatMap((p) =>
    p.streams.map((s) => ({
      streamId: s.id,
      projectId: p.id,
      projectName: p.cachedProjectName ?? p.hubspotProjectId,
      county: p.county,
      workStream: s.workStream,
      status: s.status,
      openedAt: s.openedAt,
    })),
  );

  const statusCounts: Record<string, number> = {};
  for (const f of allFilings) statusCounts[f.status] = (statusCounts[f.status] ?? 0) + 1;

  const filtered = allFilings.filter((f) => {
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = f.projectName.toLowerCase();
      const county = (f.county ?? "").toLowerCase();
      if (!name.includes(q) && !county.includes(q)) return false;
    }
    return true;
  });

  const atRiskCount = allFilings.filter(
    (f) => f.status === "at_risk" || f.status === "filing" || f.status === "lapsed",
  ).length;
  const filedCount = allFilings.filter((f) => f.status === "filed").length;

  const statusSig = Object.entries(statusCounts)
    .map(([k, v]) => `${k}:${v}`)
    .join(",");

  useLeftPanel(
    <Panel title="Filing Status" accent="#a855f7" count={allFilings.length}>
      <div className="flex flex-col gap-0.5 p-2">
        {STATUS_FILTERS.map(({ v, l }) => {
          const count = v === "all" ? allFilings.length : statusCounts[v] ?? 0;
          const active = filterStatus === v;
          return (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className="flex items-center justify-between rounded-md px-2.5 py-2 text-[12.5px]"
              style={
                active
                  ? { background: "var(--surface-3)", color: "var(--text-base)", fontWeight: 600 }
                  : { color: "var(--text-dim)", fontWeight: 500 }
              }
            >
              <span className="truncate">{l}</span>
              <span className="ml-2 font-mono text-[11px]" style={{ color: "var(--text-muted-color)" }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>,
    [filterStatus, statusSig],
  );

  useRightPanel(
    <Panel title="At Risk" accent="#eb143f" count={atRiskCount}>
      <div className="flex flex-col gap-2 p-3">
        {atRiskCount === 0 ? (
          <div className="text-[12px]" style={{ color: "var(--text-muted-color)" }}>
            No filings need urgent attention.
          </div>
        ) : (
          allFilings
            .filter((f) => f.status === "at_risk" || f.status === "filing" || f.status === "lapsed")
            .map((f) => (
              <button
                key={f.streamId}
                onClick={() => setLocation(`/filing/${f.streamId}`)}
                className="flex flex-col gap-1 rounded-md border px-3 py-2 text-left"
                style={{ background: "var(--surface-2)", borderColor: "var(--helm-border)" }}
              >
                <span className="truncate text-[12.5px] font-semibold" style={{ color: "var(--text-base)" }}>
                  {f.projectName}
                </span>
                <StatusBadge status={f.status} />
              </button>
            ))
        )}
      </div>
    </Panel>,
    [statusSig],
  );

  const columns = [
    {
      key: "project",
      header: "Project / Client",
      render: (r: FilingRow) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold" style={{ color: "var(--text-base)" }}>
            {r.projectName}
          </div>
          <div className="mt-0.5 truncate text-[11.5px]" style={{ color: "var(--text-muted-color)" }}>
            {r.county ? `${r.county} Co.` : "—"}
          </div>
        </div>
      ),
    },
    {
      key: "workStream",
      header: "Work Stream",
      render: (r: FilingRow) => (
        <span className="text-[12px]" style={{ color: "var(--text-dim)" }}>
          {WORKSTREAM_LABELS[r.workStream] ?? r.workStream}
        </span>
      ),
    },
    {
      key: "openedAt",
      header: "Opened",
      render: (r: FilingRow) => (
        <span className="font-mono text-[11.5px]" style={{ color: "var(--text-dim)" }}>
          {fmtDate(r.openedAt)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right" as const,
      render: (r: FilingRow) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <>
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Filings", value: isLoading ? "—" : allFilings.length, color: "#a855f7" },
          { label: "At Risk", value: isLoading ? "—" : atRiskCount, color: atRiskCount > 0 ? "#eb143f" : "#14eba3" },
          { label: "Filed", value: isLoading ? "—" : filedCount, color: "#6366f1" },
        ].map((k) => (
          <div
            key={k.label}
            className="relative overflow-hidden rounded-lg border px-4 pb-3.5 pt-4"
            style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}
          >
            <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: k.color }} />
            <div className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted-color)" }}>
              {k.label}
            </div>
            <div className="mt-1.5 font-mono text-[24px] font-bold leading-none" style={{ color: k.color }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-muted-color)" }} />
          <input
            placeholder="Search project or county…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border py-2 pl-9 pr-3 text-[13px] outline-none"
            style={{ background: "var(--surface-2)", borderColor: "var(--helm-border)", color: "var(--text-base)" }}
          />
        </div>
      </div>

      {/* Filings list */}
      {isLoading ? (
        <div
          className="rounded-lg border px-4 py-8 text-center text-[12px]"
          style={{ background: "var(--surface)", borderColor: "var(--helm-border)", color: "var(--text-muted-color)" }}
        >
          Loading filings…
        </div>
      ) : isError ? (
        <div
          className="rounded-lg border px-4 py-6 text-center text-[12px]"
          style={{ background: "rgba(235,20,63,.06)", borderColor: "rgba(235,20,63,.3)", color: "#eb143f" }}
        >
          {String((error as Error)?.message ?? "").includes("401")
            ? "Not authenticated — visit /api/dev/session to establish a dev session."
            : `Failed to load: ${(error as Error)?.message}`}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-lg border px-4 py-8 text-center text-[12px]"
          style={{ background: "var(--surface)", borderColor: "var(--helm-border)", color: "var(--text-muted-color)" }}
        >
          {allFilings.length === 0
            ? "No filings yet. Open a lien stream on a project to start a filing."
            : "No filings match the current filters."}
        </div>
      ) : (
        <ResponsiveTable
          columns={columns}
          rows={filtered}
          gridTemplate="1.6fr .8fr .8fr .9fr"
          onRowClick={(r: FilingRow) => setLocation(`/filing/${r.streamId}`)}
        />
      )}
    </>
  );
}
