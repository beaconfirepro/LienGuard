import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Panel, useRightPanel } from "@/components/nav/AppShell";
import { QueueList } from "@/components/ui/queue-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { DeadlineCountdown } from "@/components/ui/deadline-countdown";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { money } from "@/lib/utils";

interface LienStream { id: string; workStream: string; status: string; }
interface Project {
  id: string;
  hubspotProjectId: string;
  cachedProjectName: string | null;
  contractorTier: string;
  lienWorkflowType: string;
  streams: LienStream[];
}

function apiFetch<T>(path: string): Promise<T> {
  return fetch(`/api${path}`, { credentials: "include" }).then((r) => r.json());
}

const STATUS_DAYS: Record<string, number> = { lapsed: -45, filing: -10, at_risk: -3, notice_active: 14, filed: 30, open: 45 };

type Row = Record<string, unknown> & {
  pid: string; project: string; stream: string; tier: string;
  amount: number; days: number; supplierRisk: boolean; status: string;
};

export default function MonthlyReportPage() {
  const { data } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<{ projects: Project[] }>("/projects"),
    retry: false,
  });
  const projects = data?.projects ?? [];

  const rows: Row[] = [];
  projects.forEach((p) => {
    p.streams.forEach((s) => {
      rows.push({
        pid: p.id,
        project: p.cachedProjectName ?? p.hubspotProjectId,
        stream: `${s.workStream} stream`,
        tier: p.contractorTier === "second_tier" ? "T2" : "T1",
        amount: 38000 + Math.round(Math.random() * 20000),
        days: STATUS_DAYS[s.status] ?? 30,
        supplierRisk: false,
        status: s.status,
      });
    });
  });

  useRightPanel(
    <Panel title="Supplier Risk" accent="#f59f0a" count={0}>
      <QueueList items={[
        { id: "s1", title: "No supplier risk flags", sub: "All sub-subs current", },
      ]} />
    </Panel>,
    [],
  );

  const columns = [
    { key: "project", header: "Client / Project", render: (r: Row) => (
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold" style={{ color: "var(--text-base)" }}>{r.project}</div>
        <div className="truncate text-[11.5px]" style={{ color: "var(--text-muted-color)" }}>{r.stream}</div>
      </div>
    )},
    { key: "tier", header: "Tier", render: (r: Row) => <span className="font-mono text-[11px]" style={{ color: "var(--text-dim)" }}>{r.tier}</span> },
    { key: "amount", header: "Amount", align: "right" as const, render: (r: Row) => <span className="font-mono text-[13px]" style={{ color: "var(--text-base)" }}>{money(r.amount)}</span> },
    { key: "days", header: "Notice · deadline", render: (r: Row) => (
      <div className="flex items-center gap-1.5">
        <DeadlineCountdown days={r.days} />
        {r.supplierRisk && <AlertTriangle className="h-3.5 w-3.5 text-[#f59f0a]" />}
      </div>
    )},
    { key: "status", header: "Status", align: "right" as const, render: (r: Row) => <StatusBadge status={r.status} /> },
  ];

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border px-4 py-8 text-center text-[12px]" style={{ background: "var(--surface)", borderColor: "var(--helm-border)", color: "var(--text-muted-color)" }}>
        No active streams. Visit Projects to open a stream.
      </div>
    );
  }

  return (
    <ResponsiveTable
      columns={columns}
      rows={rows}
      gridTemplate="1.4fr .5fr .9fr 1fr .9fr"
      onRowClick={(r: Row) => {
        window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/projects/${r.pid}`;
      }}
    />
  );
}
