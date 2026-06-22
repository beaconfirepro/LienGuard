import { useState } from "react";
import { Pencil, Check, Send } from "lucide-react";
import { money } from "@/lib/utils";
import StatusBadge from "../components/StatusBadge";
import QueueList from "../components/QueueList";
import { useRightPanel } from "../layout/AppShell";
import { Panel } from "./Dashboard";

/** Ready-to-Send Queue (P3) — review § 53.056 notice, approve, send. */
export default function SendQueue() {
  const [status, setStatus] = useState("draft");

  useRightPanel(
    <Panel title="Send Queue" count={4}>
      <QueueList items={[
        { id: "q1", title: "Harbor Logistics — May", sub: status[0].toUpperCase() + status.slice(1) },
        { id: "q2", title: "Northgate — June", sub: "Approved" },
        { id: "q3", title: "Lincoln — bond claim", sub: "Draft" },
        { id: "q4", title: "Riverside — May", sub: "Delivered" },
      ]} />
    </Panel>,
    [status]
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="text-[14.5px] font-semibold text-text">Notice preview</div>
          <div className="mt-0.5 text-[12px] text-text-dim">Harbor Logistics — Bay 3 · Monthly Notice § 53.056</div>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="flex flex-col gap-3.5 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Claim amount" value="$33,250.00" mono />
          <Field label="Month listed" value="May 2026" />
        </div>
        <Field label="Recipients" value="Harbor Logistics LLC · Turnbull Construction" dim />
        <div className="rounded-lg border border-border p-[18px] font-mono text-[11.5px] leading-relaxed text-text-dim" style={{ background: "#0f1117" }}>
          <div className="mb-2.5 text-[10px] uppercase tracking-wide text-text-muted">Tex. Prop. Code § 53.056 — Notice to Owner &amp; Original Contractor</div>
          This notice is to advise you that <span className="text-text">Beacon Fire Protection</span> has furnished labor and materials for fire-protection work at <span className="text-text">Harbor Logistics — Bay 3</span>. The unpaid balance for work performed in <span className="text-text">May 2026</span> is <span className="text-text">{money(33250)}</span>. If this balance is not paid, the property may be subject to a mechanic's lien.
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center gap-1.5 rounded-md border border-border bg-surface-3 px-3.5 py-2 text-[13px] font-semibold text-text"><Pencil className="h-3.5 w-3.5" />Edit notice</button>
          <button onClick={() => setStatus("approved")} className="flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-[13px] font-semibold text-success" style={{ background: "rgba(20,235,163,.14)", borderColor: "rgba(20,235,163,.3)" }}><Check className="h-3.5 w-3.5" />Approve</button>
          <button onClick={() => setStatus("sent")} className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-[#1a1205]"><Send className="h-3.5 w-3.5" />Send certified</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono, dim }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`rounded-md border border-border bg-surface-2 px-3 py-2.5 text-[13px] ${mono ? "font-mono" : ""} ${dim ? "text-text-dim" : "text-text"}`}>{value}</div>
    </div>
  );
}
