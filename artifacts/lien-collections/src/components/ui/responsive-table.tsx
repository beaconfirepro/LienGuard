import { useResponsive } from "@/hooks/use-responsive";
import { ChevronUp, ChevronDown } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  gridTemplate?: string;
  onRowClick?: (row: T) => void;
  sortBy?: { key: string; direction: "asc" | "desc" } | null;
  onSort?: (key: string) => void;
  tabletWrapRows?: boolean;
}

export function ResponsiveTable<T>({
  columns,
  rows,
  gridTemplate,
  onRowClick,
  sortBy,
  onSort,
  tabletWrapRows = false,
}: ResponsiveTableProps<T>) {
  const { isMobile, isTablet, width } = useResponsive();
  const useTwoLineRows = tabletWrapRows && !isMobile && (isTablet || width < 1280);

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

  if (useTwoLineRows) {
    const splitIndex = Math.ceil(columns.length / 2);
    const firstColumns = columns.slice(0, splitIndex);
    const secondColumns = columns.slice(splitIndex);
    const firstTemplate = `repeat(${Math.max(1, firstColumns.length)}, minmax(0, 1fr))`;
    const secondTemplate = `repeat(${Math.max(1, secondColumns.length)}, minmax(0, 1fr))`;

    return (
      <div className="overflow-hidden rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
        <div className="border-b px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wide" style={{ background: "var(--surface-2)", borderColor: "var(--helm-border)", color: "var(--text-muted-color)" }}>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: firstTemplate }}>
            {firstColumns.map((c) => (
              <span key={c.key} style={{ textAlign: c.align ?? "left" }}>{c.header}</span>
            ))}
          </div>
          <div className="mt-1.5 grid gap-2.5" style={{ gridTemplateColumns: secondTemplate }}>
            {secondColumns.map((c) => (
              <span key={c.key} style={{ textAlign: c.align ?? "left" }}>{c.header}</span>
            ))}
          </div>
        </div>

        {rows.map((row, ri) => (
          <div
            key={ri}
            onClick={() => onRowClick?.(row)}
            className="cursor-pointer border-b px-4 py-3 last:border-0 transition-colors"
            style={{ borderColor: "var(--helm-border)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <div className="grid items-center gap-2.5" style={{ gridTemplateColumns: firstTemplate }}>
              {firstColumns.map((c) => (
                <div key={c.key} className="min-w-0" style={{ textAlign: c.align ?? "left" }}>
                  {c.render ? c.render(row) : (
                    <span className="text-[13px]" style={{ color: "var(--text-base)" }}>{String((row as Record<string, unknown>)[c.key] ?? "")}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 grid items-center gap-2.5" style={{ gridTemplateColumns: secondTemplate }}>
              {secondColumns.map((c) => (
                <div key={c.key} className="min-w-0" style={{ textAlign: c.align ?? "left" }}>
                  {c.render ? c.render(row) : (
                    <span className="text-[13px]" style={{ color: "var(--text-base)" }}>{String((row as Record<string, unknown>)[c.key] ?? "")}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
      {/* Header Row */}
      <div
        className="grid gap-2.5 border-b px-[18px] py-2.5 text-[10.5px] font-semibold uppercase tracking-wide"
        style={{ gridTemplateColumns: gridTemplate, background: "var(--surface-2)", borderColor: "var(--helm-border)", color: "var(--text-muted-color)" }}
      >
        {columns.map((c) => (
          <button
            key={c.key}
            onClick={() => c.sortable && onSort?.(c.key)}
            className={c.sortable ? "flex items-center gap-1 hover:opacity-80 cursor-pointer justify-start" : ""}
            disabled={!c.sortable}
            title={c.sortable ? "Click to sort" : ""}
            style={{ textAlign: c.align === "right" ? "right" : "left" }}
          >
            <span>{c.header}</span>
            {c.sortable && sortBy?.key === c.key && (
              sortBy.direction === "asc" ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )
            )}
          </button>
        ))}
      </div>
      {/* Data Rows */}
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
