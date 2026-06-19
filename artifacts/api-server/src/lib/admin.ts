import { Request, Response, NextFunction } from "express";
import { getSession } from "./session";

// Comma-separated list of user IDs with admin privileges.
// In production, set ADMIN_USER_IDS env var to a secure list.
// Default permits the dev test user so local development works without extra setup.
const ADMIN_USER_IDS = new Set<string>(
  (process.env.ADMIN_USER_IDS ?? "user_dev_001")
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
