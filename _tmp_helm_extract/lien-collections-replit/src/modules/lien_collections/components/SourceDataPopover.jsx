import { useState } from "react";
import { Info } from "lucide-react";

/**
 * SourceDataPopover (C-03) — reveals the `sourceData` snapshot behind a
 * computed deadline (L13). Click the info icon to inspect the inputs.
 */
export default function SourceDataPopover({ data = {} }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button onClick={() => setOpen((v) => !v)} className="text-text-muted hover:text-text" title="Show source data">
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-5 z-20 w-56 rounded-lg border border-border bg-surface p-3 shadow-lg shadow-black/30">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Computed from</div>
          <div className="flex flex-col gap-1.5">
            {Object.entries(data).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-[11.5px]">
                <span className="text-text-dim">{k}</span>
                <span className="font-mono text-text">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
