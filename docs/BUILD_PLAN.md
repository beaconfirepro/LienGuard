# Helm Build Plan (greenfield)

**Status: DRAFT for review.** This is the whole-task plan for building **Helm** (the platform
product; internally **Tower** is the foundation layer, with separable **modules**, first
`lien-collections`). It is greenfield: the old LienGuard app is a requirements reference only, not
code to port. Canon: `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` (through ED-16), and the handoff
brief/kickoff. Naming and stack are locked there; do not relitigate here.

## How to use this plan

- Each **Epic (E#)** is meant to become one tracked GitHub issue (an epic). Its **Stories** are the
  child issues. Build in dependency order; some epics run in parallel (see the map).
- **Owner**: `build` = the greenfield build session; `deploy` = the separate Nx/CI/deploy session.
- **Gate**: a credential or decision that must be in place before the epic can complete.
- **DoD** = definition of done (the merge/close condition).
- Legend: ⬜ not started, 🔄 in progress, ✅ done, ⛔ blocked.

## Locked context (from canon)

- Monorepo: pnpm workspaces with **Nx** (adopted now) for task orchestration, caching, affected
  runs, and module-boundary linting.
- Data: **Supabase Postgres** (project `tower`, org `Helm`) with **RLS**; ORM **Prisma**.
- Auth + tenancy: **Clerk**, Organizations as the tenant, `Clerk org id == orgId`, verified
  end-to-end, integrated to Supabase via Third-Party Auth so RLS reads Clerk claims.
- API: **OpenAPI-first** to Orval (generated Zod + TanStack Query).
- UI: **one design system** in **Storybook 8**, single-source tokens, no hardcoded colors;
  two-level nav (Tower vertical, module horizontal).
- Table naming separates Tower tables from module tables (e.g. schema per layer/module).

---

## Epics

### E0 — Workspace scaffold and Nx foundation  ⬜  (owner: build)
**Goal:** a clean, green, empty monorepo everything else builds on.
Stories:
- E0.1 pnpm workspaces + Nx init; `nx.json`, base `tsconfig`, lint, formatting.
- E0.2 Folder structure: `packages/`, `modules/`, `apps/`; placeholder packages.
- E0.3 Copy canon into the repo (`USER_INSTRUCTIONS`, `ARCHITECTURE`, `DECISIONS`, this plan); root `CLAUDE.md` pointer.
- E0.4 `create-tower-module` generator stub (filled in E6).
**DoD:** `nx run-many -t typecheck` green on an empty workspace; canon present; pushed.
**Depends on:** none.

### E1 — CI/CD and deploy pipeline  ⬜  (owner: deploy)  **Gate: deploy target decision**
**Goal:** affected-only CI and a deploy path to chosen hosting (preview + prod).
Stories:
- E1.1 CI: install, typecheck, lint, test, build via `nx affected`.
- E1.2 Branch protection + required checks on the build repo.
- E1.3 Deploy target wiring (Vercel / Fly / other, TBD) for preview and prod.
- E1.4 Env/secret handling pattern (scoped, rotatable; not in plaintext setup scripts).
**DoD:** PRs gated by green CI; a trivial app deploys to a preview URL.
**Depends on:** E0.

### E2 — Design system package (Storybook)  ⬜  (owner: build)  **Gate: Chromatic token (E2.4)**
**Goal:** the single look and the two-level nav shells.
Stories:
- E2.1 Token source of truth; Tailwind wired to tokens (no hardcoded colors).
- E2.2 Base components (Radix/shadcn-style) in `packages/design`.
- E2.3 Tower vertical-nav shell + module horizontal-nav shell (data-driven).
- E2.4 Storybook 8 hosting; Chromatic visual-regression in CI.
**DoD:** components and nav shells render in Storybook; tokens-only lint passes.
**Depends on:** E0.

### E3 — Tower foundation: auth and tenancy (Clerk)  ⬜  (owner: build)  **Gate: Clerk keys**
**Goal:** identity, org-as-tenant, gated app shell.
Stories:
- E3.1 Clerk integration (frontend + backend), Organizations as tenant.
- E3.2 Backend verifies Clerk token end-to-end; `orgId` only from the Clerk org claim.
- E3.3 App shell with Tower vertical nav + per-tenant module gating; route guards.
**DoD:** sign in, org context resolves, gated nav works, no `orgId` from request input.
**Depends on:** E0, E2 (shell).

### E4 — Tower foundation: data layer (Prisma + Supabase + RLS)  ⬜  (owner: build)  **Gate: Supabase `tower` creds + Clerk Third-Party Auth configured**
**Goal:** the shared multi-tenant database with enforced isolation.
Stories:
- E4.1 Prisma setup; Tower-namespaced schema + table-naming convention.
- E4.2 Migration pipeline against the `tower` project; generated types.
- E4.3 RLS policies keyed to the Clerk org claim via Third-Party Auth.
- E4.4 Tenant-isolation tests (cross-org access denied).
**DoD:** migrations run against `tower`; RLS proven to isolate tenants; types generated.
**Depends on:** E3 (claims), E0.

### E5 — API contract and transport (OpenAPI + Orval)  ⬜  (owner: build)
**Goal:** generated, type-safe clients from one contract.
Stories:
- E5.1 `openapi.yaml` as source of truth; Orval config.
- E5.2 Generated Zod + TanStack Query hooks; hand-written fetch transport + error handling.
- E5.3 One reference endpoint round-trips through the generated client.
**DoD:** codegen runs in CI; sample endpoint works end-to-end.
**Depends on:** E0.

### E6 — Module contract and generator  ⬜  (owner: build)
**Goal:** modules are portable and agent-buildable by construction.
Stories:
- E6.1 `module.config.ts` spec: nav manifest (vertical entry + horizontal sections), declared ports, gating key.
- E6.2 `packages/tower-stub` so a module runs standalone.
- E6.3 Finish `create-tower-module` generator; Nx module-boundary lint (no module imports another).
**DoD:** a generated stub module runs standalone on `tower-stub` and mounts in the Helm shell.
**Depends on:** E2, E3, E4, E5.

### E7 — lien-collections: data model and engines  ⬜  (owner: build)  **(rebuild from spec, not ported)**
**Goal:** the lien/collections domain, fresh, with pure engines and tests.
Stories:
- E7.1 Module schema: jurisdictions, rule sets, rules, projects, schedule-of-values, deadlines, holds, collections, waivers, filings.
- E7.2 Pure engines rebuilt: deadline (business-day/holiday roll-forward), risk scoring, hold computation, legal-review gate.
- E7.3 Declared ports for QBO (invoices), CRM (projects/parties), Connecteam (timesheets).
**DoD:** schema migrates into the module's schema; engines covered by fast unit tests; ports defined.
**Depends on:** E4, E6.

### E8 — lien-collections: workflows and screens  ⬜  (owner: build)
**Goal:** the end-to-end lien and collections experience.
Stories:
- E8.1 Screens: Dashboard, Monthly Lien Report / Send Queue, Projects + Project Lien Detail, Notice Editor.
- E8.2 Waiver Workspace (approval + notarization gates), Filing Workspace, document/PDF generation.
- E8.3 Collections Pipeline, Account Detail, Vendor Holds, Settings; roles and permissions.
**DoD:** a project moves through deadlines, notices, waiver, filing, and the collections ladder.
**Depends on:** E7, E2, E5.

### E9 — Helm product shell  ⬜  (owner: build)
**Goal:** the shippable Helm app wiring Tower plus the module.
Stories:
- E9.1 `apps/helm` wires Tower foundation + `lien-collections`, brand, routing, gating.
- E9.2 Deployable build; smoke path through sign-in to the module.
**DoD:** Helm runs with the module enabled and deploys via the E1 pipeline.
**Depends on:** E3, E6, E8 (at least E7 for a thin slice).

### E10 — Integrations (ports to adapters)  ⬜  (owner: build)
**Goal:** real external systems behind the declared ports.
Stories:
- E10.1 QBO (invoices), CRM/HubSpot (projects/parties), Connecteam (timesheets).
- E10.2 Certified mail, notarization, county filing handoff.
- E10.3 Fixture/no-op adapters when keys are absent.
**DoD:** adapters implement the ports; module works with fixtures and with live keys.
**Depends on:** E7.

### E11 — Legal and compliance gates  ⬜  (owner: build)
**Goal:** statutory safety enforced.
Stories:
- E11.1 `legalReviewed` gate: no send or file on an unreviewed rule set (enforced in prod).
- E11.2 Texas rule set seeded; counsel-review workflow.
**DoD:** gate enforced; rule set ships locked until reviewed.
**Depends on:** E7.

### E12 — Observability and audit  ⬜  (owner: build)
**Goal:** errors, logs, and an audit trail.
Stories:
- E12.1 Error tracking (Sentry; revisit per ED-15 once the foundation lands).
- E12.2 Structured logging; activity/audit log.
**DoD:** errors are captured; audit log records key actions.
**Depends on:** E3, E4.

### E13 — Hardening and launch  ⬜  (owner: build + deploy)
**Goal:** production readiness.
Stories:
- E13.1 Security review; RLS audit; least-privilege DB roles.
- E13.2 Performance pass; UAT.
- E13.3 Rotate all credentials before production; go-live checklist.
**DoD:** launch checklist passed; production deploy.
**Depends on:** all prior.

---

## Sequencing map

- **First:** E0 (blocks everything).
- **Parallel after E0:** E1 (deploy), E2 (design), E5 (contracts).
- **Tower foundation:** E3 then/with E4 (RLS reads Clerk claims).
- **Then:** E6 (module contract) once E2/E3/E4/E5 exist.
- **Module:** E7 then E8; Helm shell E9 once E6 + a module slice exist.
- **Cross-cutting:** E10, E11 attach to E7; E12 after foundation; E13 last.

## Open decisions feeding this plan

- **Deploy target** for E1 (Vercel / Fly / other; preview + prod). Owner: Deb.
- **Lien module public brand** (ED-16): "LiensEasy" or folded into Helm. Affects E8/E9 labels only.
- **Legacy "Beacon" prose** (ED-16): rebrand or leave. Docs hygiene, not a build blocker.
- Credential gates: Clerk (E3), Supabase `tower` + Third-Party Auth (E4), Chromatic (E2).
