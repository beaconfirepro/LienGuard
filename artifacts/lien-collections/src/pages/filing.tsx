import { AlertTriangle } from "lucide-react";
import { Panel, useRightPanel } from "@/components/nav/AppShell";
import { QueueList } from "@/components/ui/queue-list";
import { alpha } from "@/lib/utils";

const STEPS = [
  { n: 1, title: "Compliance check", body: "Verify every monthly notice was sent on time. 1 late notice flagged (March).", st: "Action needed", color: "#eb143f" },
  { n: 2, title: "Affidavit of lien (§ 53.054)", body: "Consolidate overdue months into a single sworn statement. Parties auto-filled from project.", st: "Ready", color: "#14eba3" },
  { n: 3, title: "Record with county", body: "County · filing date · recording reference · fee. Generates post-filing deadlines.", st: "Pending", color: "#5c6070" },
  { n: 4, title: "Release (§ 53.152)", body: "Generate and log a release once the claim is satisfied.", st: "Pending", color: "#5c6070" },
];

export default function FilingPage() {
  useRightPanel(
    <Panel title="Post-Filing Deadlines" accent="#eb143f" count={2}>
      <QueueList items={[
        { id: "f1", title: "Notify owner of filing", sub: "5 business days after recording" },
        { id: "f2", title: "Suit to foreclose", sub: "1-year enforcement window" },
      ]} />
    </Panel>,
    [],
  );

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: alpha("#eb143f", 0.07), border: `1px solid ${alpha("#eb143f", 0.28)}` }}>
        <AlertTriangle className="h-[18px] w-[18px] shrink-0 text-[#eb143f]" />
        <div className="text-[13px]" style={{ color: "var(--text-base)" }}>
          Compliance check: <span className="font-semibold text-[#eb143f]">1 monthly notice was sent late</span> — review before generating the affidavit.
        </div>
      </div>
      {STEPS.map((f) => (
        <div key={f.n} className="flex gap-3.5 rounded-lg border p-[18px]" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[13px] font-bold"
            style={{ color: f.color, background: alpha(f.color, 0.14) }}
          >
            {f.n}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold" style={{ color: "var(--text-base)" }}>{f.title}</div>
            <div className="mt-0.5 text-[12px] leading-snug" style={{ color: "var(--text-dim)" }}>{f.body}</div>
          </div>
          <span
            className="self-center whitespace-nowrap rounded-sm px-2 py-0.5 text-[10.5px] font-bold"
            style={{ color: f.color, background: alpha(f.color, 0.14) }}
          >
            {f.st}
          </span>
        </div>
      ))}
    </>
  );
}
