import { Request, Response, NextFunction } from "express";

export interface SessionData {
  orgId: string;
  userId?: string;
}

declare global {
  namespace Express {
    interface Request {
      sessionData?: SessionData;
    }
  }
}

/**
 * requireSession — checks that a valid session with orgId is present.
 *
 * Phase 0 dev bypass: if no session cookie is found in development, we auto-
 * inject the test org so the app is usable without a full SSO round-trip.
 * Set NODE_ENV=production to enforce real sessions.
 *
 * When Helm SSO is wired in a later phase, replace the dev-bypass logic with
 * real token validation while keeping the same `getSession(req).orgId` API.
 */
export function requireSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const session = req.sessionData;

  if (session?.orgId) {
    return next();
  }

  if (process.env.NODE_ENV !== "production") {
    const devOrg =
      (req.headers["x-dev-org-id"] as string | undefined) ??
      process.env.DEV_ORG_ID ??
      "org_beacon_test_001";
    req.sessionData = { orgId: devOrg };
    return next();
  }

  res.status(401).json({ error: "No session" });
}

/** Typed accessor — use instead of `req.sessionData!` at call sites. */
export function getSession(req: Request): SessionData {
  if (!req.sessionData?.orgId) {
    throw new Error("requireSession must run before getSession");
  }
  return req.sessionData;
}

/**
 * parseSession — reads the lightweight base64-JSON cookie set by app.ts
 * and attaches the payload to req.sessionData for requireSession to read.
 */
export function parseSession(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const raw = (req as any).cookies?.["lc_session"];
  if (raw) {
    try {
      const parsed = JSON.parse(
        Buffer.from(raw, "base64").toString("utf-8"),
      ) as SessionData;
      req.sessionData = parsed;
    } catch {
      /* ignore malformed cookie */
    }
  }
  next();
}
