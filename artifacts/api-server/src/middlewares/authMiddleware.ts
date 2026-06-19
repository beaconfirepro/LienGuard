import * as oidc from "openid-client";
import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import type { UserRole } from "@workspace/db";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  updateSession,
  type SessionData,
} from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {
      role: UserRole | null;
    }

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

// ── TEMPORARY LOGIN BYPASS ───────────────────────────────────────────────
// When AUTH_BYPASS=1 every request is treated as an authenticated admin so we
// can use the app without going through the real Replit Auth / OIDC flow during
// development. This is a full authorization bypass, so it is triple-guarded:
//   1. opt-in via AUTH_BYPASS=1 (set development-scoped only),
//   2. refuses to activate when NODE_ENV === "production",
//   3. refuses to activate inside a Replit deployment (REPLIT_DEPLOYMENT set).
// Remove this block (and the AUTH_BYPASS env var) to restore normal login.
const AUTH_BYPASS =
  process.env.AUTH_BYPASS === "1" &&
  process.env.NODE_ENV !== "production" &&
  !process.env.REPLIT_DEPLOYMENT;

if (AUTH_BYPASS) {
  // eslint-disable-next-line no-console
  console.warn(
    "⚠️  AUTH_BYPASS is ACTIVE — every request is authenticated as admin. " +
      "This must NEVER run in a deployed/production environment.",
  );
}

const BYPASS_USER: Express.User = {
  id: "dev-bypass-user",
  email: "dev@local.test",
  firstName: "Dev",
  lastName: "Bypass",
  profileImageUrl: null,
  role: "admin",
};

async function refreshIfExpired(
  sid: string,
  session: SessionData,
): Promise<SessionData | null> {
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || now <= session.expires_at) return session;

  if (!session.refresh_token) return null;

  try {
    const config = await getOidcConfig();
    const tokens = await oidc.refreshTokenGrant(
      config,
      session.refresh_token,
    );
    session.access_token = tokens.access_token;
    session.refresh_token = tokens.refresh_token ?? session.refresh_token;
    session.expires_at = tokens.expiresIn()
      ? now + tokens.expiresIn()!
      : session.expires_at;
    await updateSession(sid, session);
    return session;
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  if (AUTH_BYPASS) {
    req.user = BYPASS_USER;
    next();
    return;
  }

  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    next();
    return;
  }

  const refreshed = await refreshIfExpired(sid, session);
  if (!refreshed) {
    await clearSession(res, sid);
    next();
    return;
  }

  req.user = refreshed.user;
  next();
}
