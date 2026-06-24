#!/usr/bin/env bash
# Seed the 12 Helm build-plan epic cards into beacon-platform's GitHub Project (#9).
# PREREQUISITES (build session, done first):
#   1. Port helm's .github issue/project system into beacon-platform and apply the adaptations
#      (org -> beaconfirepro, PROJECT_NUMBER -> 9, module/* relabelled, story.yml -> Nx commands).
#      See docs/BUILD_PLAN.md "Project tracking".
#   2. Run the adapted setup-labels.sh so type/*, agent/*, module/*, priority/*, status/*, board/*
#      labels exist.
# Then run THIS script once. Requires the `gh` CLI authenticated (or adapt to your GitHub tooling).
# Source of truth for the epics: docs/BUILD_PLAN.md. Stories are created under each epic from story.yml.
set -euo pipefail

REPO="${REPO:-beaconfirepro/beacon-platform}"
echo "Seeding 12 epic cards into $REPO (Project #9)"

# epic <order> <module-label> <lead-agent-label> <title> <body>
epic() { gh issue create --repo "$REPO" \
  --label "type/epic" --label "$2" --label "$3" \
  --title "[$1] $4" --body "$5"; }

epic 01 "module/tower" "agent/gary" "Foundation" \
"Scaffold (pnpm + Nx), Clerk auth (org=tenant, end-to-end), Prisma + Supabase + RLS, Helm shell with Tower nav. Gate: Clerk + Supabase tower. DoD: green CI, orgId only from Clerk claim, tenant isolation proven."
epic 02 "module/infra" "agent/cody" "CI + deploy pipeline" \
"nx affected CI; Vercel preview deploy per PR and prod on main (Node.js 24.x). Dev: https://beacon-platform-pi.vercel.app/"
epic 03 "module/design" "agent/claude" "Design system" \
"Storybook 8: single-source tokens, components, two-level nav shells; no hardcoded colors. Gate: Chromatic token."
epic 04 "module/tower" "agent/cody" "Module framework" \
"module.config.ts contract, gating key, create-tower-module, tower-stub, module-boundary lint; lien-collections mounts and runs standalone."
epic 05 "module/lien-collections" "agent/gary" "Lien core" \
"Jurisdictions/rule sets/projects/schedule-of-values; deadline + risk + hold engines with tests. Rebuilt from spec, not ported."
epic 06 "module/lien-collections" "agent/gary" "Notices + monthly run" \
"Monthly run pre-generates draft notices; send queue; approve and send (certified mail) with status."
epic 07 "module/lien-collections" "agent/gary" "Legal gate" \
"No send or file on an unreviewed rule set (prod); review unlocks; Texas rule set seeded."
epic 08 "module/lien-collections" "agent/terry" "Waivers" \
"Create a waiver; approval + notarization gates; document generation."
epic 09 "module/lien-collections" "agent/gary" "Filing + release" \
"Escalate to filing; affidavit; record and release."
epic 10 "module/lien-collections" "agent/gary" "Collections" \
"Dunning ladder; account detail; vendor holds."
epic 11 "module/integrations" "agent/claudette" "Integrations" \
"QBO (invoices), CRM (projects/parties), Connecteam (hours) as ports + adapters; fixtures when keys absent."
epic 12 "module/infra" "agent/alex" "Launch hardening" \
"Security + RLS audit; least-privilege DB roles; rotate all credentials before prod; UAT; production deploy."

echo "Done. Lead-persona labels are suggestions; reassign as needed. Stories go under each epic via story.yml."
