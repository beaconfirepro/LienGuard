import * as React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Panel, useRightPanel } from "@/components/nav/AppShell";
import { QueueList } from "@/components/ui/queue-list";
import { AgingBuckets } from "@/components/ui/aging-buckets";
import { DeadlineCountdown } from "@/components/ui/deadline-countdown";
import { StatusBadge } from "@/components/ui/status-badge";

interface Project {
  id: string;
  cachedProjectName: string | null;
  hubspotProjectId: string;
  lienWorkflowType: string;
  contractorTier: string;
  streams: { id: string; workStream: string; status: string }[];
  completionChecklistComplete: boolean;
}

function apiFetch<T>(path: string): Promise<T> {
  return fetch(`/api${path}`, { credentials: "include" }).then((r) => r.json());
}

const RISK_ORDER = ["at_risk", "filing", "lapsed", "notice_active", "filed", "open"];
function highestRisk(streams: Project["streams"]) {
  for (const s of RISK_ORDER) {
    if (streams.some((st) => st.status === s)) return s;
  }
  return streams[0]?.status ?? "open";
}

const DAYS_FAKE: Record<string, number> = {
  at_risk: -3, filing: -14, lapsed: -45, notice_active: 12, filed: 30, open: 45,
};

const KPI_COLORS = ["#6366f1", "#f59f0a", "#eb143f", "#eb143f", "#14eba3", "#6366f1"];

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<{ projects: Project[] }>("/projects"),
    retry: false,
  });

  const projects = data?.projects ?? [];
  const atRisk = projects.filter((p) => {
    const r = highestRisk(p.streams);
    return r === "at_risk" || r === "filing" || r === "lapsed";
  });
  const incompleteCount = projects.filter((p) => !p.completionChecklistComplete).length;
  const totalStreams = projects.reduce((a, p) => a + p.streams.length, 0);
  const lapsed = projects.filter((p) => p.streams.some((s) => s.status === "lapsed")).length;

  const kpis = [
    { label: "Active Streams", value: totalStreams, sub: `across ${projects.length} projects`, color: "#6366f1" },
    { label: "At Risk · This Month", value: atRisk.length, sub: "notice or filing due", color: "#f59f0a" },
    { label: "Rights Lapsed", value: lapsed, sub: lapsed > 0 ? "requires escalation" : "none lapsed", color: lapsed > 0 ? "#eb143f" : "#14eba3" },
    { label: "Incomplete Setup", value: incompleteCount, sub: "missing required fields", color: incompleteCount > 0 ? "#eb143f" : "#14eba3" },
    { label: "Total Projects", value: projects.length, sub: "in lien tracking", color: "#14eba3" },
    { label: "Jurisdictions", value: 1, sub: "Texas Ch. 53", color: "#6366f1" },
  ];

  useRightPanel(
    <Panel title="Due This Month">
      <QueueList
        items={atRisk.slice(0, 4).map((p, i) => ({
          id: p.id,
          title: p.cachedProjectName ?? p.hubspotProjectId,
          sub: `${highestRisk(p.streams).replace("_", " ")} · stream active`,
          action: i === 0 ? "View project" : undefined,
          actionTone: "#f59e0b",
        }))}
      />
    </Panel>,
    [atRisk.length],
  );

  const deadlineRows = projects
    .filter((p) => p.streams.length > 0)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.cachedProjectName ?? p.hubspotProjectId,
      status: highestRisk(p.streams),
      days: DAYS_FAKE[highestRisk(p.streams)] ?? 30,
    }));

  return (
    <>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k, i) => (
          <div key={k.label} className="relative overflow-hidden rounded-lg border px-4 pb-3.5 pt-4" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
            <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: KPI_COLORS[i] }} />
            <div className="truncate text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted-color)" }}>{k.label}</div>
            <div className="mt-1.5 font-mono text-[26px] font-bold leading-none" style={{ color: k.color }}>{k.value}</div>
            <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--text-dim)" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Liens snapshot */}
        <div className="overflow-hidden rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
          <div className="flex items-center justify-between border-b px-[18px] py-3.5" style={{ borderColor: "var(--helm-border)" }}>
            <div className="text-[14.5px] font-semibold" style={{ color: "var(--text-base)" }}>Liens snapshot</div>
            <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>active projects</span>
          </div>
          {deadlineRows.length === 0 ? (
            <div className="px-[18px] py-6 text-[12px]" style={{ color: "var(--text-muted-color)" }}>No projects yet.</div>
          ) : deadlineRows.map((d) => (
            <Link key={d.id} href={`/projects/${d.id}`}>
              <div className="flex w-full items-center gap-3 border-b px-[18px] py-3 text-left last:border-0 cursor-pointer hover:bg-[var(--surface-2)]" style={{ borderColor: "var(--helm-border)" }}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium" style={{ color: "var(--text-base)" }}>{d.name}</div>
                  <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--text-muted-color)" }}>Lien stream active</div>
                </div>
                <StatusBadge status={d.status} />
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted-color)" }} />
              </div>
            </Link>
          ))}
        </div>

        {/* AR aging placeholder */}
        <div className="rounded-lg border p-[18px]" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-[14.5px] font-semibold" style={{ color: "var(--text-base)" }}>AR aging</div>
            <span className="font-mono text-[13px] font-semibold text-[#eb143f]">$142K</span>
          </div>
          <AgingBuckets values={[18400, 44900, 31600, 47100]} variant="bars" />
          <div className="mb-2.5 mt-[18px] text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted-color)" }}>
            Collections pipeline
          </div>
          <Link href="/collections">
            <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 cursor-pointer hover:opacity-80" style={{ background: "var(--surface-2)", borderColor: "var(--helm-border)" }}>
              <div>
                <div className="text-[12.5px] font-medium" style={{ color: "var(--text-base)" }}>View all overdue accounts</div>
                <div className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted-color)" }}>6 accounts · escalation tracking</div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted-color)" }} />
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
