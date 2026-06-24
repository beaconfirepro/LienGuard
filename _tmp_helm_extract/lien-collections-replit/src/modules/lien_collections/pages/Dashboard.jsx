import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { DASHBOARD_KPIS, ACCOUNTS, AGING_TOTALS } from "../data/mock";
import { money } from "@/lib/utils";
import AgingBuckets from "../components/AgingBuckets";
import DeadlineCountdown from "../components/DeadlineCountdown";
import QueueList from "../components/QueueList";
import { useRightPanel } from "../layout/AppShell";

const DEADLINES = [
  { pid: "p5", project: "Grandview Hotel", notice: "March monthly · § 53.056", days: -3 },
  { pid: "p1", project: "Harbor Logistics — Bay 3", notice: "March monthly · § 53.056", days: -3 },
  { pid: "p2", project: "Northgate Medical — Wing C", notice: "June monthly · § 53.056", days: 27 },
];

function Kpi({ k }) {
  const val = (k.prefix || "") + (k.dec ? k.value.toFixed(k.dec) : k.value) + (k.suffix || "");
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface px-4 pb-3.5 pt-4">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: k.color }} />
      <div className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">{k.label}</div>
      <div className="mt-1.5 font-mono text-[26px] font-bold leading-none" style={{ color: k.color }}>{val}</div>
      <div className="mt-0.5 text-[11.5px] text-text-dim">{k.sub}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  useRightPanel(
    <Panel title="Due This Month">
      <QueueList
        items={[
          { id: "d1", title: "Grandview — affidavit", sub: "Lien filing deadline", action: "Escalate", actionTone: "#eb143f" },
          { id: "d2", title: "Harbor Logistics — May notice", sub: "Ready to send", action: "Send notice", actionTone: "#f59e0b" },
          { id: "d3", title: "Cedar Ridge — final waiver", sub: "Pending PM + Finance", action: "Review", actionTone: "#6366f1" },
        ]}
      />
    </Panel>,
    []
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {DASHBOARD_KPIS.map((k) => <Kpi key={k.label} k={k} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Liens snapshot */}
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-[18px] py-3.5">
            <div className="text-[14.5px] font-semibold text-text">Liens snapshot</div>
            <span className="text-[11px] text-text-dim">deadlines this month</span>
          </div>
          {DEADLINES.map((d) => (
            <button key={d.project} onClick={() => navigate(`/lien-collections/projects/${d.pid}`)} className="flex w-full items-center gap-3 border-b border-border px-[18px] py-3 text-left last:border-0 hover:bg-surface-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-text">{d.project}</div>
                <div className="mt-0.5 text-[11.5px] text-text-muted">{d.notice}</div>
              </div>
              <DeadlineCountdown days={d.days} />
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
            </button>
          ))}
        </div>

        {/* Collections snapshot */}
        <div className="rounded-lg border border-border bg-surface p-[18px]">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-[14.5px] font-semibold text-text">AR aging</div>
            <span className="font-mono text-[13px] font-semibold text-text">{money(AGING_TOTALS.reduce((a, b) => a + b, 0))}</span>
          </div>
          <AgingBuckets values={AGING_TOTALS} variant="bars" />
          <div className="mb-2.5 mt-[18px] text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Top overdue accounts</div>
          <div className="flex flex-col gap-2">
            {ACCOUNTS.slice(0, 3).map((a) => (
              <button key={a.id} onClick={() => navigate(`/lien-collections/collections/${a.id}`)} className="flex items-center justify-between gap-2.5 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-left">
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-medium text-text">{a.client}</div>
                  <div className="mt-0.5 text-[11px] text-text-muted">{a.oldest}d oldest · {a.stage}</div>
                </div>
                <span className="shrink-0 font-mono text-[13px] font-semibold text-error">{money(a.amount)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function Panel({ title, accent = "#6366f1", count, children }) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <div className="text-[13.5px] font-semibold text-text">{title}</div>
        {count != null && (
          <span className="rounded-full px-2 py-0.5 font-mono text-[11.5px] font-semibold" style={{ color: accent, background: "rgba(99,102,241,.14)" }}>{count}</span>
        )}
      </div>
      {children}
    </>
  );
}
