# LL — 2026-06-24 — Stabilization: green build, CI gate, and Phase A/B

> **One session's lessons.** Each Claude Code session writes its own file here
> (`docs/lessons-learned/`), named `LL-<date>-<topic>-<slug>.md`. Examples below are real, from
> the session that created this file. This session ran in parallel with the architecture
> re-founding session (`LL-2026-06-24-architecture-greenfield-pivot.md`); the two collided on
> `docs/DECISIONS.md` (see below).

**Session topic:** onboarding review of the existing LienGuard codebase, then getting it green,
gated, test-locked, and hardened. **Outcome:** Phase A (green build + CI gate + branch protection),
Phase B (deadline/hold/risk/legal-review/state-machine logic test-locked, UAT e2e in CI), and the
D3 audit log all merged to `main`. Sentry was attempted and reverted. Two notable traps below.

---

## TL;DR — operating rules for Claude (binding for every session)

Carried forward from the prior LL file (kept consistent across files):

1. **Confirm before big moves.** On a terse or ambiguous instruction, restate your reading in one
   line and get a "go" before any large, structural, or destructive action.
2. **Verify access/environment first.** Confirm the target repo is in scope and credentials are
   wired before planning dependent work.
3. **Smallest reversible step that proves direction** beats a big speculative build.
4. **Match length to the task.** Default concise. Long-form only when asked for.
5. **Friction is a stop signal.** Push-back or frustration means STOP, re-read literally, confirm,
   then act.

Added this session:

6. **CI gate before trusting any "build".** Vite/esbuild strip types without checking them, so a
   workspace can bundle and "run" while broken. Run `pnpm run typecheck` and have CI run it on
   every PR. The whole session started because a red typecheck shipped with no gate.
7. **A heavy dependency can break unrelated packages in a shared lockfile.** Vet dependency weight
   before adding. Do not run `pnpm dedupe` casually. Prefer no-SDK / pinning when a package drags
   a large transitive graph (e.g. OpenTelemetry).
8. **Push shared docs early; expect collisions.** `DECISIONS.md` (and `PRODUCTION_PLAN.md`) are
   edited by every session. Push small and often, rebase onto latest before finalizing, and expect
   `ED-xx` number collisions when two sessions run in parallel.
9. **Re-read canon when `main` moves under you.** A long session can see `main` change mid-flight
   (new `CLAUDE.md`, `USER_INSTRUCTIONS.md`, decisions). Re-read after a pull that brings changes.

---

## What this session did

- Reviewed the repo and wrote `CLAUDE.md`, `docs/CODE_REVIEW_AND_PRODUCTION_PLAN.md`,
  `docs/PRODUCTION_PLAN.md`.
- **Phase A:** finished the incomplete `LienStream → ScheduleOfValues` rename (it had broken
  typecheck across API + web, with a real runtime bug in the monthly run), added the CI workflow,
  set up one branch-protection ruleset.
- **Phase B:** test-locked the deadline engine, hold engine, risk scoring, the DD-04 legal-review
  gate, and the notice/waiver/filing state machines (~60+ unit tests via the "pure core, thin I/O"
  pattern, ED-05); wired the UAT e2e harness into CI.
- **D3:** a detailed append-only audit log (table + recorder + read API).
- Authored the Texas rule-set legal-review package and the decision log.

## Where effort/tokens were wasted (honest)

| What happened | Root cause | Cost |
|---|---|---|
| Spent significant effort adding `@sentry/node`, hit a dependency cascade, reverted it all | Did not vet that the SDK drags OpenTelemetry, which forks `drizzle-orm` (optional OTEL peer) and, on reinstall, reshuffles `vite`/`rollup`/`rolldown` and breaks the unrelated `mockup-sandbox` typecheck | A full build + revert cycle; net zero shipped (lesson recorded as ED-15) |
| `pnpm dedupe` to fix the dual-drizzle | Reached for a broad command on a shared lockfile | Made it worse (reshuffled vite 7/8); had to restore the lockfile |
| `DECISIONS.md` ED-08 collision with the parallel session | Both sessions edited the same doc; mine was based on a `main` that moved | A rebase + renumber to ED-15 (small, because append-only) |
| Repeated branch re-sync churn across parallel PRs | The ruleset requires branches be up to date, so each merge forced an update-branch + CI rerun on the next | Extra CI cycles; would have been avoided by merging strictly sequentially |
| Used em dashes throughout | `docs/USER_INSTRUCTIONS.md` (no em dashes) landed on `main` mid-session and I did not re-read it until later | Style drift until corrected |

## What worked well

- **Pure-core extraction (ED-05)** let me unit-test the legally-significant logic locally with no
  database, then rely on CI's Postgres for the DB paths. This was the single biggest reliability
  win given the container has no `DATABASE_URL`.
- **UAT e2e in CI earned its keep immediately:** its first run caught a real latent bug (the harness
  read `p.streams` where the list endpoint returns `p.sovs`, a leftover from the SOV rename).
- **One PR per phase, draft until green, squash-merge** kept `main` continuously green.

## Notes for the next session

- The architecture is being re-founded (Tower module: Prisma, Supabase + RLS, Clerk org as `orgId`,
  one design system, H1 migration). Work from `docs/ARCHITECTURE.md`, `docs/MIGRATION_PLAN.md`,
  `docs/DECISIONS.md` (ED-08…ED-15), and `docs/USER_INSTRUCTIONS.md`.
- Much of this session's code (Drizzle schema, Express routes, `DEFAULT_ORG_ID`, Replit OIDC) is
  superseded by that migration. The **domain engines** (deadline/hold/risk/legal-review/state
  machines) are ORM-agnostic by design and should carry forward; their tests are the safety net
  during the Prisma move.
- A real, still-open inconsistency: `GET /projects` (list) returns `sovs` while project
  detail/overview returns `streams`. Tracked as E7 in `docs/PRODUCTION_PLAN.md`.
