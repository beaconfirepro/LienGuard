import { useNavigate } from "react-router-dom";
import { PROJECTS } from "../data/mock";
import ResponsiveTable from "../components/ResponsiveTable";
import StatusBadge from "../components/StatusBadge";
import DeadlineCountdown from "../components/DeadlineCountdown";

/** Liens landing — full list of projects with lien information. Row → P4. */
export default function Liens() {
  const navigate = useNavigate();
  const rows = PROJECTS.map((p) => ({
    ...p,
    nextDays: Math.min(...p.streams.map((s) => s.days)),
  }));

  const columns = [
    { key: "name", header: "Project / Client", render: (r) => (
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-text">{r.name}</div>
        <div className="truncate text-[11.5px] text-text-muted">{r.client} · {r.streams.length} stream{r.streams.length === 1 ? "" : "s"}</div>
      </div>
    ) },
    { key: "tier", header: "Tier", render: (r) => <span className="font-mono text-[11px] text-text-dim">{r.tier.replace("Tier ", "T")}</span> },
    { key: "workflow", header: "Workflow", render: (r) => <span className="text-[11.5px] text-text-dim">{r.workflow}</span> },
    { key: "deadline", header: "Next deadline", render: (r) => <DeadlineCountdown days={r.nextDays} /> },
    { key: "status", header: "Status", align: "right", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      rows={rows}
      gridTemplate="1.5fr .5fr 1fr .8fr .8fr"
      onRowClick={(r) => navigate(`/lien-collections/projects/${r.id}`)}
    />
  );
}
