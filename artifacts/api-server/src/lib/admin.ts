import { Request, Response, NextFunction } from "express";
import { getSession } from "./session";

// Comma-separated list of user IDs with admin privileges.
// In production, ADMIN_USER_IDS MUST be set — if missing, the set is empty and
// every write is denied (fail-closed).  In development the default "user_dev_001"
// is used so local sessions work without extra setup.
const isProduction = process.env.NODE_ENV === "production";
const rawAdminIds = process.env.ADMIN_USER_IDS;
const ADMIN_USER_IDS = new Set<string>(
  (rawAdminIds ?? (isProduction ? "" : "user_dev_001"))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

/**
 * requireAdmin — enforces that the authenticated user is an admin.
 * Must be used AFTER requireSession (which is applied globally on the config router).
 * Returns 403 when the userId is not in the ADMIN_USER_IDS allowlist.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const session = getSession(req);
  if (session.userId && ADMIN_USER_IDS.has(session.userId)) {
    return next();
  }
  res.status(403).json({ error: "Admin access required — this action is restricted to administrators" });
}
