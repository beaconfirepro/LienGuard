# Helm Build Plan (greenfield)

**Status: DRAFT for review.** Whole-task plan for **Helm** (the platform product; internally
**Tower** is the foundation layer, with separable **modules**, first `lien-collections`). Greenfield:
the old LienGuard app is a requirements reference only, not code to port. Canon: `docs/ARCHITECTURE.md`,
`docs/DECISIONS.md` (through ED-16), and the handoff brief/kickoff.

## The board (Kanban)

One **GitHub Project (Kanban) in `beaconfirepro/beacon-platform`**. The **epics below are the cards**,
listed in **ship order** (top = next). That order is the priority.

- Columns: **Backlog → In progress → In review → Done.**
- An agent picks the top Backlog card it owns, moves it to In progress, opens a PR (`Closes #`), moves
  to In review, and the card closes to Done when the PR merges.
- **Bugs and tech debt are cards too**, labelled `bug` / `tech-debt`, and slotted into the column and
  priority they deserve.
- Owner per card: `agent:build` or `agent:deploy`. Nx handles task detail below the card.

Labels to create: `epic`, `agent:build`, `agent:deploy`, `bug`, `tech-debt`.

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

## Bootstrap

1. Agent runs `docs/agent-handoff-prompts/seed-issues.sh` against `beaconfirepro/beacon-platform` to
   create the labels and the 12 epic cards (in ship order).
2. You (one-time, ~1 min): create a Project on `beacon-platform`, Board layout, turn on **auto-add**
   for new repo issues. Drag the cards into priority order if needed.
