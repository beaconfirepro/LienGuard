import { Request, Response, NextFunction } from "express";
import { getSession } from "./session";

/**
 * requireAdmin — enforces that the authenticated user has the `admin` role.
 *
 * Must run AFTER requireSession. The role is the app-managed `users.role`
 * column loaded onto `req.user` by Replit Auth's authMiddleware. Returns 403
 * when the user's role is not `admin`.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (getSession(req).role === "admin") {
    return next();
  }
  res.status(403).json({ error: "Admin access required — this action is restricted to administrators" });
}
