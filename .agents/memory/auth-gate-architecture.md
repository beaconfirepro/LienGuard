---
name: Auth gate architecture (Replit Auth)
description: How the web login gate is wired and the cleanest way to bypass/short-circuit it.
---

The web app's login gate is driven entirely by the server. The frontend `useAuth` hook (lib/replit-auth-web) sets `isAuthenticated: !!user` from a single fetch to `GET /api/auth/user`; AppShell shows a LoginScreen whenever that is null. There is no client-side token check.

**Consequence (the key lesson):** anything that makes `GET /api/auth/user` return a non-null user makes BOTH the frontend gate pass AND every backend guard pass — no frontend or shared-package changes needed. On the server, `requireSession` / `getSession` / `requireAdmin` all derive from `req.user` (set by `authMiddleware`), and `req.isAuthenticated()` is just `this.user != null`.

**Dev login bypass:** `authMiddleware` injects a synthetic admin `req.user` when `AUTH_BYPASS === "1"` AND `NODE_ENV !== "production"` AND `!REPLIT_DEPLOYMENT` (triple-guarded). The flag is set as a **development-scoped** env var so it can never reach prod; it also logs a loud `console.warn` at startup when active.

**Why:** real Replit Auth is OIDC/PKCE and can't be primed in the screenshot browser or quick curl tests, so a server-side bypass is the only way to exercise authed pages locally.

**How to remove/restore real login:** delete the `AUTH_BYPASS`/`BYPASS_USER` block in `artifacts/api-server/src/middlewares/authMiddleware.ts` and delete the development `AUTH_BYPASS` env var.

**FK safety:** no table references `usersTable` (only sessions), so the synthetic user id (`dev-bypass-user`) never needs to exist in the DB to satisfy foreign keys.
