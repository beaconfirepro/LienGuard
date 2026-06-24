# LL — 2026-06-24 — Build plan and project tracking: churn, then reuse

> **Audience: Deb.** Same session as the other 2026-06-24 LL files, final phase: the build plan, the
> GitHub tracking model, the deploy decision, and tidy-up. Written for you to read.

## What this phase produced

`docs/BUILD_PLAN.md` (greenfield, 12 epics in ship order), the project-tracking model (adopting
helm's system), and the deploy decision (Vercel, Node 24.x, ED-17). The end state is good. The path
to it churned more than it needed to.

## What cost time, and how to save it next time

1. **The tracking model was redesigned about five times** (epics with sub-issues, then cut by
   role/UAT, then a simplified Kanban, then back to sub-issues, then adopt helm's system). Root cause:
   it was designed from scratch in chat instead of starting from what you already had.
   - **For you:** when a scheme already exists somewhere, say so up front. It did exist, in
     `beacon-fire-protection/helm`: issue templates (epic/story/bug/tech-debt), `setup-labels.sh`,
     board-sync workflows, and named agent personas. One sentence, "reuse helm's issue/project
     system," would have skipped the whole redesign.
   - **For Claude:** before inventing a process, check the sibling repos for an existing one. Ask
     "do we already have this?" early.

2. **Decision-shaped facts arrived piecemeal**, and each one triggered a doc pass: named personas vs
   build/deploy, full vs trimmed columns, Project #9, Vercel, Node 22 then corrected to 24.
   - **For you:** a five-line "tracking + deploy facts" note up front (board number, columns,
     personas, host, runtime version) avoids the back-and-forth.

3. **Migration-vs-greenfield wording still lingers in some canon** (ED-12 "task runner deferred",
   ED-13 "lifted into the monorepo") even though we went greenfield and Nx-now. We deliberately left
   the formal ED-12 flip to the deploy session; just know those two lines read stale until then.

## What worked, keep doing

- Reusing helm's battle-tested system instead of a bespoke one (once we looked).
- Recording decisions as ED entries (ED-16 naming, ED-17 deploy) so they stop getting re-litigated.
- The merge-on-green cron to land docs PRs without babysitting; pull-before-push hygiene.
- Flagging an inconsistency (the stale Nx line) and getting your call before editing canon.

## Carry into the next session

- Point at existing assets to reuse before anyone designs a new scheme.
- Give the handful of config facts (board, host, runtime, personas) in one message.
- The build and deploy sessions both work from `docs/BUILD_PLAN.md` + the kickoff; the deploy session
  still owns the ED-12 Nx flip.
