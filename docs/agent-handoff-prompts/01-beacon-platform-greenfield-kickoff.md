# Kickoff 01: Helm Greenfield Build (Helm = the platform; Tower = its internal foundation layer)

> Paste the block below into a fresh Claude Code session scoped to `beaconfirepro/beacon-platform`.
> The referenced docs live in **`beaconfirepro/lienguard`** under `docs/` (on `main`), NOT in the
> empty `beacon-platform`. So do one of: add `lienguard` to the session's repo scope, copy those
> `docs/` files into `beacon-platform` first, or paste the brief inline. Don't start coding before
> the checks in step 1 pass.

---

```
You are starting a GREENFIELD build of Helm, the platform product. Internally, Helm has a
foundation layer named Tower (not public; owns auth, the design system, the database, and module
gating) that the modules run on. Build in beaconfirepro/beacon-platform (the repo name is internal;
the public product is Helm).

REPOS IN THIS SESSION (know their roles; several are attached):
- beaconfirepro/beacon-platform: THE BUILD TARGET. All new code goes here.
- beaconfirepro/lienguard: requirements + canon docs (USER_INSTRUCTIONS / ARCHITECTURE /
  DECISIONS / the brief / lessons-learned). REFERENCE ONLY: read it, never modify it, do NOT
  port its code.
- beacon-fire-protection/helm: the existing Helm app; the future source for the Tower
  extraction (a later horizon). REFERENCE ONLY for now: read for patterns, do not modify.
- beaconfirepro/helm-itm: empty/interim scratch repo. Ignore unless I say otherwise.
(If lienguard is NOT attached, you cannot read the canon docs, so STOP and ask me to attach it
or paste them.)

READ FIRST (in this order), then follow them. These docs live in the beaconfirepro/lienguard repo
(under docs/ on main): read them from there (ensure lienguard is in THIS session's repo scope), or
from this repo if they have been copied in. If you can reach neither, STOP and ask me to add
lienguard to scope or paste them:
1. (lienguard) docs/USER_INSTRUCTIONS.md: Deb's binding operating instructions. Follow them
   exactly, including: NEVER use em dashes unless grammatically called for; never comment on
   eating, sleeping, stopping, time of day, or how long we have worked.
2. (lienguard) docs/agent-handoff-prompts/01-beacon-platform-greenfield-brief.md: full context +
   locked stack.
3. (lienguard) docs/lessons-learned/ (latest LL-*.md): operating rules. Follow them, especially:
   confirm before big moves; verify access/credentials FIRST; smallest reversible step; stay
   concise; friction = stop.

FIRST COMMIT (once you can read the docs, before any build work): copy the reference docs from
lienguard into THIS repo's docs/ (docs/USER_INSTRUCTIONS.md, docs/agent-handoff-prompts/,
docs/lessons-learned/, and ARCHITECTURE.md / DECISIONS.md / BUILD_PLAN.md) so beacon-platform
is self-documenting. Add a root CLAUDE.md pointing to docs/USER_INSTRUCTIONS.md (read and follow
first) and docs/lessons-learned/. Commit and push that as the first commit, then proceed.

THE ONE RULE THAT OVERRIDES EVERYTHING:
This is greenfield. Do NOT port, copy, or refactor the old LienGuard code. The old app
(beaconfirepro/lienguard) and its product spec are a REQUIREMENTS REFERENCE ONLY. Build clean.

LOCKED STACK (do not relitigate; rationale is in the brief):
- pnpm-workspaces monorepo (no task runner yet; Nx-leaning later).
- Prisma, Supabase Postgres + RLS, Clerk (Organizations = tenant; org id == orgId) via Supabase
  Third-Party Auth, Clerk verified end-to-end.
- OpenAPI-first + Orval (generated Zod + TanStack Query).
- ONE design system in Storybook 8; single-source tokens; no hardcoded colors.
- Two-level nav: Tower owns the vertical primary nav; each module owns its horizontal nav.
- Product = Helm (the public platform; internally Tower) + the modules a tenant enables. First
  module: lien-collections. Any public sub-brand for the lien module (e.g. LiensEasy) is TBD (ED-16).

FIRST ACTIONS (do these before building anything):
1. VERIFY ACCESS: confirm you can read/write beaconfirepro/beacon-platform (try it). If denied,
   STOP and tell me to add it to this session's repo scope; do not work around it.
2. VERIFY CREDENTIALS + DB TARGET: confirm Clerk + Supabase keys are present in the environment
   (needed for Tower's auth/DB). The Supabase target is org Helm, project `tower` (the empty shared
   Tower DB); do NOT use helm-dev. Table naming separates Tower tables from module tables (see
   ED-16). If keys are missing, say what you need; you can still scaffold without them.
3. CONFIRM THE STARTING POINT with me in one line before building. Proposed greenfield order
   (smallest-useful-first): scaffold monorepo + CI, then design system (Storybook), then Tower
   foundation (Clerk + Supabase/Prisma + shell), then lien-collections module (fresh, against the
   module contract), then the Helm product shell (app). Do not assume; get my "go" on step 1's scope
   first.

WORKING STYLE:
- This is a cloud session on an ephemeral container: commit to a branch and PUSH frequently;
  never end a turn with meaningful work un-pushed (un-pushed work is lost when the container is
  reclaimed).
- One concern per PR, green at each checkpoint; never leave the build red across a merge.
- Restate the plan in one line and get a go before any large or destructive action.
- Be concise. Long write-ups only when I ask for a deep dive.
```
