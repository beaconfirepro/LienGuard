import { cn } from "@/lib/utils";

/**
 * Screen (C-13) — safe-area + centered max-width wrapper (DD-UI-3).
 */
export default function Screen({ children, className }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1440px]", className)}>{children}</div>
  );
}
