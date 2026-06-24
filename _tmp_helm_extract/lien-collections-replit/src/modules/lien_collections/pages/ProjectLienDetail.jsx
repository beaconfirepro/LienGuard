import { useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { findProject } from "../data/mock";
import { money } from "@/lib/utils";
import StatusBadge from "../components/StatusBadge";
import DeadlineCountdown from "../components/DeadlineCountdown";
import ChecklistIndicator from "../components/ChecklistIndicator";
import PartyCard from "../components/PartyCard";
import ActivityTimeline from "../components/ActivityTimeline";
import QueueList from "../components/QueueList";
import { useRightPanel } from "../layout/AppShell";
import { Panel } from "./Dashboard";

/** Project Lien Detail (P4) — checklist, parties, streams, timeline. */
export default function ProjectLienDetail() {
  const { id } = useParams();
  const p = findProject(id);
  const done = p.checklist.filter((c) => c.ok).length;
  const missing = p.checklist.length - done;

  useRightPanel(
    <Panel title="Deadlines" accent="#f59f0a" count={p.streams.length}>
      <QueueList items={p.streams.map((st, i) => ({ id: "ps" + i, title: `${st.month} notice`, sub: `Due ${st.deadline}`, action: i === 0 ? "Generate notice" : null, actionTone: "#f59e0b" }))} />
    </Panel>,
    [id]
  );

  return (
    <>
      {missing > 0 && (
        <div className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: "rgba(245,159,10,.08)", border: "1px solid rgba(245,159,10,.3)" }}>
          <AlertTriangle className="h-[18px] w-[18px] shrink-0 text-warning" />
          <div className="text-[13px] text-text">Lien checklist incomplete — <span className="font-semibold text-warning">{missing} required item(s) missing</span>. Filing rights may be at risk.</div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface p-5">
        <div>
          <div className="text-[18px] font-bold tracking-tight text-text">{p.name}</div>
          <div className="mt-0.5 text-[12.5px] text-text-dim">{p.client} · {p.tier} · <span className="text-text">{p.workflow}</span></div>
        </div>
        <StatusBadge status={p.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-[18px]">
          <ChecklistIndicator items={p.checklist} />
        </div>
        <div className="flex flex-col gap-3">
          {p.parties.map((pt) => <PartyCard key={pt.role} {...pt} />)}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-[18px] py-3.5 text-sm font-semibold text-text">Work-month streams</div>
        {p.streams.map((st) => (
          <div key={st.month} className="flex items-center gap-3.5 border-b border-border px-[18px] py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-text">{st.month}</div>
              <div className="mt-0.5 text-[11.5px] text-text-muted">Notice deadline {st.deadline}</div>
            </div>
            <span className="font-mono text-[13px] text-text">{money(st.amount)}</span>
            <DeadlineCountdown days={st.days} />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-3.5 text-sm font-semibold text-text">Lien timeline</div>
        <ActivityTimeline items={p.timeline} />
      </div>
    </>
  );
}
