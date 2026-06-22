import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Phone, Plus, Check, X } from "lucide-react";
import { ACCOUNTS, AGING_TOTALS, isOverdue } from "../data/mock";
import { ESCALATION_STAGES, STAGE_COLOR } from "@/config/designSystem";
import { money, alpha, daysAgo } from "@/lib/utils";
import AgingBuckets from "../components/AgingBuckets";
import QueueList from "../components/QueueList";
import { useRightPanel } from "../layout/AppShell";
import { Panel } from "./Dashboard";

const riskColor = (r) => (r >= 75 ? "#eb143f" : r >= 45 ? "#f59f0a" : "#14eba3");

/**
 * Collections Pipeline (P8) — all overdue AR.
 * Collapsible call list (who to call + last contact) + collapsible stage
 * sections. "Add to call list" puts an account on the call list AND keeps it
 * in its stage section.
 */
export default function CollectionsPipeline() {
  const navigate = useNavigate();
  const [callIds, setCallIds] = useState(["a1", "a2", "a7"]);
  const [closed, setClosed] = useState({});
  const [contactLog, setContactLog] = useState({});

  const overdue = ACCOUNTS.filter(isOverdue);
  const inCall = (id) => callIds.includes(id);
  const toggleSection = (k) => setClosed((c) => ({ ...c, [k]: !c[k] }));
  const toggleCall = (id) => setCallIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const logCall = (id) => setContactLog((c) => ({ ...c, [id]: 0 }));

  const callAccts = overdue.filter((a) => inCall(a.id)).sort((a, b) => b.risk - a.risk);

  useRightPanel(
    <Panel title="Call Queue" accent="#eb143f" count={callAccts.length}>
      <QueueList items={callAccts.slice(0, 4).map((a) => ({ id: a.id, title: a.client, sub: `Risk ${a.risk} · ${money(a.amount)}`, action: "Log activity", actionTone: "#6366f1" }))} />
    </Panel>,
    [callAccts.length]
  );

  return (
    <>
      {/* AR aging */}
      <div className="rounded-lg border border-border bg-surface p-[18px]">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-[14.5px] font-semibold text-text">Accounts receivable aging</div>
          <span className="font-mono text-[14px] font-semibold text-error">{money(AGING_TOTALS.reduce((a, b) => a + b, 0))}</span>
        </div>
        <AgingBuckets values={AGING_TOTALS} variant="columns" />
      </div>

      {/* Call list (collapsible) */}
      <Section open={!closed.__call} onToggle={() => toggleSection("__call")} header={
        <>
          <Phone className="h-[17px] w-[17px] shrink-0 text-success" />
          <div className="flex-1">
            <div className="text-[14.5px] font-semibold text-text">Call list</div>
            <div className="text-[11px] text-text-muted">Who to call next · last contact · ranked by risk</div>
          </div>
          <span className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold text-success" style={{ background: alpha("#14eba3", 0.14) }}>{callAccts.length}</span>
          <span className="font-mono text-[12.5px] font-semibold text-error">{money(callAccts.reduce((x, a) => x + a.amount, 0))}</span>
        </>
      }>
        {callAccts.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs leading-relaxed text-text-muted">No accounts on the call list yet.<br />Add one from a stage section below.</div>
        ) : (
          callAccts.map((a) => {
            const d = contactLog[a.id] != null ? contactLog[a.id] : a.last;
            const lc = d >= 14 ? "#eb143f" : d >= 7 ? "#f59f0a" : "#14eba3";
            return (
              <div key={a.id} onClick={() => navigate(`/lien-collections/collections/${a.id}`)} className="flex cursor-pointer items-center gap-3 border-b border-border px-[18px] py-3 last:border-0 hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-text">{a.client}</div>
                  <div className="truncate text-[11.5px] text-text-muted">{a.stage} · {a.oldest}d oldest · {a.invoices} inv</div>
                </div>
                <div className="min-w-0 text-right">
                  <div className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: lc }}>
                    <Phone className="h-3 w-3" />Last contact: {daysAgo(d)}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-text-muted">via {a.via} · Next: {a.next}</div>
                </div>
                <RiskPill risk={a.risk} />
                <span className="w-[74px] shrink-0 text-right font-mono text-[13.5px] font-semibold text-error">{money(a.amount)}</span>
                <button onClick={(e) => { e.stopPropagation(); logCall(a.id); }} className="flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold text-success" style={{ background: alpha("#14eba3", 0.14), borderColor: alpha("#14eba3", 0.3) }}>
                  <Phone className="h-3.5 w-3.5" />Log call
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleCall(a.id); }} title="Remove from call list" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-text-muted">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </Section>

      {/* Stage sections (collapsible) */}
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
                <span className="text-[12.5px] font-semibold text-text">{stage}</span>
                <span className="rounded-full border border-border bg-surface px-2 py-px font-mono text-[11px] text-text-muted">{list.length}</span>
                <span className="ml-auto font-mono text-[12.5px] text-text-dim">{money(list.reduce((x, a) => x + a.amount, 0))}</span>
              </>
            }
          >
            {list.map((a) => {
              const on = inCall(a.id);
              return (
                <div key={a.id} onClick={() => navigate(`/lien-collections/collections/${a.id}`)} className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-text">{a.client}</div>
                    <div className="truncate text-[11.5px] text-text-muted">{a.oldest}d oldest · {a.invoices} inv · last contact {a.last}d ago</div>
                  </div>
                  <RiskPill risk={a.risk} />
                  <span className="w-[74px] shrink-0 text-right font-mono text-[13px] font-semibold text-error">{money(a.amount)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCall(a.id); }}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-semibold"
                    style={on
                      ? { color: "#14eba3", background: alpha("#14eba3", 0.14), borderColor: alpha("#14eba3", 0.3) }
                      : { color: "var(--text)", background: "var(--surface-2)", borderColor: "var(--border)" }}
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

function Section({ open, onToggle, header, children }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <button onClick={onToggle} className="flex w-full items-center gap-2.5 border-b border-border bg-surface-2 px-4 py-3 text-left">
        <ChevronRight className={`h-4 w-4 shrink-0 text-text-dim transition-transform ${open ? "rotate-90" : ""}`} />
        {header}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function RiskPill({ risk }) {
  const c = riskColor(risk);
  return (
    <div className="flex shrink-0 items-center gap-1">
      <span className="font-mono text-[9.5px] text-text-muted">RISK</span>
      <span className="rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-bold" style={{ color: c, background: alpha(c, 0.15) }}>{risk}</span>
    </div>
  );
}
