import { Panel, useRightPanel } from "@/components/nav/AppShell";
import { QueueList } from "@/components/ui/queue-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApprovalGateBanner } from "@/components/ui/approval-gate-banner";
import { money } from "@/lib/utils";

const WAIVERS = [
  { type: "Conditional Progress", project: "Northgate Medical — Wing C", stream: "May 2026", amount: 47800, status: "approved", gate: null, tone: "#f59f0a" },
  { type: "Unconditional Progress", project: "Harbor Logistics — Bay 3", stream: "April 2026", amount: 41300, status: "pending", gate: "Requires Project Manager approval before release.", tone: "#f59f0a" },
  { type: "Conditional Final", project: "Cedar Ridge Apartments", stream: "May 2026", amount: 23400, status: "approved", gate: null, tone: "#f59f0a" },
  { type: "Unconditional Final", project: "Cedar Ridge Apartments", stream: "Final", amount: 23400, status: "blocked", gate: "Mark payment cleared to generate the unconditional final waiver (requires PM + Finance).", tone: "#eb143f" },
];

export default function WaiversPage() {
  useRightPanel(
    <Panel title="Approval Queue" count={2}>
      <QueueList items={[
        { id: "w1", title: "Unconditional Progress", sub: "Harbor Logistics · awaiting PM", action: "Approve (PM)", actionTone: "#14eba3" },
        { id: "w2", title: "Unconditional Final", sub: "Cedar Ridge · awaiting PM + Finance", action: "Mark cleared", actionTone: "#6366f1" },
      ]} />
    </Panel>,
    [],
  );

  return (
    <div className="flex flex-col gap-3">
      {WAIVERS.map((w, i) => (
        <div key={i} className="rounded-lg border p-[18px]" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold" style={{ color: "var(--text-base)" }}>{w.type}</div>
              <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--text-dim)" }}>{w.project} · {w.stream}</div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[14px]" style={{ color: "var(--text-base)" }}>{money(w.amount)}</span>
              <StatusBadge status={w.status} />
            </div>
          </div>
          {w.gate && <div className="mt-3"><ApprovalGateBanner text={w.gate} tone={w.tone} /></div>}
        </div>
      ))}
    </div>
  );
}
