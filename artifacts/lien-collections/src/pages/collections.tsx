import * as React from "react";
import { useLocation } from "wouter";
import { ChevronRight, Phone, Plus, Check, X } from "lucide-react";
import { Panel, useRightPanel } from "@/components/nav/AppShell";
import { QueueList } from "@/components/ui/queue-list";
import { AgingBuckets } from "@/components/ui/aging-buckets";
import { ESCALATION_STAGES, STAGE_COLOR } from "@/config/design-system";
import { money, alpha, daysAgo } from "@/lib/utils";

const ACCOUNTS = [
  { id: "a1", client: "Grandview Hospitality", amount: 47100, oldest: 124, status: "lapsed", stage: "Lien filing", risk: 92, invoices: 3, lienDeadline: "Jun 15 (overdue)", promise: false, last: 2, via: "certified mail", next: "File lien affidavit", aging: [0, 0, 19200, 27900] },
  { id: "a2", client: "Turnbull Construction", amount: 38200, oldest: 96, status: "overdue", stage: "Pre-lien notice", risk: 81, invoices: 2, lienDeadline: "Jun 15, 2026", promise: false, last: 5, via: "phone", next: "Send pre-lien notice", aging: [0, 0, 38200, 0] },
  { id: "a3", client: "Coastal GC", amount: 24800, oldest: 68, status: "overdue", stage: "Pre-lien notice", risk: 74, invoices: 2, lienDeadline: "Jul 15, 2026", promise: true, last: 1, via: "email", next: "Confirm promise-to-pay", aging: [0, 12400, 12400, 0] },
  { id: "a4", client: "Apex General", amount: 16300, oldest: 41, status: "at-risk", stage: "Soft reminder", risk: 52, invoices: 1, lienDeadline: "Jul 15, 2026", promise: false, last: 9, via: "email", next: "Second reminder call", aging: [0, 16300, 0, 0] },
  { id: "a5", client: "Vantage Construction", amount: 9400, oldest: 22, status: "at-risk", stage: "Soft reminder", risk: 38, invoices: 1, lienDeadline: "Aug 15, 2026", promise: false, last: 16, via: "phone", next: "First reminder call", aging: [9400, 0, 0, 0] },
  { id: "a7", client: "Lone Star Mall Partners", amount: 61300, oldest: 156, status: "lapsed", stage: "Agency / attorney", risk: 95, invoices: 4, lienDeadline: "Lapsed", promise: false, last: 11, via: "attorney letter", next: "Attorney follow-up", aging: [0, 0, 0, 61300] },
];

const AGING_TOTALS = [18400, 44900, 31600, 47100];

const riskColor = (r: number) => r >= 75 ? "#eb143f" : r >= 45 ? "#f59f0a" : "#14eba3";
const isOverdue = (a: typeof ACCOUNTS[number]) => a.oldest >= 31;

