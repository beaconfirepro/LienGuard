import { Request, Response, NextFunction } from "express";

/**
 * requireServiceKey — authenticates Helm Core (or any machine caller)
 * using the SERVICE_KEY header.
 *
 * Usage:  router.get("/external/holds", requireServiceKey, handler)
 *
 * Phase 0: Falls back to a dev-mode bypass when SERVICE_KEY is unset so
 * the stub endpoints are reachable from a browser / curl without a key.
 * Set SERVICE_KEY in Replit Secrets before exposing to production.
 */
export function requireServiceKey(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.SERVICE_KEY;

  if (!expected) {
    if (process.env.NODE_ENV !== "production") {
      return next();
    }
    res.status(503).json({ error: "SERVICE_KEY not configured" });
    return;
  }

  const provided = req.headers["x-service-key"] as string | undefined;
  if (!provided || provided !== expected) {
    res.status(401).json({ error: "Invalid service key" });
    return;
  }

  next();
}
