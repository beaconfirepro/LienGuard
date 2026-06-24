# Brief 01 — Beacon Platform, Greenfield Build

**Audience:** a fresh Claude Code session (or agent) that will build the Beacon platform from
scratch in `beaconfirepro/beacon-platform`. **Self-contained** — you should not need the
originating chat. Fuller detail (if reachable) is in `beaconfirepro/lienguard` →
`docs/ARCHITECTURE.md` and `docs/DECISIONS.md`; the old app there is a **requirements
reference only**.

---

## 0. The one rule that overrides everything

**This is a GREENFIELD build. Do NOT port, copy, or refactor the old LienGuard code.** The old
app (`beaconfirepro/lienguard`) and its product spec (`attached_assets/lien_collections_*.md`)
are **references for requirements and domain logic only**. Build the new platform clean.

## 1. The product idea

Beacon ships several apps that share one foundation and combine seamlessly:

- **Tower** — the platform/foundation. Owns **auth, one design system, one multi-tenant
  database, and module gating**. It is **never sold or seen on its own** — always the substrate.
- **Modules** — separable feature units (e.g. **lien-collections**). Each runs **standalone** or
  alongside others, and **cannot import another module**.
- **Products** — thin shells = `Tower + a set of modules + the brand`. **LiensEasy** = Tower +
  the lien-collections module. **Helm** = Tower + its modules.

Buying a second product later just **activates more modules on the same Tower tenant** — no
second app, no second database. Result: **one brand, one front door, zero drift.**

## 2. Locked stack (do not relitigate)

| Concern | Decision |
|---|---|
| Repo | one **pnpm-workspaces monorepo**; task runner deferred (Nx-leaning) until ~8+ packages |
| ORM | **Prisma** |
| Database | **Supabase Postgres**, with **Row-Level Security** for tenant isolation |
| Auth + tenancy | **Clerk**, with Clerk **Organizations** as the tenant layer (`Clerk org id == orgId`); integrated to Supabase via **Third-Party Auth** so RLS reads Clerk claims; **Clerk verified end-to-end** (backend verifies the token) |
| API contract | **OpenAPI-first → Orval → Zod + TanStack Query** (generated clients, never hand-edited) |
| Design system | **one** system in **Storybook 8** (+ Chromatic later for visual-regression); single-source tokens feed Tailwind; **no hardcoded colors** |
| Web | React + Vite + Tailwind + Radix/shadcn-style components |

## 3. Navigation & design

- **One design system, one brand, one front door.** The product you own only changes *which
  modules appear* — never the look.
- **Two-level navigation:** **Tower owns the vertical primary nav** (switch between modules);
  **each module owns its horizontal secondary nav** (sections within it).
- A module renders **content only** — it never draws its own top-level chrome.

## 4. Data ownership

- **External SaaS are the source of truth for their own records** — QBO (invoices), HubSpot or
  Tower's own CRM (projects/clients/parties), Connecteam (timesheets). Reached via adapter-backed
  **ports**.
- **The platform owns only the *extension* data and workflow** the externals don't model (lien
  records, deadlines, holds, collections state, the reference layer).
- `orgId` comes **only** from the Clerk session/org claim — never from a request.

## 5. The module contract (build every module to satisfy this)

1. **Structure** — the standard package shape.
2. **Nav manifest** (`module.config.ts`) — declares its one Tower vertical-nav entry + its
   horizontal sections, as **data**, not JSX.
3. **Data ports** — every external dependency is an interface; the host supplies the adapter.
4. **Auth** — gets user/permissions/`orgId` from Tower; never its own IdP.
5. **Theming** — every visual value from design-system tokens; nothing hardcoded.
6. **Gating** — a gating key to switch it on/off per tenant.
7. **Standalone harness** — runs against a minimal Tower when sold alone.

A `create-beacon-module` generator should scaffold a compliant module so an agent can be
pointed at "one thing" and produce a module that works in any product.

## 6. The first module: lien-collections (requirements only)

Two jobs over one uncleared invoice: **collections** (escalating dunning ladder) and **lien
rights** (Texas Property Code Ch. 53, built multi-state as *data* — `Jurisdiction → RuleSet →
Rule`, read by a generic engine; a `legalReviewed` gate blocks production sends on unreviewed
rule sets). Roles: Tenant Admin, Project Coordinator, AR/Collections Coordinator, PM & Finance
(approvals), Manager. Screens: Dashboard, Monthly Lien Report / Send Queue, Projects + Project
Lien Detail, Notice Editor, Waiver Workspace, Filing Workspace, Collections Pipeline, Account
Detail, Vendor Holds, Settings. **Full requirements:** `beaconfirepro/lienguard` →
`attached_assets/lien_collections_SCOPE.md` (+ DATA_MODEL, SEED_DATA). Domain math worth reusing
as a *spec*: deadline engine (business-day/holiday roll-forward), risk scoring, hold computation.

## 7. Environment & access reality (verify before planning)

- **Build in `beaconfirepro/beacon-platform`.** It must be in the **session's allowed repo
  scope** — a session's scope is fixed at creation, so a repo added to GitHub later is NOT
  reachable until a **new session** includes it. Confirm reachability first (try to read it);
  if denied, stop and tell the user to add it to the environment's repo scope.
- **Credentials:** Clerk (with Organizations) and Supabase are provisioned — their keys/connection
  string must be **wired into the environment** before the auth/DB work. Chromatic is optional
  and deferred to the design-system phase.
- The interim repo `beaconfirepro/helm-itm` was used earlier and reset to empty; ignore it unless
  told otherwise.

## 8. What already exists (decisions, not code)

- Architecture canon: `beaconfirepro/lienguard` → `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`
  (ED-08…ED-13), `docs/MIGRATION_PLAN.md`. **These are decisions; there is no greenfield code yet.**
- A Drizzle→Prisma schema translation of the old data model exists as a *reference artifact* only
  — treat it as a hint to the domain shape, not code to adopt.

## 9. Suggested first steps (confirm the starting point with the user)

Greenfield order, smallest-useful-first:
1. **Scaffold** the clean pnpm monorepo (`packages/`, `modules/`, `apps/`) + tooling + CI.
2. **Design system** package in Storybook (tokens + the two-level nav shells) — the single look.
3. **Tower foundation**: Clerk auth (Orgs = tenant) + Supabase/Prisma + RLS + the app shell.
4. **First module** `lien-collections` built fresh against the module contract + ports.
5. **Product** `lienseasy` shell wiring Tower + the module.

**Do not assume the order — confirm step 1's scope with the user before building.**
Follow the operating rules in `docs/lessons-learned/` (the latest `LL-*.md`) — confirm before big
moves; verify access first; small reversible steps; concise.
