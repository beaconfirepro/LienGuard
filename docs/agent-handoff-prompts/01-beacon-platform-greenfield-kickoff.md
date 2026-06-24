# Kickoff 01 — Beacon Platform, Greenfield Build

> Paste the block below into a fresh Claude Code session scoped to `beaconfirepro/beacon-platform`.
> Make sure `01-beacon-platform-greenfield-brief.md` and `docs/LESSONS_LEARNED.md` are in the repo
> (or paste the brief too). Don't start coding before the checks in step 1 pass.

---

```
You are starting a GREENFIELD build of the Beacon platform in beaconfirepro/beacon-platform.

READ FIRST (in this order), then follow them:
1. docs/agent-handoff-prompts/01-beacon-platform-greenfield-brief.md  — full context + locked stack.
2. docs/lessons-learned/ (latest LL-*.md)  — operating rules. Follow them, especially: confirm before big moves;
   verify access/credentials FIRST; smallest reversible step; stay concise; friction = stop.

THE ONE RULE THAT OVERRIDES EVERYTHING:
This is greenfield. Do NOT port, copy, or refactor the old LienGuard code. The old app
(beaconfirepro/lienguard) and its product spec are a REQUIREMENTS REFERENCE ONLY. Build clean.

LOCKED STACK (do not relitigate — rationale is in the brief):
- pnpm-workspaces monorepo (no task runner yet; Nx-leaning later).
- Prisma · Supabase Postgres + RLS · Clerk (Organizations = tenant; org id == orgId) via Supabase
  Third-Party Auth, Clerk verified end-to-end.
- OpenAPI-first + Orval (generated Zod + TanStack Query).
- ONE design system in Storybook 8; single-source tokens; no hardcoded colors.
- Two-level nav: Tower owns the vertical primary nav; each module owns its horizontal nav.
- Products = Tower + modules + brand. LiensEasy = Tower + lien-collections module.

FIRST ACTIONS (do these before building anything):
1. VERIFY ACCESS: confirm you can read/write beaconfirepro/beacon-platform (try it). If denied,
   STOP and tell me to add it to this session's repo scope — do not work around it.
2. VERIFY CREDENTIALS: confirm Clerk + Supabase keys are present in the environment (needed for
   Tower's auth/DB). If missing, say what you need; you can still scaffold without them.
3. CONFIRM THE STARTING POINT with me in one line before building. Proposed greenfield order
   (smallest-useful-first): scaffold monorepo + CI → design system (Storybook) → Tower foundation
   (Clerk + Supabase/Prisma + shell) → lien-collections module (fresh, against the module
   contract) → lienseasy product shell. Do not assume — get my "go" on step 1's scope first.

WORKING STYLE:
- One concern per PR, green at each checkpoint; never leave the build red across a merge.
- Restate the plan in one line and get a go before any large or destructive action.
- Be concise. Long write-ups only when I ask for a deep dive.
```
