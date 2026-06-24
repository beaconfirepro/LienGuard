# HELM ↔ LienGuard Cross-App Integration Review

**Date:** 2026-06-22
**Author:** Development manager (cross-app review)
**Status:** Review only — no code changes made. Recommendations below are for approval before any implementation.
**Repos reviewed:** `beaconfirepro/LienGuard` (this repo) and `Beacon-Fire-Protection/helm` (read-only).

---

## 0. TL;DR

LienGuard is being built as the **first "standalone-but-integrated" Beacon app**. Its own SCOPE
records five deliberate canon supersessions (DD-01, DD-05, DD-09, DD-10, DD-12) and says the HELM
product owner will update HELM's canon to match. **That update has not happened.** HELM's canonical
docs still describe lien collections as an in-monorepo module (#22), still own the reference layer
(Department → SystemType → SubSystemType + stage triggers) in HELM's own Prisma schema, are actively
**retiring** HubSpot in favour of a Helm-native CRM, and have **no concept** of a service-key external
API, cross-app SSO, or consuming holds/exposure from another app.

The result is a contract that is, today, **one-sided**: LienGuard has built the *provider* half of every
integration point, and HELM has neither the *consumer* code nor the canonical decision to build it. There
are also three concrete shape/ownership conflicts that will cause real bugs if anyone wires the two together
as-is:

1. **Reference layer is double-owned** — both apps define and claim authority over `Department/SystemType/SubSystemType` + `lien_workflow_type`.
2. **Correlation keys don't match** — LienGuard speaks `hubspotCompanyId` / `hubspotProjectId`; HELM keys on its own `Company.id` / `Project.id` and is exiting HubSpot.
3. **Auth is a four-way mismatch** — SCOPE says "Helm SSO", LienGuard's backend uses Replit OIDC, LienGuard's frontend uses Clerk, and HELM uses Supabase. No two agree.

QBO-as-financial-system-of-record (DD-10) is the **one** point where both sides already agree.

---

## 1. HELM — Confirmed Stack, Architecture, Data Model, Auth

Confirmed by reading `helm/docs/canonical/*` and `helm/api/prisma/schema.prisma`.

### 1.1 Stack
| Layer | HELM actual |
|---|---|
| Frontend | React 18, Vite, Tailwind, shadcn/ui (Radix) |
| Backend | Node.js + Express 5, TypeScript, `tsx` |
| ORM / DB | Prisma v6 / PostgreSQL 16 (Docker local, Supabase-hosted) |
| Auth | **Supabase Auth — session management only** (`user_metadata.role`); no SSO, no IdP, no Clerk |
| Hosting | Vercel (frontend), Render (backend) |

> **Base44 is NOT the HELM stack.** The prior-session assumption ("HELM appears to be JavaScript / Base44")
> is **wrong**. HELM canon explicitly says *"Base44 is fully retired — never import `@base44/sdk`"*
> (`TECHNICAL_ARCHITECTURE.md`) and logs the Feb-2026 migration *"Moved from Base44 to Supabase + Express + Prisma."*
> A vestigial `src/shared/api/base44Client.js` file remains but is forbidden by canon. **Treat HELM as a
> Node/Express/Prisma/React/Supabase app.**

### 1.2 Architecture
HELM is a **single monorepo** with three product tiers: **Tower** (always-on: access, CRM, catalog, jobs,
locations, documents), **Automation** (QBO integration), and **paid Modules** (projects, scheduling,
partner_network, estimating, field, itm, **lien_collections**, cashflow, reporting). Cross-module
communication is **in-process** — *"Cross-module communication uses ModuleGuard … Tower API aggregation …
or a future event bus"* (`TECHNICAL_ARCHITECTURE.md`). There is **no external/service-key API surface and no
pattern for consuming another app's API** anywhere in HELM canon.

### 1.3 Data model (the parts that matter for this integration)
HELM **owns the reference layer in its own Prisma schema**:
- `Department` (`id, orgId, name, …`) → `systemTypes`
- `SystemType` (`id, orgId, name, departmentId`) → `subSystemTypes`
- `SubSystemType` (`id, orgId, systemTypeId, name, lien_workflow_type` /* STANDARD, PRELIMINARY, NO_LIEN */, `is_active`)
- `Stage` carries a `lien_clock_trigger` (HELM's equivalent of LienGuard's `StageTriggerConfig.lienClockTrigger`)

All are **`orgId`-scoped tenant tables**. Canon states the reference layer is a *"shared platform reference
layer, not lien-specific tables"* and that *"`lien_workflow_type` is a Helm-controlled enum — tenants select
from a defined list, they do not define their own."* CRM is Helm-native: `Company`, `Contact` (FK `companyId`),
`Location`; `Supplier` FKs to `Company` (one unified company/contact pool).

> **There are no lien_collections Prisma models in HELM yet.** The module is *scoped but not built* — only
> `helm/docs/modules/lien_collections/SCOPE.md` exists, and it describes a fully in-monorepo build.

### 1.4 Systems of record, per HELM canon
- **QBO = single financial system of record.** ✅ (agrees with LienGuard DD-10)
- **CRM = Helm-native Tower component.** HubSpot is on the **exit list** (roadmap: *"HubSpot … April 26, 2026 … replaced by Clients/CRM in Tower"*). ❌ (conflicts with LienGuard DD-05/DD-10)
- **Connecteam = interim** stack for scheduling/clock-in, intended to be replaced by HELM Field Ops. ⚠️ (tension with DD-12)
- **Identity = Supabase**, no SSO/shared identity. ❌ (conflicts with SCOPE's "Helm SSO")

---

## 2. Supersession Check — Did HELM's Canon Actually Get Updated?

LienGuard's SCOPE (Part 9.4) flags four decisions as `⚠ SUPERSEDES CANON` and states *"Product owner (Deb) is
updating `PRODUCT_ARCHITECTURE.md` accordingly."* **None of those updates are present in HELM's canon.**

| DD | LienGuard decision | HELM canon today | Verdict |
|---|---|---|---|
| **DD-01** | lien_collections is a **standalone app** (own repo/DB/deploy) | Still **Module #22**, type "Module", 5/5 in-monorepo fitness; file paths `src/modules/lien_collections/` | ❌ **Not updated — contradicts** |
| **DD-05** | **HubSpot** is CRM system of record | HubSpot **being retired**; Helm-native `crm` Tower component is authoritative | ❌ **Not updated — contradicts** |
| **DD-10 (QBO half)** | **QBO** is financial system of record | QBO **is** HELM's single financial SoR | ✅ **Agrees** |
| **DD-10 (HubSpot half)** | HubSpot owns projects/parties/status | HELM assumes Helm-native Jobs/Projects | ❌ **Not updated — contradicts** |
| **DD-12** | **Connecteam** owns timesheets | Connecteam is interim; HELM Field Ops intended to replace it; HELM has no notion timesheets are owned by an external app | ⚠️ **Partially present, not as a superseding decision** |
| **DD-09** | **LienGuard owns** the reference layer + exposes read API | HELM **owns** `Department/SystemType/SubSystemType` (+ `lien_workflow_type`, stage `lien_clock_trigger`) in its own schema and calls them a Helm-controlled shared platform layer | ❌ **Not updated — directly contradicts (double ownership)** |

**Bottom line:** HELM canon predates and does not acknowledge LienGuard. The supersessions are real *decisions*
recorded on the LienGuard side, but they have **not been ratified into HELM**. Until they are, any HELM agent
reading HELM canon will (correctly, per its own docs) build the reference layer and lien module *inside* HELM —
directly colliding with LienGuard.

---

## 3. Contract-Alignment Report (per integration point)

Legend: **Shape** = do the two sides agree on the payload/fields? **Ownership** = do they agree who is
authoritative? **Direction** = do they agree who provides vs consumes?

### 3.1 Reference layer — `GET /api/external/reference`
- **LienGuard side (built):** `requireServiceKey` route returns `{ departments: tree(Dept→SystemType→SubSystemType), stageTriggers }`. Code comment: *"Helm Core doesn't scope by org — it reads a combined catalogue."* Returns **all orgs' rows, unscoped**.
- **HELM side:** Owns the same three tables itself, **`orgId`-scoped**, `lien_workflow_type` "Helm-controlled". No consumer code; no canonical decision to consume an external reference API.
- **Shape:** ⚠️ Roughly compatible (Dept→SystemType→SubSystemType + `lien_workflow_type` + stage trigger), **but** LienGuard's stage triggers are keyed to `hubspotStageKey`, whereas HELM's `lien_clock_trigger` lives on HELM's own `Stage` model.
- **Ownership:** ❌ **Double-owned.** Both apps claim authority. This is the single biggest architectural conflict.
- **Direction:** ❌ LienGuard expects to **provide**; HELM canon expects to **own**, not consume.
- **Extra gap:** LienGuard exposes a **global, org-unscoped** catalogue; HELM's model is **per-org**. A multi-tenant HELM cannot consume a single global tree without an org mapping.

### 3.2 Hold flags — `GET /api/external/holds`
- **LienGuard side (built):** Returns active (uncleared) holds with `holdType` (`schedule_hold` / `material_hold`), `lienProjectId`, `linkedClientId`, `supplierInvoiceId`, plus **`hubspotProjectId`, `hubspotCompanyId`**, and bill-based fields (`supplierBillRef = qboSupplierInvoiceId`, amount, dueDate). Holds are **bill-based** (withhold payment on a specific vendor bill).
- **HELM side:** Canon describes a *Schedule Hold flag consumed by Scheduling* and a *Material Hold consumed by purchasing* — but **as in-app cross-module flags**, computed by HELM's own (unbuilt) lien module. No consumer endpoint, no service-key client.
- **Shape:** ⚠️ Concept matches (schedule/material hold), but LienGuard's payload is **bill-level** and correlated by **HubSpot/QBO IDs**; HELM's mental model is a **project/client-level boolean flag** keyed by HELM IDs.
- **Ownership:** ✅ Agreement *in principle* (LienGuard computes, HELM consumes) — this is the cleanest of the three data feeds.
- **Direction:** ✅ Agree (LienGuard → HELM).
- **Gap:** ❌ **Correlation key.** HELM cannot act on `hubspotProjectId`/`hubspotCompanyId` unless HELM also stores those IDs — which contradicts HELM's plan to exit HubSpot. Scheduling/Purchasing in HELM key off HELM's own `Project.id`/`Company.id`.

### 3.3 Exposure / collections status — `GET /api/external/exposure`
- **LienGuard side (built):** Aggregates `lienScheduleOfValues` (open statuses), work months, notices, filings, collection accounts → `{ openStreamCount, openProjectCount, totalGrossExposure, filedLienCount, collectionsAccountsInCollections, collectionsOverdueTotal, streams[] }`, each stream carrying `hubspotProjectId`.
- **HELM side:** Canon mentions exposure only as an **internal report** (L34/L42) inside the unbuilt HELM lien module; no cross-app dashboard consumer exists.
- **Shape:** ❌ Undefined on HELM's side — HELM has no agreed exposure schema to compare against.
- **Ownership:** ✅ Implied agreement (LienGuard owns lien lifecycle data).
- **Direction:** ✅ Agree (LienGuard → HELM/Reporting).
- **Gap:** Same `hubspotProjectId` correlation problem; plus the response is **org-unscoped** (no `orgId` filter on the aggregates) where HELM/Reporting is multi-tenant.

### 3.4 Auth / SSO / identity
- **SCOPE intends:** *"reuses Helm's authentication/SSO so it feels like one product"*; Phase 0: *"auth wired to Helm SSO."*
- **LienGuard backend (built):** **Replit OIDC** (`openid-client`, `ISSUER_URL=https://replit.com/oidc`, `REPL_ID`), cookie session `sid`.
- **LienGuard frontend (built):** **Clerk** (`@clerk/react`, `useClerk`, `useUser`).
- **HELM (built):** **Supabase Auth**, role in `user_metadata.role`, internal headers `x-org-id` / `x-user-id` / `x-user-role`.
- **Shape/Ownership/Direction:** ❌❌❌ **Four-way mismatch — nothing aligns.** There is no shared IdP; "Helm SSO" does not exist as a capability (HELM uses Supabase for *session management only*). LienGuard even has an **internal** split (Clerk frontend ↔ OIDC backend, already flagged in PR #10).
- **Service-to-service auth:** LienGuard's `/external/*` uses a single shared `X-Service-Key` (fail-closed: 503 if unset, 401 if mismatch). HELM has **no** service-key client and no canon for one.

### 3.5 Data HELM provides TO LienGuard
Per SCOPE, **none** — *"Helm Core is a consumer here, not a provider."* LienGuard's *inputs* come from HubSpot
(projects/parties/identity), Connecteam (timesheets), QBO (invoices). **But** HELM canon says HELM owns
Projects/Jobs natively and is exiting HubSpot — so the very data LienGuard reads "from HubSpot" is data HELM
intends to own. If HELM becomes the operational hub, **HubSpot may not be populated** with the project/party
data LienGuard depends on. This is a latent input-source conflict, not just an output-contract one.

### 3.6 Summary matrix
| Integration point | Shape | Ownership | Direction | Severity |
|---|:---:|:---:|:---:|---|
| Reference layer | ⚠️ | ❌ double-owned | ❌ | 🔴 Critical |
| Hold flags | ⚠️ | ✅ | ✅ | 🟡 key mismatch |
| Exposure | ❌ undefined HELM-side | ✅ | ✅ | 🟡 |
| Auth / SSO / identity | ❌ | ❌ | ❌ | 🔴 Critical |
| Correlation keys (HubSpot/QBO IDs) | ❌ | — | — | 🔴 Critical |
| HELM→LienGuard inputs (HubSpot data HELM is exiting) | ❌ | ❌ | — | 🟡 latent |
| QBO as financial SoR | ✅ | ✅ | ✅ | 🟢 aligned |

---

## 4. Recommended Integration Approach

### 4.1 Keep the architecture, ratify it in HELM
The standalone-but-integrated, **API-contract-over-shared-DB** approach is sound and worth keeping. The
problem is not the pattern — it's that **only one side has agreed to it.** The highest-leverage action is
**non-code**: get the four supersessions ratified into HELM's canon (`PRODUCT_ARCHITECTURE.md`,
`TECHNICAL_ARCHITECTURE.md`, `docs/modules/lien_collections/SCOPE.md`, roadmap) so HELM agents stop building
the colliding in-monorepo version. **This must precede any HELM-side consumer work.**

### 4.2 Resolve reference-layer ownership (pick ONE owner)
The reference layer cannot be authoritatively owned by both apps. Recommended: **HELM owns the reference layer**
(it already has the tables, it's org-scoped, it drives work-order routing / inspection forms / scheduling that
LienGuard does *not* touch), and **LienGuard consumes it** — the reverse of DD-09. Rationale: the reference
layer is a *platform* concern that more HELM modules depend on than just lien; LienGuard is the newcomer.
- If instead LienGuard must own it (DD-09 as written), then HELM has to **drop** its `Department/SystemType/SubSystemType` tables and consume LienGuard's API — a much bigger change on the HELM side, and HELM is the more established app.
- **This is the key product decision and should be made by the product owner before implementation.** (See open question in §6.)

### 4.3 Fix correlation keys — stop leaking HubSpot IDs as the public contract
The `/external/*` responses expose `hubspotCompanyId` / `hubspotProjectId` as the join keys. Because HELM is
**exiting HubSpot**, those keys are wrong for a HELM consumer. Recommended contract: each external payload
carries a **stable, source-agnostic correlation object** — e.g. `{ helmProjectId?, helmCompanyId?, hubspotProjectId?, hubspotCompanyId?, qboCustomerId? }` — so the consumer can match on whichever ID *it* owns. Long term,
agree on a single canonical entity ID (likely HELM's `Project.id`/`Company.id` once HELM is the operational hub).

### 4.4 Pick one identity model
Recommended: **one shared IdP across all Beacon apps.** Options, fastest-to-cleanest:
1. **Standardize on Clerk** as the Beacon-wide IdP (LienGuard frontend already uses it) and have **both** HELM and LienGuard backends validate Clerk-issued tokens. Requires HELM to move off Supabase Auth.
2. **Standardize on Supabase Auth** (HELM already uses it) and have LienGuard adopt it, dropping Replit OIDC + Clerk.
3. Keep separate IdPs but agree on a **shared OIDC trust** so sessions interoperate.

Regardless of choice, **first fix LienGuard's internal Clerk↔OIDC split** (already a P0 in PR #10) — the app
should have one auth mechanism end-to-end before cross-app SSO is attempted. Service-to-service stays on
`X-Service-Key` (fine for machine calls), but rotate it out of a single shared secret toward per-consumer keys.

### 4.5 Org / tenancy model
The `/external/*` endpoints are **org-unscoped** ("combined catalogue"). HELM is **multi-tenant by `orgId`**.
Before HELM consumes anything, agree on the tenant mapping: either LienGuard scopes its external responses by
an `orgId` the caller passes (validated against the service key), or both sides agree LienGuard is effectively
single-tenant-per-deployment for Beacon and HELM maps the whole feed to one HELM org.

---

## 5. Prioritized Action List

### P0 — Unblock & de-risk (do first)
1. **(HELM canon, product owner)** Ratify DD-01, DD-05, DD-09, DD-10, DD-12 into HELM's `PRODUCT_ARCHITECTURE.md` / `TECHNICAL_ARCHITECTURE.md` / `lien_collections/SCOPE.md`. Until done, HELM will keep building the colliding in-monorepo module. **Non-code, highest leverage.**
2. **(Product decision)** Decide reference-layer ownership: **HELM owns + LienGuard consumes** (recommended) vs LienGuard owns + HELM consumes (DD-09 as written). Everything in §3.1 depends on this.
3. **(LienGuard)** Fix the **red build** — finish the `LienStream → ScheduleOfValues` rename (incl. the `monthly.ts` runtime bug) and **land CI** that gates typecheck/build. (Already tracked in PR #10; a contract review is meaningless while the provider doesn't compile.)

### P1 — Make the contract real
4. **(LienGuard)** Replace HubSpot-only correlation keys in `/external/*` with a **source-agnostic correlation object** (§4.3).
5. **(LienGuard)** Add **org/tenant scoping** to `/external/*` (or formally document single-tenant-per-deploy) (§4.5).
6. **(LienGuard)** Resolve the **internal auth split** (Clerk frontend ↔ Replit OIDC backend) → one mechanism end-to-end.
7. **(Both)** Choose and document the **shared IdP / SSO** model (§4.4).
8. **(Both)** Publish the `/external/*` contract as a **versioned OpenAPI spec** (LienGuard already runs Orval codegen) so HELM can generate a typed client and the contract is testable on both sides.

### P2 — Harden
9. **(LienGuard)** Per-consumer service keys + rotation (replace single shared `SERVICE_KEY`).
10. **(Both)** Contract tests (consumer-driven) in CI on both repos so drift breaks a build, not production.
11. **(Both)** Resolve the **input-source conflict** (§3.5): confirm whether HubSpot/Connecteam stay populated once HELM is the operational hub, or whether LienGuard's inputs should shift to HELM APIs over time.

### What changes where
- **In LienGuard:** items 3, 4, 5, 6, 8, 9 (correlation keys, org scoping, auth unification, OpenAPI publication, service-key hardening). LienGuard built the provider half well; the work is mostly *contract shape* and *auth*, not rebuild.
- **In HELM:** items 1, 2, 7, 8, 10, 11 — predominantly **canonical/product decisions** plus net-new **consumer** code (service-key client, holds/exposure ingestion, reference-layer decision). HELM has zero consumer code today.
- **Joint:** the IdP decision (7) and the ownership decision (2) are product-owner calls that gate the rest.

---

## 6. Open Questions for the Product Owner
1. **Reference-layer ownership** — HELM owns + LienGuard consumes (recommended), or LienGuard owns + HELM consumes (DD-09)? This is the gating decision.
2. **HubSpot's future** — HELM canon retires HubSpot (~Apr 2026) for a Helm-native CRM, but LienGuard treats HubSpot as the system of record for client/project/party identity (DD-05/DD-10). Which is the real plan? If HubSpot is exiting, LienGuard's input sources and correlation keys must change.
3. **Identity** — one shared IdP across Beacon apps? If yes, which (Clerk vs Supabase)?
4. **Who writes the HELM canon update** — confirm the product owner still intends to ratify the supersessions, since this review found them unratified.

---

*This document is a review artifact. No LienGuard or HELM code was modified. Implementation awaits approval of the approach in §4 and the decisions in §6.*
