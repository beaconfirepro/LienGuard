#!/usr/bin/env bash
# Seed the Helm build-plan epic cards and labels into the GitHub project (Kanban).
# Run ONCE against beaconfirepro/beacon-platform. Requires the `gh` CLI authenticated,
# or adapt the calls to your GitHub tooling. Source of truth for the epics: docs/BUILD_PLAN.md.
# Cards are created in ship order (top = next). Bugs/tech-debt are added as cards as they arise.
set -euo pipefail

REPO="${REPO:-beaconfirepro/beacon-platform}"
echo "Seeding labels and epic cards into $REPO"

label() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force; }
label "epic"        "5319e7" "A build-plan epic card"
label "agent:build" "1d76db" "Owned by the build session"
label "agent:deploy" "0e8a16" "Owned by the deploy/tooling session"
label "bug"         "d73a4a" "A genuine defect"
label "tech-debt"   "fbca04" "Deliberate shortcut or deferred refactor to revisit"

# epic <order> <owner-label> <title> <body>
epic() { gh issue create --repo "$REPO" --label "epic" --label "$2" \
  --title "[$1] $3" --body "$4"; }

epic 01 "agent:build"  "Foundation" \
"Scaffold (pnpm + Nx), Clerk auth (org=tenant, end-to-end), Prisma + Supabase + RLS, Helm shell with Tower nav. Gate: Clerk + Supabase tower. DoD: green CI, orgId only from Clerk claim, tenant isolation proven."
epic 02 "agent:deploy" "CI + deploy pipeline" \
"nx affected CI; deploy preview + prod so every later card can ship. Gate: deploy target."
epic 03 "agent:build"  "Design system" \
"Storybook 8: single-source tokens, components, two-level nav shells; no hardcoded colors. Gate: Chromatic token."
epic 04 "agent:build"  "Module framework" \
"module.config.ts contract, gating key, create-tower-module, tower-stub, module-boundary lint; lien-collections mounts and runs standalone."
epic 05 "agent:build"  "Lien core" \
"Jurisdictions/rule sets/projects/schedule-of-values; deadline + risk + hold engines with tests. Rebuilt from spec, not ported."
epic 06 "agent:build"  "Notices + monthly run" \
"Monthly run pre-generates draft notices; send queue; approve and send (certified mail) with status."
epic 07 "agent:build"  "Legal gate" \
"No send or file on an unreviewed rule set (prod); review unlocks; Texas rule set seeded."
epic 08 "agent:build"  "Waivers" \
"Create a waiver; approval + notarization gates; document generation."
epic 09 "agent:build"  "Filing + release" \
"Escalate to filing; affidavit; record and release."
epic 10 "agent:build"  "Collections" \
"Dunning ladder; account detail; vendor holds."
epic 11 "agent:build"  "Integrations" \
"QBO (invoices), CRM (projects/parties), Connecteam (hours) as ports + adapters; fixtures when keys absent."
epic 12 "agent:build"  "Launch hardening" \
"Security + RLS audit; least-privilege DB roles; rotate all credentials before prod; UAT; production deploy."

echo "Done. Create a Project (Board) on $REPO, enable auto-add for new issues, and order the cards. See docs/BUILD_PLAN.md."
