import { alpha } from "@/lib/utils";

/**
 * QueueList (C-06) — right-panel action queue (send / approve / countdown).
 * `items`: [{ id, title, sub, badge?, action?, actionTone? }]
 */
export default function QueueList({ items = [], onAction }) {
  if (!items.length) {
    return <div className="px-3 py-6 text-center text-xs italic text-text-muted">Queue is clear.</div>;
  }
  return (
    <div className="flex flex-col gap-2.5 p-3">
      {items.map((q) => (
        <div key={q.id} className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-[12.5px] font-semibold leading-tight text-text">{q.title}</div>
            {q.badge && <span className="shrink-0 font-mono text-[10.5px] text-text-muted">{q.badge}</span>}
          </div>
          <div className="mt-1 text-[11px] text-text-muted">{q.sub}</div>
          {q.action && (
            <button
              onClick={() => onAction?.(q)}
              className="mt-2 w-full rounded-md border px-2 py-1.5 text-[11.5px] font-semibold"
              style={{
                color: q.actionTone || "#f59e0b",
                background: alpha(q.actionTone || "#f59e0b", 0.14),
                borderColor: alpha(q.actionTone || "#f59e0b", 0.3),
              }}
            >
              {q.action}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
