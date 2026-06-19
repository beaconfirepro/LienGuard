import { useResponsive } from "@/hooks/use-responsive";

interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  gridTemplate?: string;
  onRowClick?: (row: T) => void;
}

export function ResponsiveTable<T>({
  columns,
  rows,
  gridTemplate,
  onRowClick,
}: ResponsiveTableProps<T>) {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <div className="overflow-hidden rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
        {rows.map((row, ri) => (
          <button
            key={ri}
            onClick={() => onRowClick?.(row)}
            className="flex w-full flex-col gap-1.5 border-b px-4 py-3 text-left last:border-0 hover:opacity-80"
            style={{ borderColor: "var(--helm-border)" }}
          >
            {columns.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted-color)" }}>{c.header}</span>
                <span className="min-w-0 text-right text-[13px]" style={{ color: "var(--text-base)" }}>
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                </span>
              </div>
            ))}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
      <div
        className="grid gap-2.5 border-b px-[18px] py-2.5 text-[10.5px] font-semibold uppercase tracking-wide"
        style={{ gridTemplateColumns: gridTemplate, background: "var(--surface-2)", borderColor: "var(--helm-border)", color: "var(--text-muted-color)" }}
      >
        {columns.map((c) => (
          <span key={c.key} style={{ textAlign: c.align ?? "left" }}>{c.header}</span>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div
          key={ri}
          onClick={() => onRowClick?.(row)}
          className="grid cursor-pointer items-center gap-2.5 border-b px-[18px] py-3 last:border-0 transition-colors"
          style={{ gridTemplateColumns: gridTemplate, borderColor: "var(--helm-border)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
        >
          {columns.map((c) => (
            <div key={c.key} style={{ textAlign: c.align ?? "left" }} className="min-w-0">
              {c.render ? c.render(row) : (
                <span className="text-[13px]" style={{ color: "var(--text-base)" }}>{String((row as Record<string, unknown>)[c.key] ?? "")}</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
