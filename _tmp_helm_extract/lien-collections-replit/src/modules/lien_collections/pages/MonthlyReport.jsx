import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { PROJECTS } from "../data/mock";
import { money } from "@/lib/utils";
import ResponsiveTable from "../components/ResponsiveTable";
import StatusBadge from "../components/StatusBadge";
import DeadlineCountdown from "../components/DeadlineCountdown";
import QueueList from "../components/QueueList";
import { useRightPanel } from "../layout/AppShell";
import { Panel } from "./Dashboard";

/** Monthly Lien Report (P2) — at-risk projects per stream. */
export default function MonthlyReport() {
  const navigate = useNavigate();

  const rows = [];
  PROJECTS.forEach((p) =>
    p.streams.forEach((st) =>
      rows.push({
        pid: p.id,
        project: p.name,
        client: p.client,
        stream: st.month,
        tier: p.tier.replace("Tier ", "T"),
        amount: st.amount,
        notice: p.workflow,
        days: st.days,
        supplierRisk: p.supplierRisk,
        status: st.days < -7 ? "overdue" : p.status === "cleared" ? "cleared" : st.days <= 7 ? "at-risk" : "active",
      })
    )
  );

  useRightPanel(
    <Panel title="Supplier Risk" accent="#f59f0a" count={2}>
      <QueueList items={[
        { id: "s1", title: "Harbor Logistics", sub: "Supplier may not have sent its own notice", action: "Send heads-up", actionTone: "#f59e0b" },
        { id: "s2", title: "Lincoln Elementary", sub: "Bonded job — verify bond claim window", action: "Send heads-up", actionTone: "#f59e0b" },
      ]} />
    </Panel>,
    []
  );

  const columns = [
    { key: "project", header: "Client / Project", render: (r) => (
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-text">{r.project}</div>
        <div className="truncate text-[11.5px] text-text-muted">{r.client} · {r.stream}</div>
      </div>
    ) },
    { key: "tier", header: "Tier", render: (r) => <span className="font-mono text-[11px] text-text-dim">{r.tier}</span> },
    { key: "amount", header: "Amount", align: "right", render: (r) => <span className="font-mono text-[13px] text-text">{money(r.amount)}</span> },
    { key: "notice", header: "Notice · deadline", render: (r) => (
      <div>
        <div className="truncate text-[11.5px] text-text-dim">{r.notice}</div>
        <div className="mt-1 flex items-center gap-1.5">
          <DeadlineCountdown days={r.days} />
          {r.supplierRisk && <AlertTriangle className="h-3.5 w-3.5 text-warning" title="Supplier-notice risk" />}
        </div>
      </div>
    ) },
    { key: "status", header: "Status", align: "right", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      rows={rows}
      gridTemplate="1.4fr .5fr .9fr 1fr .9fr"
      onRowClick={(r) => navigate(`/lien-collections/projects/${r.pid}`)}
    />
  );
}
