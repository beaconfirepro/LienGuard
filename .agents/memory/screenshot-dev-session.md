---
name: Authenticated screenshots (Replit Auth, no dev priming)
description: Why data-filled screenshots of the Lien & Collections app can no longer be primed; what the auth setup is.
---

The Lien & Collections web app now uses real Replit Auth (OIDC/PKCE). The old dev-only `GET /api/dev/session` route and `lc_session` stub cookie were removed.

**Screenshot limitation:** there is NO way to prime an authenticated session in the screenshot browser anymore — real OIDC login can't be completed headlessly. `app_preview` screenshots of the web app will always show the **login gate** (a centered "Log in" card in `AppShell.tsx`), not data pages. To verify authenticated/data UI, test via the API directly (curl against the server port 8080) or rely on a real browser login.

**Auth contract (verified):** `GET /api/auth/user` → `{"user":null}` when logged out; protected `/api/*` routes → 401; `GET /api/login` → 302 to `replit.com/oidc/auth`. M2M `/api/external/*` routes are unaffected.

**Roles:** app-managed roles (admin/pm/finance/coordinator) live in `users.role` (nullable) in DB, loaded onto `req.user`. Set roles directly in the DB — there is no role-management UI. Login upsert must never overwrite an existing role.

**Single-tenant orgId:** Replit Auth has no org concept; `lib/session.ts` `getSession()` shim returns a fixed default orgId (`org_beacon_test_001`) so the ~60 existing `getSession` callsites keep working unchanged.
