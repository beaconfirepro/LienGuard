import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** cn — merge conditional + Tailwind classes safely. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Currency formatting for MoneyCell (C-05). */
export function money(n) {
  if (n == null || isNaN(n)) return "—";
  return "$" + Math.round(n).toLocaleString();
}

/** rgba helper for dim status backgrounds. */
export function alpha(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Days-ago label for last-contact / activity. */
export function daysAgo(d) {
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return d + " days ago";
}
