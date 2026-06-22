# Decision Log

**Single source of truth for engineering & process decisions on LienGuard.**

This file complements — does not replace — the **product** decisions (`DD-01…DD-13`)
recorded in `attached_assets/lien_collections_SCOPE.md`. Product/scope decisions live
there; *how we build, test, gate, and operate* lives here.

> **Why in the repo (and not only a Claude "cowork" project)?** Anything that should
> bind future Claude Code sessions and human contributors must live **in the repo**,
> because that is the only context every coding session and reviewer actually sees. A
> Claude.ai Project's uploaded knowledge is **not** visible to Claude Code sessions
> running against this repository. Use the cowork project for human brainstorming, but
> **land durable decisions here** (and behavioral rules in `CLAUDE.md`). When a decision
> is made in chat or in cowork, add a row here so everyone works off the same gumbo.

**Knowledge map (where things go):**
| Kind of knowledge | Home |
|-------------------|------|
| Rules that change how Claude behaves in this repo / how to run things | `CLAUDE.md` (auto-loaded every session) |
| Product/scope decisions (`DD-xx`) | `attached_assets/lien_collections_SCOPE.md` |
| Engineering & process decisions (`ED-xx`) | **this file** |
| The phased plan + live status | `docs/PRODUCTION_PLAN.md` |
| Hard-won technical gotchas | `.agents/memory/` |
| Legal-review package for the rule set | `docs/TEXAS_RULE_SET_LEGAL_REVIEW.md` |

Status: ✅ decided · 🔄 provisional (revisit) · ❓ open

---

## ED-01 — CI is the hard merge gate ✅
`build-and-test` (install → typecheck → build → API tests on a Postgres service) is a
**required** status check on PRs to `main`. Nothing merges red. Rationale: the broken
build that prompted this work shipped precisely because Vite/esbuild skip type-checking
and there was no gate. _(2026-06-22)_

## ED-02 — Copilot review stays advisory, not required ✅
Automatic Copilot PR review is enabled for a second set of eyes, but it is **not** a
required status check — AI review must not be able to block a merge, and statutory/legal
correctness is owned by humans + counsel, not an AI reviewer. _(2026-06-22)_

## ED-03 — One ruleset, targeting the default branch ✅
Branch protection is a **single** ruleset targeting `main` only (require PR + require
`build-and-test`). Targeting all branches blocks feature-branch pushes (checks can't run
before the branch exists). _(2026-06-22)_

## ED-04 — DD-04 legal-review gate: enforced in prod, ships locked 🔄
No notice is sent and no lien is exported/recorded on a rule set with
`legalReviewed = false`, enforced in **production only** (relaxed in dev/test/UAT, or via
`LEGAL_REVIEW_BYPASS=1`). **The seed must ship `legalReviewed: false`** so the gate is
meaningful; flip to `true` only after counsel signs off (see
`docs/TEXAS_RULE_SET_LEGAL_REVIEW.md`). _Currently the seed ships `true` — to be fixed._
_(2026-06-22)_

## ED-05 — "Pure core, thin I/O" for testable logic ✅
Decision logic is extracted into pure functions unit-tested without a DB, with DB I/O kept
thin around them: `deadlineEngine.computeDeadline`, `riskScore.scoreRisk`,
`holdEngine.planHoldChanges`, `legalReview.ruleSetsPermitSend`. New domain logic should
follow this shape so it can be locked by fast tests. _(2026-06-22)_

## ED-06 — The repo is the single source of truth for decisions ✅
See the banner above. Durable decisions land in-repo; the cowork project is not visible to
coding sessions. _(2026-06-22)_

## ED-07 — Repo-wide formatting/lint deferred to Phase E 🔄
~210 files have Prettier drift, so a `--check` gate would be red everywhere. A deliberate
format-everything pass + ESLint config is scoped to Phase E (E3) rather than blocking
current work. _(2026-06-22)_

---

## Open / upcoming decisions ❓
These are flagged for an explicit decision in their phase (see `docs/PRODUCTION_PLAN.md`):

- **Auth model (Phase C).** Backend uses Replit OIDC + session cookies; frontend uses
  Clerk. Pick one identity system end-to-end. _(owner: TBD)_
- **Tenancy (Phase C).** Schema is multi-tenant but `orgId` is a hardcoded
  `DEFAULT_ORG_ID`. Decide single-tenant (and lock it) vs. finish per-user org scoping.
- **HELM integration contract (Phase E / E6).** Confirm the `/external/*` shapes against
  `Beacon-Fire-Protection/helm` canon once that repo is readable in-session.
