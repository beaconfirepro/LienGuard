# Helm Build Plan (greenfield)

**Status: DRAFT for review.** Whole-task plan for building **Helm** (the platform product;
internally **Tower** is the foundation layer, with separable **modules**, first `lien-collections`).
Greenfield: the old LienGuard app is a requirements reference only, not code to port. Canon:
`docs/ARCHITECTURE.md`, `docs/DECISIONS.md` (through ED-16), and the handoff brief/kickoff. Naming
and stack are locked there.

---

## How we track work (the project model)

Tracked in a **GitHub Project (v2) in `beaconfirepro/beacon-platform`**, with issues auto-added.
Three levels plus a side lane:

- **Epics (high level)** = the 12 functional areas below. Your "where is development overall" view.
  One issue each, labelled `epic`.
- **Sub-issues (drill-down)** = the discrete work **and test** items under an epic. **Cut by user
  role where the flow differs**, so acceptance testing is per-role (a Project Coordinator's path and
  a PM/Finance approver's path are separate testable items). Each sub-issue carries an
  **`agent:<name>`** label (drill to the agent) and, when it is a role-specific slice, a
  **`role:<type>`** label, and links its PR with `Closes #`. Defined and broken out as work is cut,
  not all up front.
- **Below issues:** Nx handles build-task granularity (task graph, generators, affected runs,
  module-boundary lint). Not tracked as issues.
- **Side lane (parallel to epics, not children):** `bug`, `tech-debt`, `enhancement` labels for
  discovered work; agent-labelled; same board.

**User roles (the sub-issue cut):** Tenant Admin (config), Project Coordinator (primary lien user),
AR/Collections Coordinator, PM & Finance (waiver/collections approvals), Manager (oversight).

**Board views:**
- **Overview**: group by Epic (parent) and Status. The high-level pulse.
- **By agent**: group by the `agent:*` label. Drill into one agent's open items and linked PRs.
- Optional: filter any view by `role:*` to see one user type's acceptance items.

**Conventions:**
- Bug found **before merge**: fix it in that PR, no issue. Bug found in **UAT or after merge**:
  open a `bug` issue linked to the affected epic.
- A deliberate shortcut: open a `tech-debt` issue referencing the code (ED-15/Sentry is an example).
- Each epic's per-role acceptance run is what **produces** the bug and debt issues.

**Labels to create:** `epic`, `agent:build`, `agent:deploy`, `bug`, `tech-debt`, `enhancement`, and
a `role:*` per user type (`role:tenant-admin`, `role:project-coordinator`, `role:ar-collections`,
`role:pm-finance`, `role:manager`). Add more `agent:*` / `role:*` as needed.

---

## Epics (high level)

Each epic is one GitHub issue (`epic` label). **Owner**: `build` or `deploy` session. **Gate**: a
credential or decision needed to finish. **Example sub-issues** show the role-aware breakdown; the
owning agent creates them as work is cut. Legend: ⬜ ⛔ 🔄 ✅.

### E1 — Foundation stands up  (owner: build)  Gate: Clerk + Supabase `tower`
A human can sign in and the platform holds together with tenant isolation.
Sub-issues (examples): Tenant Admin configures the org and enables a module · any user signs in via
Clerk and sees the Helm shell + Tower vertical nav · security: cross-tenant access is denied (RLS) ·
a Prisma migration applies to the `tower` project. *(Enabling: scaffold, Nx, CI fold in here.)*
**DoD:** sign-in works, `orgId` only from the Clerk claim, RLS proven, migration applied, green CI.

### E2 — Design system is the one source  (owner: build)  Gate: Chromatic token
Storybook is the single look and the two-level nav shells.
Sub-issues (examples): tokens drive all components (no hardcoded colors) · Tower vertical + module
horizontal nav shells render · visual-regression catches an intentional drift.
**DoD:** components and nav shells in Storybook; tokens-only lint passes; Chromatic gates CI.

### E3 — A module mounts and gates  (owner: build)
A module appears or hides by entitlement and runs on its own.
Sub-issues (examples): Tenant Admin toggles the gating key on/off · Project Coordinator sees the
module appear in nav · the module runs standalone on `packages/tower-stub`.
**DoD:** generated stub module mounts in Helm and runs standalone; module-boundary lint passes.

### E4 — Lien project setup and deadlines  (owner: build)
Set up a lien project over reference data and see derived dates.
Sub-issues (examples): Tenant Admin seeds jurisdictions/rule sets · Project Coordinator creates a
project and sees work months, statutory deadlines, and risk score.
**DoD:** project creates against reference data; deadline/risk engines produce correct values (tests).

### E5 — Monthly run, notices, send queue  (owner: build)
The monthly run pre-generates notices and they get approved and sent.
Sub-issues (examples): Project Coordinator reviews draft notices in the send queue · PM & Finance
approves · notice sends (certified mail) and status tracks.
**DoD:** monthly run produces drafts; approval + send path works with status.

### E6 — Waivers with gates  (owner: build)
A waiver moves through approval and notarization.
Sub-issues (examples): Project Coordinator creates a waiver · PM & Finance approval gate · the
notarization gate · document generation.
**DoD:** waiver enforces approval + notarization gates and generates the document.

### E7 — Filing and release  (owner: build)
Escalation to filing and release works.
Sub-issues (examples): Project Coordinator escalates to filing · affidavit generated · Manager sees
oversight · record and release.
**DoD:** filing produces the affidavit; record/release path works.

### E8 — Collections dunning ladder  (owner: build)
The collections ladder runs in parallel to liens.
Sub-issues (examples): AR/Collections Coordinator runs the ladder and escalates contacts · PM &
Finance approves write-off/settlement · account detail and vendor holds views.
**DoD:** ladder escalates per policy; account detail and holds reflect state.

### E9 — Integrations through ports  (owner: build)
External systems flow through declared ports.
Sub-issues (examples): Tenant Admin connects QBO (invoices), CRM (projects/parties), Connecteam
(hours) · fixtures/no-ops when keys are absent.
**DoD:** adapters implement the ports; module works with fixtures and with live keys.

### E10 — Legal safety gate  (owner: build)
Statutory safety is enforced.
Sub-issues (examples): enforcement: no send or file on an unreviewed rule set · Tenant Admin/Manager
reviews and unlocks the rule set.
**DoD:** `legalReviewed` gate enforced in prod; rule set ships locked.

### E11 — Deploy and operate  (owner: deploy)  Gate: deploy target decision
The app is deployed and observable.
Sub-issues (examples): CI builds via `nx affected` and deploys preview + prod · errors captured ·
Manager/Admin sees the audit log.
**DoD:** preview and prod deploy from CI; error tracking and audit log present.

### E12 — Launch readiness  (owner: build + deploy)
Production-ready.
Sub-issues (examples): security + RLS audit · least-privilege DB roles · credentials rotated before
prod · UAT sign-off per role.
**DoD:** launch checklist passed; production deploy approved.

---

## Sequencing map

- **First:** E1 (foundation) plus E2 (design) and E11's CI half can start in parallel after the scaffold.
- **Then:** E3 (module mounts) once E1/E2 exist.
- **Module slices:** E4 then E5/E6/E7 (lien) and E8 (collections) in parallel once E3/E4 land.
- **Cross-cutting:** E9 and E10 attach to the lien module; E11 deploy throughout; E12 last.

## Open decisions feeding this plan

- **Deploy target** for E11 (Vercel / Fly / other; preview + prod). Owner: Deb.
- **Lien module public brand** (ED-16): "LiensEasy" or folded into Helm. Labels only.
- Credential gates: Clerk + Supabase `tower` + Third-Party Auth (E1), Chromatic (E2).

## Bootstrap (how the board gets created)

1. **Agent (build/deploy session):** run `docs/agent-handoff-prompts/seed-issues.sh` against
   `beaconfirepro/beacon-platform` to create the labels and the 12 epic issues. Thereafter agents
   open role-aware sub-issues under the relevant epic, label themselves `agent:*`, and link PRs.
2. **You (one-time, ~2 min in the GitHub UI):**
   - New Project (v2) on `beaconfirepro/beacon-platform`.
   - Workflows: enable **Auto-add to project** for new repo issues.
   - View 1 "Overview": layout Board, **group by** Parent issue (epic), with a Status column.
   - View 2 "By agent": **group by** the `agent` label (or filter `label:agent:build`, etc.).
