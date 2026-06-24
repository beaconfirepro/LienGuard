import { useState } from "react";
import { Lock, Unlock, Plus, AlertTriangle, X } from "lucide-react";
import { VENDOR_BILLS } from "../data/mock";
import { money, alpha } from "@/lib/utils";
import StatusBadge from "../components/StatusBadge";
import QueueList from "../components/QueueList";
import { useRightPanel } from "../layout/AppShell";
import { Panel } from "./Dashboard";

const billStatus = { open: "active", hold: "pending", paid: "paid", released: "cleared" };

/**
 * Vendor Holds — open A/P bills; hold payment when the linked client (A/R)
 * hasn't paid. Filter by status or by vendor. Recommended-to-hold rail.
 */
export default function VendorHolds() {
  const [bills, setBills] = useState(VENDOR_BILLS);
  const [filter, setFilter] = useState("all");
  const [vendor, setVendor] = useState(null);

  const toggleHold = (id) =>
    setBills((bs) => bs.map((b) => (b.id === id ? { ...b, status: b.status === "hold" ? "open" : "hold" } : b)));

  let shown = bills;
  if (filter === "recommended") shown = shown.filter((b) => b.status === "open" && b.clientOverdue);
  else if (filter === "open") shown = shown.filter((b) => b.status === "open");
  else if (filter === "hold") shown = shown.filter((b) => b.status === "hold");
  if (vendor) shown = shown.filter((b) => b.vendor === vendor);

  const openSum = bills.filter((b) => b.status === "open").reduce((x, b) => x + b.amount, 0);
  const holdSum = bills.filter((b) => b.status === "hold").reduce((x, b) => x + b.amount, 0);
  const recCount = bills.filter((b) => b.status === "open" && b.clientOverdue).length;

  // Right rail: unpaid by vendor (click filters the bill list).
  const vendMap = {};
  bills.filter((b) => b.status === "open" || b.status === "hold").forEach((b) => {
    (vendMap[b.vendor] = vendMap[b.vendor] || { vendor: b.vendor, count: 0, total: 0 }).count++;
    vendMap[b.vendor].total += b.amount;
  });
  const vendors = Object.values(vendMap).sort((a, b) => b.total - a.total);

  useRightPanel(
    <Panel title="Unpaid by vendor" accent="#f59f0a" count={vendors.length}>
      <div className="flex flex-col gap-2 p-3">
        {vendors.map((v) => (
          <button key={v.vendor} onClick={() => setVendor((cur) => (cur === v.vendor ? null : v.vendor))} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left" style={vendor === v.vendor ? { background: alpha("#f59f0a", 0.12), borderColor: alpha("#f59f0a", 0.4) } : { background: "var(--surface-2)", borderColor: "var(--border)" }}>
            <div className="min-w-0"><div className="truncate text-[12.5px] font-semibold text-text">{v.vendor}</div><div className="text-[11px] text-text-muted">{v.count} open bills</div></div>
            <span className="shrink-0 font-mono text-[12.5px] font-semibold text-error">{money(v.total)}</span>
          </button>
        ))}
        <div className="mt-1 text-[10.5px] leading-relaxed text-text-muted">Tap a vendor to filter the bills.</div>
      </div>
    </Panel>,
    [vendor, vendors.length]
  );

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Open A/P" value={money(openSum)} sub="unpaid vendor bills" color="#6366f1" />
        <Kpi label="On Hold" value={money(holdSum)} sub="payment withheld" color="#f59f0a" />
        <Kpi label="Recommended" value={recCount} sub="client overdue — hold advised" color="#eb143f" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-3">
          <div className="text-[13.5px] font-semibold text-text">Open vendor bills</div>
          <div className="flex items-center gap-2">
            {vendor && (
              <button onClick={() => setVendor(null)} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-semibold" style={{ color: "#f59f0a", background: alpha("#f59f0a", 0.14), borderColor: alpha("#f59f0a", 0.4) }}>
                {vendor}<X className="h-3 w-3" />
              </button>
            )}
            <div className="flex gap-0.5 rounded-md border border-border p-0.5">
              {["all", "recommended", "open", "hold"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`rounded px-2.5 py-1 text-[12px] font-semibold capitalize ${filter === f ? "bg-surface-3 text-text" : "text-text-dim"}`}>{f === "all" ? "All bills" : f}</button>
              ))}
            </div>
          </div>
        </div>
        {shown.map((b) => {
          const rec = b.status === "open" && b.clientOverdue;
          const held = b.status === "hold";
          return (
            <div key={b.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0" style={{ borderLeft: `3px solid ${rec ? "#eb143f" : "transparent"}` }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-semibold text-text">{b.vendor}</span>
                  {rec && <span className="shrink-0 rounded-sm px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-error" style={{ background: alpha("#eb143f", 0.14) }}>HOLD ADVISED</span>}
                </div>
                <div className="truncate text-[11.5px] text-text-muted">{b.item} · {b.project} · due {b.due}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[11px] font-semibold" style={{ color: b.clientOverdue ? "#eb143f" : "#14eba3" }}>{b.clientLabel}</div>
                <StatusBadge status={billStatus[b.status]} />
              </div>
              <span className="w-20 shrink-0 text-right font-mono text-[13.5px] font-semibold text-text">{money(b.amount)}</span>
              {b.status === "paid" ? (
                <span className="w-[104px] shrink-0 text-center text-[12px] font-semibold text-text-muted">Paid</span>
              ) : (
                <button onClick={() => toggleHold(b.id)} className="flex w-[104px] shrink-0 items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-semibold" style={held ? { color: "#14eba3", background: alpha("#14eba3", 0.14), borderColor: alpha("#14eba3", 0.3) } : { color: "#f59f0a", background: alpha("#f59f0a", 0.14), borderColor: alpha("#f59f0a", 0.35) }}>
                  {held ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {held ? "Release" : "Place hold"}
                </button>
              )}
            </div>
          );
        })}
        {shown.length === 0 && <div className="px-4 py-6 text-center text-xs text-text-muted">No vendor bills match this filter.</div>}
      </div>
    </>
  );
}

function Kpi({ label, value, sub, color }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface px-4 pb-3.5 pt-4">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color }} />
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1.5 font-mono text-[24px] font-bold leading-none" style={{ color }}>{value}</div>
      <div className="mt-1 text-[11.5px] text-text-dim">{sub}</div>
    </div>
  );
}
