import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { alpha } from "@/lib/utils";

const TABS = [
  { key: "reference", label: "Reference Tree" },
  { key: "triggers", label: "Stage Triggers" },
  { key: "rules", label: "Jurisdiction Rules" },
  { key: "dunning", label: "Dunning" },
];

const DATA = {
  reference: [
    ["Sprinkler › Wet Pipe › ESFR", "lien_workflow_type = Monthly Notice (§ 53.056)", "mapped"],
    ["Sprinkler › Dry Pipe › Standard", "lien_workflow_type = Monthly Notice (§ 53.056)", "mapped"],
    ["Fire Alarm › Addressable", "lien_workflow_type = Monthly Notice (§ 53.056)", "mapped"],
    ["Special Hazard › Clean Agent", "No lien_workflow_type — save blocked (L05)", "unmapped"],
  ],
  triggers: [
    ["HubSpot: Contract Signed", "→ LienClockTrigger: start monthly clock", "active"],
    ["HubSpot: First Work Logged", "→ confirm furnishing date", "active"],
    ["HubSpot: Final Invoice", "→ arm final-waiver gate", "active"],
  ],
  rules: [
    ["§ 53.056 Monthly Notice", "Sub must notify owner + GC by the 15th of the 3rd month after work", "reviewed"],
    ["§ 53.052 Lien Affidavit", "File by the 15th of the 4th month (commercial)", "reviewed"],
    ["§ 53.057 Specially Fabricated", "Notice for specially fabricated materials", "unreviewed"],
  ],
  dunning: [
    ["Step 1 — Day 1", "Friendly reminder email", "active"],
    ["Step 2 — Day 15", "Past-due statement + phone call", "active"],
    ["Step 3 — Day 30", "Final demand letter", "active"],
    ["Step 4 — Day 45", "Escalate to pre-lien / agency", "active"],
  ],
};

const TAG = {
  mapped: ["Mapped", "#14eba3"],
  unmapped: ["Blocked", "#eb143f"],
  active: ["Active", "#6366f1"],
  reviewed: ["Legal-reviewed", "#14eba3"],
  unreviewed: ["Needs review", "#f59f0a"],
};

/** Tenant Config (P10) — reference tree, triggers, rules, dunning. */
export default function TenantConfig() {
  const [tab, setTab] = useState("reference");
  return (
    <>
      <div className="flex w-max max-w-full flex-wrap gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className="rounded-md px-3.5 py-1.5 text-[12.5px] font-semibold" style={tab === t.key ? { background: "var(--accent)", color: "#1a1205" } : { color: "var(--text-dim)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rules" && (
        <div className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: alpha("#f59f0a", 0.08), border: `1px solid ${alpha("#f59f0a", 0.3)}` }}>
          <AlertTriangle className="h-[17px] w-[17px] shrink-0 text-warning" />
          <div className="text-[12.5px] text-text">This jurisdiction rule set has not been <span className="font-semibold text-warning">legal-reviewed</span> for the current statutory year.</div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {DATA[tab].map(([k, v, tag], i) => {
          const [label, color] = TAG[tag];
          return (
            <div key={i} className="flex items-center gap-3.5 border-b border-border px-[18px] py-3.5 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-text">{k}</div>
                <div className="mt-0.5 text-[11.5px] leading-snug text-text-dim">{v}</div>
              </div>
              <span className="whitespace-nowrap rounded-sm px-2 py-0.5 text-[10.5px] font-bold" style={{ color, background: alpha(color, 0.14) }}>{label}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
