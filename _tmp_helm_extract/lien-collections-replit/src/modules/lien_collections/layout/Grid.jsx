import { cn } from "@/lib/utils";

/**
 * Grid (C-13) — 1 col phone, 2 col tablet, `cols` on desktop (DD-UI-3).
 */
export default function Grid({ children, cols = 3, className }) {
  const lg = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }[cols] || "lg:grid-cols-3";
  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", lg, className)}>{children}</div>
  );
}