export default function CollectionsPage() {
  const [, navigate] = useLocation();
  const [callIds, setCallIds] = React.useState(["a1", "a2", "a7"]);
  const [closed, setClosed] = React.useState<Record<string, boolean>>({});
  const [contactLog, setContactLog] = React.useState<Record<string, number>>({});

  const overdue = ACCOUNTS.filter(isOverdue);
  const inCall = (id: string) => callIds.includes(id);
  const toggleSection = (k: string) => setClosed((c) => ({ ...c, [k]: !c[k] }));
  const toggleCall = (id: string) => setCallIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const logCall = (id: string) => setContactLog((c) => ({ ...c, [id]: 0 }));
  const callAccts = overdue.filter((a) => inCall(a.id)).sort((a, b) => b.risk - a.risk);

  useRightPanel(
    <Panel title="Call Queue" accent="#eb143f" count={callAccts.length}>
      <QueueList items={callAccts.slice(0, 4).map((a) => ({ id: a.id, title: a.client, sub: `Risk ${a.risk} · ${money(a.amount)}`, action: "Log activity", actionTone: "#6366f1" }))} />
    </Panel>,
    [callAccts.length],
  );

  return (
    <>
      <div className="rounded-lg border p-[18px]" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-[14.5px] font-semibold" style={{ color: "var(--text-base)" }}>Accounts receivable aging</div>
          <span className="font-mono text-[14px] font-semibold text-[#eb143f]">{money(AGING_TOTALS.reduce((a, b) => a + b, 0))}</span>
        </div>
        <AgingBuckets values={AGING_TOTALS} variant="columns" />
      </div>

      {/* Call list section */}
      <Section
        open={!closed["__call"]}
        onToggle={() => toggleSection("__call")}
        header={
          <>
            <Phone className="h-[17px] w-[17px] shrink-0 text-[#14eba3]" />
            <div className="flex-1">
              <div className="text-[14.5px] font-semibold" style={{ color: "var(--text-base)" }}>Call list</div>
              <div className="text-[11px]" style={{ color: "var(--text-muted-color)" }}>Ranked by risk</div>
            </div>
            <span className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold text-[#14eba3]" style={{ background: alpha("#14eba3", 0.14) }}>{callAccts.length}</span>
            <span className="font-mono text-[12.5px] font-semibold text-[#eb143f]">{money(callAccts.reduce((x, a) => x + a.amount, 0))}</span>
          </>
        }
      >
        {callAccts.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs leading-relaxed" style={{ color: "var(--text-muted-color)" }}>No accounts on call list yet.</div>
        ) : callAccts.map((a) => {
          const d = contactLog[a.id] != null ? contactLog[a.id] : a.last;
          const lc = d >= 14 ? "#eb143f" : d >= 7 ? "#f59f0a" : "#14eba3";
          return (
            <div
              key={a.id}
              className="flex cursor-pointer items-center gap-3 border-b px-[18px] py-3 last:border-0"
              style={{ borderColor: "var(--helm-border)" }}
              onClick={() => navigate(`/collections/${a.id}`)}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold" style={{ color: "var(--text-base)" }}>{a.client}</div>
                <div className="truncate text-[11.5px]" style={{ color: "var(--text-muted-color)" }}>{a.stage} · {a.oldest}d oldest</div>
              </div>
              <div className="min-w-0 text-right">
                <div className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: lc }}>
                  <Phone className="h-3 w-3" />Last: {daysAgo(d)}
                </div>
                <div className="mt-0.5 text-[10.5px]" style={{ color: "var(--text-muted-color)" }}>Next: {a.next}</div>
              </div>
              <RiskPill risk={a.risk} />
              <span className="w-[74px] shrink-0 text-right font-mono text-[13.5px] font-semibold text-[#eb143f]">{money(a.amount)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); logCall(a.id); }}
                className="flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold text-[#14eba3]"
                style={{ background: alpha("#14eba3", 0.14), borderColor: alpha("#14eba3", 0.3) }}
              >
                <Phone className="h-3.5 w-3.5" />Log call
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleCall(a.id); }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
                style={{ borderColor: "var(--helm-border)", color: "var(--text-muted-color)" }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </Section>

      {ESCALATION_STAGES.map((stage) => {
        const list = overdue.filter((a) => a.stage === stage).sort((a, b) => b.risk - a.risk);
        if (!list.length) return null;
        return (
          <Section
            key={stage}
            open={!closed[stage]}
            onToggle={() => toggleSection(stage)}
            header={
              <>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STAGE_COLOR[stage] }} />
                <span className="text-[12.5px] font-semibold" style={{ color: "var(--text-base)" }}>{stage}</span>
                <span className="rounded-full border px-2 py-px font-mono text-[11px]" style={{ borderColor: "var(--helm-border)", color: "var(--text-muted-color)" }}>{list.length}</span>
                <span className="ml-auto font-mono text-[12.5px]" style={{ color: "var(--text-dim)" }}>{money(list.reduce((x, a) => x + a.amount, 0))}</span>
              </>
            }
          >
            {list.map((a) => {
              const on = inCall(a.id);
              return (
                <div
                  key={a.id}
                  className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-0"
                  style={{ borderColor: "var(--helm-border)" }}
                  onClick={() => navigate(`/collections/${a.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium" style={{ color: "var(--text-base)" }}>{a.client}</div>
                    <div className="truncate text-[11.5px]" style={{ color: "var(--text-muted-color)" }}>{a.oldest}d oldest · {a.invoices} inv</div>
                  </div>
                  <RiskPill risk={a.risk} />
                  <span className="w-[74px] shrink-0 text-right font-mono text-[13px] font-semibold text-[#eb143f]">{money(a.amount)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCall(a.id); }}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-semibold"
                    style={on
                      ? { color: "#14eba3", background: alpha("#14eba3", 0.14), borderColor: alpha("#14eba3", 0.3) }
                      : { color: "var(--text-base)", background: "var(--surface-2)", borderColor: "var(--helm-border)" }}
                  >
                    {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {on ? "On call list" : "Add to call list"}
                  </button>
                </div>
              );
            })}
          </Section>
        );
      })}
    </>
  );
}

function Section({ open, onToggle, header, children }: { open: boolean; onToggle: () => void; header: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
      <button onClick={onToggle} className="flex w-full items-center gap-2.5 border-b px-4 py-3 text-left" style={{ background: "var(--surface-2)", borderColor: "var(--helm-border)" }}>
        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} style={{ color: "var(--text-dim)" }} />
        {header}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function RiskPill({ risk }: { risk: number }) {
  const c = riskColor(risk);
  return (
    <div className="flex shrink-0 items-center gap-1">
      <span className="font-mono text-[9.5px]" style={{ color: "var(--text-muted-color)" }}>RISK</span>
      <span className="rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-bold" style={{ color: c, background: alpha(c, 0.15) }}>{risk}</span>
    </div>
  );
}
