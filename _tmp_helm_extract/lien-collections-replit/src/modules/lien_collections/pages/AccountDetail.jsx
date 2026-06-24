import { useParams } from "react-router-dom";
import { Landmark, Clock } from "lucide-react";
import { findAccount } from "../data/mock";
import { money, alpha, daysAgo } from "@/lib/utils";
import AgingBuckets from "../components/AgingBuckets";
import ActivityTimeline from "../components/ActivityTimeline";
import QueueList from "../components/QueueList";
import { useRightPanel } from "../layout/AppShell";
import { Panel } from "./Dashboard";

/** Account Detail (P9) — aging, lien backstop, activity, promises. */
export default function AccountDetail() {
  const { accountId } = useParams();
  const a = findAccount(accountId);

  useRightPanel(
    <Panel title="Actions">
      <QueueList items={[
        { id: "x1", title: "Log activity", sub: "Writes to HubSpot" },
        { id: "x2", title: "Record promise-to-pay", sub: "Suppresses dunning" },
        { id: "x3", title: "Create payment plan", sub: "Installments" },
        { id: "x4", title: "Escalate", sub: "Advance dunning stage", action: "Escalate", actionTone: "#eb143f" },
      ]} />
    </Panel>,
    [accountId]
  );

  const timeline = [
    { text: `Risk score recalculated → ${a.risk}`, date: "Jun 17, 2026", color: a.risk >= 75 ? "#eb143f" : "#6366f1" },
    a.promise
      ? { text: "Promise-to-pay recorded — $12,400 by Jul 1", date: "Jun 12, 2026", color: "#6366f1" }
      : { text: "Dunning email sent (step 3 of 4)", date: "Jun 12, 2026", color: "#f59f0a" },
    { text: `Account escalated to ${a.stage}`, date: "Jun 4, 2026", color: "#eb143f" },
    { text: "First invoice past due (30 days)", date: "May 8, 2026", color: "#f59f0a" },
  ];

  return (
    <>
      {a.promise && (
        <div className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: alpha("#6366f1", 0.08), border: `1px solid ${alpha("#6366f1", 0.32)}` }}>
          <Clock className="h-[17px] w-[17px] shrink-0" style={{ color: "#818cf8" }} />
          <div className="text-[13px] text-text">Open promise-to-pay on file — <span className="font-semibold" style={{ color: "#818cf8" }}>dunning suppressed until Jul 1, 2026</span>.</div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface p-5">
        <div>
          <div className="text-[18px] font-bold tracking-tight text-text">{a.client}</div>
          <div className="mt-0.5 text-[12.5px] text-text-dim">{a.stage} · risk score {a.risk} · last contact {daysAgo(a.last)}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[22px] font-bold text-error">{money(a.amount)}</div>
          <div className="text-[11.5px] text-text-muted">{a.oldest} days oldest</div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-[18px]">
        <div className="mb-3 text-[13px] font-semibold text-text">Aging breakdown</div>
        <AgingBuckets values={a.aging} variant="columns" />
      </div>

      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-[18px] py-3.5">
        <Landmark className="h-4 w-4 shrink-0 text-warning" />
        <div className="text-[12.5px] text-text-dim">Lien backstop — notice deadline on linked stream <span className="font-semibold text-text">{a.lienDeadline}</span></div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-3.5 text-sm font-semibold text-text">Activity timeline</div>
        <ActivityTimeline items={timeline} />
      </div>
    </>
  );
}
