# Helm Build Plan (greenfield)

**Status: DRAFT for review.** Whole-task plan for **Helm** (the platform product; internally
**Tower** is the foundation layer, with separable **modules**, first `lien-collections`). Greenfield:
the old LienGuard app is a requirements reference only, not code to port. Canon: `docs/ARCHITECTURE.md`,
`docs/DECISIONS.md` (through ED-16), and the handoff brief/kickoff.

## Project tracking (adopt helm's system)

We reuse Beacon's existing issue/project/board system from `beacon-fire-protection/helm` rather than
inventing one. The build session ports it into `beacon-platform` and adapts it. It gives us:

- **Hierarchy via templates + labels:** `type/epic` (the cards below) → `type/story` (the units of
  work; one story = one branch = one PR = one agent, created from `story.yml` with a parent-epic link
  so it is a real sub-issue) → `type/bug` / `type/tech-debt`. Filter the board by `type/*`.
- **Named agent personas** (`agent/gary` backend, `agent/terry` frontend, `agent/claude` UI/UX,
  `agent/claudette` integrations, `agent/cody` architecture + infra, `agent/alex` QA/breakfix), ported
  from helm `.github/agents/`, so you can see who owns what.
- **GitHub Project #9** (org `beaconfirepro`), helm's fuller columns: 📦 Backlog → 🎯 Target Stories →
  🔍 Needs Scoping → ✅ Ready to Build → 🚀 In Progress → 👀 In Review → 🧪 In Testing → ✨ Done. Lets
  you scope separately in the same place.
- **Board automation:** agents cannot click the board, so they add a `board/*` label and the
  `label-to-board` / `board-to-label` workflows move the card via the Projects API. Issue ↔ PR ↔ CI ↔
  board.

### Port list (build session, early task) from `beacon-fire-protection/helm`
- `.github/ISSUE_TEMPLATE/*` (epic, story, bug-report, tech-debt, feature, module, config)
- `.github/scripts/setup-labels.sh`
- `.github/workflows/label-to-board.yml`, `board-to-label.yml`, `agent-sub-issue-lifecycle.yml`
- `.github/agents/*` (the personas) + process docs `docs/ops/GITHUB_PROJECTS.md`, `docs/SDLC_PROCESS.md`,
  `docs/canonical/AGENT_GUIDE.md`

**Adaptations:** in the workflows, org `Beacon-Fire-Protection` → `beaconfirepro` and `PROJECT_NUMBER`
→ **9**; set the `PROJECT_TOKEN` secret. Replace `module/*` labels with our set (`module/tower`,
`module/lien-collections`, `module/design`, `module/infra`, `module/integrations`). Rewrite the
`story.yml` pre-PR checklist to Nx commands (`nx affected -t lint typecheck test`).

## Epics in ship order

1. **Foundation** — owner build. Gate: Clerk + Supabase `tower`.
   Scaffold (pnpm + Nx), Clerk auth (org = tenant, end-to-end), Prisma + Supabase + RLS, Helm shell
   with the Tower vertical nav. Green CI baseline; `orgId` only from the Clerk claim; tenant isolation
   proven.
2. **CI + deploy pipeline** — owner deploy. Gate: deploy target.
   `nx affected` CI; deploy to preview + prod so every later card can ship.
3. **Design system** — owner build. Gate: Chromatic token.
   Storybook 8: single-source tokens, components, the two-level nav shells. No hardcoded colors.
4. **Module framework** — owner build.
   `module.config.ts` contract, gating key, `create-tower-module`, `tower-stub`, module-boundary lint;
   `lien-collections` mounts and runs standalone.
5. **Lien core** — owner build.
   Jurisdictions / rule sets / projects / schedule-of-values; the deadline, risk, and hold engines
   (with fast tests). Rebuilt from the spec, not ported.
6. **Notices + monthly run** — owner build.
   Monthly run pre-generates draft notices; send queue; approve and send (certified mail) with status.
7. **Legal gate** — owner build.
   No send or file on an unreviewed rule set (enforced in prod); review unlocks; Texas rule set seeded.
8. **Waivers** — owner build.
   Create a waiver; approval + notarization gates; document generation.
9. **Filing + release** — owner build.
   Escalate to filing; affidavit; record and release.
10. **Collections** — owner build.
    Dunning ladder; account detail; vendor holds.
11. **Integrations** — owner build.
    QBO (invoices), CRM (projects/parties), Connecteam (hours) as ports + adapters; fixtures when keys
    are absent. Can start as stubs earlier if a card needs the data.
12. **Launch hardening** — owner build + deploy.
    Security + RLS audit; least-privilege DB roles; rotate all credentials before prod; UAT; production
    deploy.

## Open decisions

- **Deploy target** for card 2 (Vercel / Fly / other). Owner: Deb.
- **Lien module public brand** (ED-16): "LiensEasy" or folded into Helm.
- Credential gates: Clerk + Supabase `tower` + Third-Party Auth (card 1), Chromatic (card 3).

## Bootstrap order

1. **Build session** ports the files above from helm, applies the adaptations, and runs the adapted
   `setup-labels.sh` against `beaconfirepro/beacon-platform`.
2. **Build session** runs `docs/agent-handoff-prompts/seed-issues.sh` to create the 12 `type/epic`
   cards (in ship order, with module + suggested lead-persona labels).
3. **You (one-time):** create **Project #9** (Board) on `beaconfirepro`, add the 8 columns above as the
   Status field, enable **auto-add** for new repo issues, and add the **`PROJECT_TOKEN`** secret so the
   board-sync workflows can move cards.
