import { alpha } from "@/lib/utils";

/**
 * ActivityTimeline (C-11) — chronological lien / collections history.
 * `items`: [{ text, date, color }]
 */
export default function ActivityTimeline({ items = [] }) {
  return (
    <div className="flex flex-col">
      {items.map((t, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex shrink-0 flex-col items-center">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: t.color, boxShadow: `0 0 0 3px ${alpha(t.color, 0.16)}` }}
            />
            {i < items.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-border" />}
          </div>
          <div className="min-w-0 pb-4">
            <div className="text-[12.5px] leading-snug text-text">{t.text}</div>
            <div className="mt-0.5 font-mono text-[11px] text-text-muted">{t.date}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
