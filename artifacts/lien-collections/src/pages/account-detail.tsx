import { useParams } from "wouter";
import { Landmark, Clock } from "lucide-react";
import { Panel, useRightPanel } from "@/components/nav/AppShell";
import { QueueList } from "@/components/ui/queue-list";
import { AgingBuckets } from "@/components/ui/aging-buckets";
import { ActivityTimeline } from "@/components/ui/activity-timeline";
import { money, alpha, daysAgo } from "@/lib/utils";

const ACCOUNTS = [
  { id: "a1", client: "Grandview Hospitality", amount: 47100, oldest: 124, stage: "Lien filing", risk: 92, lienDeadline: "Jun 15 (overdue)", promise: false, last: 2, aging: [0, 0, 19200, 27900] },
  { id: "a2", client: "Turnbull Construction", amount: 38200, oldest: 96, stage: "Pre-lien notice", risk: 81, lienDeadline: "Jun 15, 2026", promise: false, last: 5, aging: [0, 0, 38200, 0] },
  { id: "a3", client: "Coastal GC", amount: 24800, oldest: 68, stage: "Pre-lien notice", risk: 74, lienDeadline: "Jul 15, 2026", promise: true, last: 1, aging: [0, 12400, 12400, 0] },
  { id: "a4", client: "Apex General", amount: 16300, oldest: 41, stage: "Soft reminder", risk: 52, lienDeadline: "Jul 15, 2026", promise: false, last: 9, aging: [0, 16300, 0, 0] },
  { id: "a5", client: "Vantage Construction", amount: 9400, oldest: 22, stage: "Soft reminder", risk: 38, lienDeadline: "Aug 15, 2026", promise: false, last: 16, aging: [9400, 0, 0, 0] },
  { id: "a7", client: "Lone Star Mall Partners", amount: 61300, oldest: 156, stage: "Agency / attorney", risk: 95, lienDeadline: "Lapsed", promise: false, last: 11, aging: [0, 0, 0, 61300] },
];

export default function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const a = ACCOUNTS.find((x) => x.id === accountId) ?? ACCOUNTS[0];

  useRightPanel(
    <Panel title="Actions">
      <QueueList items={[
        { id: "x1", title: "Log activity", sub: "Writes to HubSpot" },
        { id: "x2", title: "Record promise-to-pay", sub: "Suppresses dunning" },
        { id: "x3", title: "Create payment plan", sub: "Installments" },
        { id: "x4", title: "Escalate", sub: "Advance dunning stage", action: "Escalate", actionTone: "#eb143f" },
      ]} />
    </Panel>,
    [accountId],
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
          <div className="text-[13px]" style={{ color: "var(--text-base)" }}>
            Open promise-to-pay on file — <span className="font-semibold" style={{ color: "#818cf8" }}>dunning suppressed until Jul 1, 2026</span>.
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-5" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
        <div>
          <div className="text-[18px] font-bold tracking-tight" style={{ color: "var(--text-base)" }}>{a.client}</div>
          <div className="mt-0.5 text-[12.5px]" style={{ color: "var(--text-dim)" }}>{a.stage} · risk score {a.risk} · last contact {daysAgo(a.last)}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[22px] font-bold text-[#eb143f]">{money(a.amount)}</div>
          <div className="text-[11.5px]" style={{ color: "var(--text-muted-color)" }}>{a.oldest} days oldest</div>
        </div>
      </div>

      <div className="rounded-lg border p-[18px]" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
        <div className="mb-3 text-[13px] font-semibold" style={{ color: "var(--text-base)" }}>Aging breakdown</div>
        <AgingBuckets values={a.aging} variant="columns" />
      </div>

      <div className="flex items-center gap-2.5 rounded-lg border px-[18px] py-3.5" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
        <Landmark className="h-4 w-4 shrink-0 text-[#f59f0a]" />
        <div className="text-[12.5px]" style={{ color: "var(--text-dim)" }}>
          Lien backstop — notice deadline on linked stream <span className="font-semibold" style={{ color: "var(--text-base)" }}>{a.lienDeadline}</span>
        </div>
      </div>

      <div className="rounded-lg border p-5" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
        <div className="mb-3.5 text-sm font-semibold" style={{ color: "var(--text-base)" }}>Activity timeline</div>
        <ActivityTimeline items={timeline} />
      </div>
    </>
  );
}
