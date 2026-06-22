import { Clock, AlertTriangle, CheckCircle2, Activity, Lock, Send, Pencil } from "lucide-react";
import { alpha } from "@/lib/utils";

/**
 * StatusBadge (C-01) — enum state as colour + icon + label (DD-UI-5).
 * Severity is never colour alone.
 */
const META = {
  "at-risk": { label: "At Risk", color: "#f59f0a", Icon: Clock },
  overdue: { label: "Overdue", color: "#eb143f", Icon: AlertTriangle },
  lapsed: { label: "Rights Lapsed", color: "#eb143f", Icon: AlertTriangle },
  cleared: { label: "Cleared", color: "#14eba3", Icon: CheckCircle2 },
  paid: { label: "Paid", color: "#14eba3", Icon: CheckCircle2 },
  active: { label: "Active", color: "#6366f1", Icon: Activity },
  draft: { label: "Draft", color: "#8b90a0", Icon: Pencil },
  approved: { label: "Approved", color: "#14eba3", Icon: CheckCircle2 },
  sent: { label: "Sent", color: "#6366f1", Icon: Send },
  delivered: { label: "Delivered", color: "#14eba3", Icon: CheckCircle2 },
  pending: { label: "Pending", color: "#f59f0a", Icon: Clock },
  blocked: { label: "Blocked", color: "#eb143f", Icon: Lock },
};

export default function StatusBadge({ status }) {
  const m = META[status] || { label: status || "—", color: "#8b90a0", Icon: Activity };
  const { Icon } = m;
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-0.5 text-[10.5px] font-bold tracking-wide"
      style={{ color: m.color, background: alpha(m.color, 0.14) }}
    >
      <Icon className="h-3 w-3" strokeWidth={2.4} />
      {m.label}
    </span>
  );
}
