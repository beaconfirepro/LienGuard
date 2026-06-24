import { money } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * MoneyCell (C-05) — right-aligned monospace currency, flexible width.
 */
export default function MoneyCell({ value, className, color }) {
  return (
    <span className={cn("text-right font-mono text-sm tabular-nums", className)} style={color ? { color } : undefined}>
      {money(value)}
    </span>
  );
}
