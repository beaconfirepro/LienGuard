/**
 * Dev-only session routes — only registered when NODE_ENV !== "production".
 *
 * These routes let engineers obtain a signed `lc_session` cookie without a
 * live Helm SSO flow.  They must NEVER be mounted in production.
 *
 * Usage:
 *   curl -c cookies.txt http://localhost:8080/dev/session
 *   curl -b cookies.txt http://localhost:8080/api/org
 */
import { Router, type IRouter } from "express";
import type { Response } from "express";

const router: IRouter = Router();

const DEV_ORG = process.env.DEV_ORG_ID ?? "org_beacon_test_001";
const DEV_USER = process.env.DEV_USER_ID ?? "user_dev_001";

const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; /* 8 hours */

function setSessionCookie(res: Response, orgId: string, userId: string) {
  res.cookie(
    "lc_session",
    JSON.stringify({ orgId, userId }),
    {
      signed: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_MS,
    },
  );
}

/** GET /dev/session — issue a signed session cookie for the dev test org. */
router.get("/session", (_req, res) => {
  setSessionCookie(res, DEV_ORG, DEV_USER);
  res.json({
    message: "Dev session cookie set",
    orgId: DEV_ORG,
    userId: DEV_USER,
    expiresIn: "8h",
  });
});

/** DELETE /dev/session — clear the session cookie. */
router.delete("/session", (_req, res) => {
  res.clearCookie("lc_session");
  res.json({ message: "Session cookie cleared" });
});

export default router;
