import { money } from "@/lib/utils";

/**
 * AgingBuckets (C-10) — AR aging 0-30 / 31-60 / 61-90 / 90+.
 * `variant="bars"` = horizontal rows (dashboard); "columns" = top strip (pipeline).
 */
const LABELS = ["0–30", "31–60", "61–90", "90+"];
const BAR_COLORS = ["#14eba3", "#f59f0a", "#f97316", "#eb143f"];

export default function AgingBuckets({ values = [0, 0, 0, 0], variant = "columns" }) {
  const total = values.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...values);

  if (variant === "bars") {
    return (
      <div className="flex flex-col gap-3">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-14 shrink-0 text-[11.5px] text-text-dim">{LABELS[i]}</div>
            <div className="h-2.5 flex-1 overflow-hidden rounded-md bg-surface-3">
              <div className="h-full rounded-md" style={{ width: `${(v / max) * 100}%`, background: BAR_COLORS[i] }} />
            </div>
            <div className="w-16 shrink-0 text-right font-mono text-xs" style={{ color: BAR_COLORS[i] }}>
              {money(v)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {values.map((v, i) => (
        <div key={i} className="min-w-0 flex-1">
          <div className="mb-1.5 h-2 rounded" style={{ background: BAR_COLORS[i] }} />
          <div className="text-[11px] text-text-muted">{LABELS[i]}</div>
          <div className="mt-0.5 font-mono text-[12.5px] text-text">{money(v)}</div>
        </div>
      ))}
      <span className="sr-only">Total {money(total)}</span>
    </div>
  );
}
