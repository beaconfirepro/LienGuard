# Lessons Learned — Working with Claude Code (Beacon Platform)

**Read this at the start of every session.** It is a living retrospective so each session is
faster, cheaper, and less error-prone than the last. It is written to be verifiable by a human:
the examples below are real, from the session that created this file.

> Origin: the 2026-06-24 architecture session that re-founded LienGuard/LiensEasy onto the
> **Tower platform** model. It reached good decisions (see `docs/ARCHITECTURE.md`,
> `docs/DECISIONS.md`) but wasted effort getting there. This file captures why, so we don't
> repeat it.

---

## TL;DR — operating rules for Claude (binding)

1. **Confirm before big moves.** On a terse or ambiguous instruction, restate your reading in
   **one line** and get a "go" before any large, structural, or destructive action. Acting big
   on an assumption is the #1 source of waste.
2. **Verify access/environment first.** Before planning work that depends on a repo or service,
   check it's reachable: is the target repo in the session's allowed scope? Are the credentials
   wired into the environment? Don't design around tools you haven't confirmed you have.
3. **Smallest reversible step that proves direction** beats a big speculative build.
4. **Match length to the task.** Default concise. Long-form only when a deep dive is asked for.
5. **Friction is a stop signal.** If the user pushes back or sounds frustrated, STOP, re-read the
   last few messages literally, confirm understanding, then act. Do not keep executing the prior
   plan.

---

## What the session was trying to do

Define how Beacon's apps compose: a shared **Tower** platform + separable **modules** + thin
**products** (LiensEasy, Helm), **one design system**, and a locked stack (Prisma ·
Supabase/RLS · Clerk · Storybook · OpenAPI · pnpm monorepo). The decisions were good and are
canon in `docs/ARCHITECTURE.md` and `docs/DECISIONS.md`. The *path* to them was wasteful.

## Where effort/tokens were wasted (honest)

| What happened | Root cause | Cost |
|---|---|---|
| Did a full "carry-in" of the old app, then launched a refactor agent — when the user wanted a **greenfield** build | Read a terse correction backwards and **acted big on the assumption** instead of confirming | The largest waste: a carry-in PR + a refactor agent, both discarded |
| Tried to create a repo and push before confirming access | Didn't **verify repo scope** up front | Repeated `403`s; `beacon-platform` still unreachable from the session |
| Long architecture essays | Verbosity not matched to need | Token burn (some discussion was genuinely useful; some was not) |
| Two `AskUserQuestion` tool-call errors | Malformed tool input | Minor friction, but friction |

## What the user can synthesize BEFORE a session (saves the most)

A one-page brief at the start would have skipped most of the thrash. Template:

- **Goal & non-negotiables.** e.g. *"Greenfield build of the Tower platform. Do NOT port or
  refactor the old LienGuard code — it is a requirements reference only."*
- **Architecture in 3 lines.** platform + modules + products; one design system; the stack
  (or "you choose").
- **Repo & access.** Which repo to build in, **already in the session's allowed scope**;
  credentials (Clerk/Supabase) **already wired into the environment**.
- **Terminology.** Product names (LiensEasy), and what loaded words mean (here, "beautify" =
  build it clean *now*, not later).
- **Definition of done / first milestone.** What "production-ready" means and where to start.

## How prompts could be clearer (real examples)

Terse *reactions* are the main misread risk. State **intent + constraint**, not just the
reaction. One extra clause naming the goal ("…because I want X") prevents the opposite reading.

| What was said | How it was misread | Clearer version |
|---|---|---|
| "No beautify now or it will never get done properly. Gotta work for the green." | Read as "skip the clean structure, do the quick carry-in" — the **opposite** of the intent | "Don't migrate the old code. Build it clean / greenfield from the start — that's the only way it gets done properly." |
| "take it back to an empty repo. start again. do not refactor the old code." | (clear — this one worked first time) | — |

The second example worked precisely because it stated the action **and** the constraint. The
first didn't, and cost a full detour.

## Session pre-flight checklist

**User, before starting:**
- [ ] Paste the one-page brief (template above).
- [ ] Confirm the target repo is in this session's repo scope.
- [ ] Confirm needed credentials are in the environment.

**Claude, at session start:**
- [ ] Read this file + `docs/ARCHITECTURE.md` + `docs/DECISIONS.md`.
- [ ] Verify repo access and credentials before planning dependent work.
- [ ] Restate the goal in one line and get a "go" before any large or destructive action.

## Keeping this alive

- This file is referenced from `CLAUDE.md` so every session reads it.
- **Append** new lessons after each session (date them) — don't rewrite history.
- Copy this file (and the `CLAUDE.md` pointer) into every repo we work in, including
  `beacon-platform` once it is reachable.
