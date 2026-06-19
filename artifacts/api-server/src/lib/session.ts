import { Request, Response, NextFunction } from "express";

export type UserRole = "admin" | "pm" | "finance" | "coordinator";

export interface SessionData {
  orgId: string;
  userId?: string;
  role?: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      sessionData?: SessionData;
    }
  }
}

/**
 * parseSession — reads the SIGNED `lc_session` cookie (set by the server) and
 * attaches the payload to `req.sessionData` so downstream middleware can read it.
 *
 * The cookie is signed by Express's cookie-parser using SESSION_SECRET, so
 * it cannot be forged without the secret.
 *
 * Phase 0: Helm SSO is stubbed — the only way to obtain a session is via the
 * dev-only `GET /dev/session` endpoint.  Real OIDC token exchange is wired in
 * a later phase but the interface (req.sessionData.orgId) stays the same.
 */
export function parseSession(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const raw = (req as any).signedCookies?.["lc_session"];
  if (raw && typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as SessionData;
      if (parsed?.orgId) {
        req.sessionData = parsed;
      }
    } catch {
      /* ignore malformed cookie payload */
    }
  }
  next();
}

/**
 * requireSession — enforces that a valid, server-signed session exists.
 *
 * Returns 401 JSON when:
 *   - no `lc_session` cookie is present, or
 *   - the cookie signature is invalid (cookie-parser sets the value to `false`
 *     when the HMAC check fails), or
 *   - the cookie payload is missing `orgId`.
 *
 * No automatic org injection occurs.  To bypass in development, call
 * `GET /dev/session` once — it sets the signed cookie for the test org.
 */
export function requireSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.sessionData?.orgId) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized — valid session required" });
}

/** Typed accessor — use after requireSession; throws if session is absent. */
export function getSession(req: Request): SessionData {
  if (!req.sessionData?.orgId) {
    throw new Error("requireSession must run before getSession");
  }
  return req.sessionData;
}
