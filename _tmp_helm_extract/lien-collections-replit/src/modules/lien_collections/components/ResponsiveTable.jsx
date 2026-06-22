import { useResponsive } from "../hooks/useResponsive";

/**
 * ResponsiveTable (C-12) — table on tablet/desktop, card list on phone (DD-UI-3).
 * `columns`: [{ key, header, align?, render?, hideOnPhone? }]
 * `rows`: array of row objects; `onRowClick(row)` optional.
 */
export default function ResponsiveTable({ columns, rows, onRowClick, gridTemplate }) {
  const { isPhone } = useResponsive();

  if (isPhone) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {rows.map((row, ri) => (
          <button
            key={ri}
            onClick={() => onRowClick?.(row)}
            className="flex w-full flex-col gap-1.5 border-b border-border px-4 py-3 text-left last:border-0"
          >
            {columns.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-wide text-text-muted">{c.header}</span>
                <span className="min-w-0 text-right text-[13px] text-text">
                  {c.render ? c.render(row) : row[c.key]}
                </span>
              </div>
            ))}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div
        className="grid gap-2.5 border-b border-border bg-surface-2 px-[18px] py-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-text-muted"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {columns.map((c) => (
          <span key={c.key} style={{ textAlign: c.align || "left" }}>
            {c.header}
          </span>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div
          key={ri}
          onClick={() => onRowClick?.(row)}
          className="grid cursor-pointer items-center gap-2.5 border-b border-border px-[18px] py-3 last:border-0 hover:bg-surface-2"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {columns.map((c) => (
            <div key={c.key} style={{ textAlign: c.align || "left" }} className="min-w-0">
              {c.render ? c.render(row) : <span className="text-[13px] text-text">{row[c.key]}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
