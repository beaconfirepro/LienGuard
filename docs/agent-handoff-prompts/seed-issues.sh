#!/usr/bin/env bash
# Seed the Helm build-plan epics and tracking labels into the GitHub project.
# Run ONCE against beaconfirepro/beacon-platform. Requires the `gh` CLI authenticated,
# or adapt the calls to your GitHub tooling. Source of truth for the epics: docs/BUILD_PLAN.md.
#
# After this runs, agents open role-aware SUB-ISSUES under each epic, label themselves
# `agent:<name>`, and link PRs with `Closes #`. Nx handles granularity below the issue level.
set -euo pipefail

REPO="${REPO:-beaconfirepro/beacon-platform}"

echo "Seeding labels and epics into $REPO"

# --- Labels -----------------------------------------------------------------
label() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force; }
label "epic"        "5319e7" "High-level acceptance area (parent issue)"
label "agent:build" "1d76db" "Owned by the build session"
label "agent:deploy" "0e8a16" "Owned by the deploy/tooling session"
label "bug"         "d73a4a" "A genuine defect (UAT or post-merge)"
label "tech-debt"   "fbca04" "Deliberate shortcut or deferred refactor to revisit"
label "enhancement" "a2eeef" "Out-of-scope idea captured for later"

# Role labels (the user-type dimension on sub-issues; add more as needed)
label "role:tenant-admin"        "c5def5" "User type: Tenant Admin (config)"
label "role:project-coordinator" "c5def5" "User type: Project Coordinator (primary lien user)"
label "role:ar-collections"      "c5def5" "User type: AR/Collections Coordinator"
label "role:pm-finance"          "c5def5" "User type: PM & Finance (approvals)"
label "role:manager"             "c5def5" "User type: Manager (oversight)"

# --- Epics ------------------------------------------------------------------
# epic <title> <body>
epic() { gh issue create --repo "$REPO" --label "epic" --title "$1" --body "$2"; }

epic "E1 — Foundation stands up" \
"High level: a human can sign in and the platform holds together with tenant isolation.
Owner: build. Gate: Clerk + Supabase \`tower\`.
DoD: sign-in works, orgId only from the Clerk claim, RLS proven, a migration applies, green CI.
Sub-issues are role-aware (Tenant Admin / any user / security) and created as work is cut. See docs/BUILD_PLAN.md."

epic "E2 — Design system is the one source" \
"High level: Storybook is the single look and the two-level nav shells.
Owner: build. Gate: Chromatic token.
DoD: tokens drive all components (no hardcoded colors), nav shells render, visual-regression gates CI."

epic "E3 — A module mounts and gates" \
"High level: a module appears or hides by entitlement and runs standalone.
Owner: build.
DoD: generated stub module mounts in Helm and runs on packages/tower-stub; module-boundary lint passes."

epic "E4 — Lien project setup and deadlines" \
"High level: set up a lien project over reference data and see derived dates.
Owner: build.
DoD: project creates against jurisdiction data; deadline + risk engines correct (tests)."

epic "E5 — Monthly run, notices, send queue" \
"High level: the monthly run pre-generates notices; they get approved and sent.
Owner: build.
DoD: monthly run produces drafts; Coordinator review -> PM/Finance approve -> send (certified mail) with status."

epic "E6 — Waivers with gates" \
"High level: a waiver moves through approval and notarization.
Owner: build.
DoD: approval + notarization gates enforced; document generated."

epic "E7 — Filing and release" \
"High level: escalation to filing and release works.
Owner: build.
DoD: filing produces the affidavit; record/release path works; Manager oversight."

epic "E8 — Collections dunning ladder" \
"High level: the collections ladder runs in parallel to liens.
Owner: build.
DoD: ladder escalates per policy; account detail and vendor holds reflect state."

epic "E9 — Integrations through ports" \
"High level: external systems flow through declared ports.
Owner: build.
DoD: QBO/CRM/Connecteam adapters behind ports; fixtures/no-ops when keys absent."

epic "E10 — Legal safety gate" \
"High level: statutory safety is enforced.
Owner: build.
DoD: no send or file on an unreviewed rule set (prod); review unlocks; ships locked."

epic "E11 — Deploy and operate" \
"High level: the app is deployed and observable.
Owner: deploy. Gate: deploy target decision.
DoD: preview + prod deploy from CI (nx affected); error tracking and audit log present."

epic "E12 — Launch readiness" \
"High level: production-ready.
Owner: build + deploy.
DoD: security + RLS audit, least-privilege DB roles, credentials rotated, UAT sign-off per role."

echo "Done. Now create the Project (v2) in the UI, enable auto-add, and add the Overview (by epic) and By-agent views. See docs/BUILD_PLAN.md."
