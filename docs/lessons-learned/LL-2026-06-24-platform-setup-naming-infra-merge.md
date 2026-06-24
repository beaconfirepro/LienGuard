# LL — 2026-06-24 — Platform setup: naming, infra boundaries, merge mechanics

> Same session as `LL-2026-06-24-architecture-greenfield-pivot.md`, later phase. Read alongside
> that file's operating rules and `docs/USER_INSTRUCTIONS.md`. Examples below are real, from this
> session.

This phase set up the move to the greenfield build: canon docs, the cloud-session handoff, naming,
and the Supabase target. It went better than the first phase but still wasted effort in predictable
places.

## New operating rules distilled this phase (add to the binding set)

1. **Confirm naming/branding BEFORE baking names into docs, repos, or databases.** Ask early: what
   is each thing called, and is that name public or internal? Names spread fast (canon, brief,
   kickoff, repo, DB, generators) and are expensive to scrub once spread.
2. **Verify infrastructure and account boundaries before recommending a resource.** Run the
   read-only listing (orgs, projects) and state plainly what the tooling can and cannot see.
3. **Do not assume a platform feature exists.** Verify from the docs before advising, especially for
   security-relevant things (a "secrets store", an auth mode). Cite the source.
4. **Before merging, check `mergeable_state`.** If it is `behind`, update the branch first; required
   checks need an up-to-date head, or the merge is rejected.

## Where effort was wasted (honest)

| What happened | Root cause |
|---|---|
| "Beacon" was carried through the canon, brief, and kickoff (and a Supabase project name was proposed as "Beacon"), then had to be scrubbed once the model was stated: **Helm** = company + public product, **Tower** = internal foundation layer, modules separate | Did not pin the naming/branding model up front |
| Recommended reusing an existing Supabase project, then learned it was in the wrong org; recommended a "Beacon" workspace name (which is banned) | Advised before confirming org boundaries and the no-"Beacon" rule |
| Advised "put credentials in environment secrets" before confirming the platform has one | Assumed a feature (a secrets store) that does not exist on Claude Code web; env vars are visible to anyone who can edit the environment |
| A merge attempt on PR #21 was rejected | Branch was `behind` base with a required check; did not check `mergeable_state` first |

## What worked (keep doing)

- **Merge-on-green cron:** a 5-minute self-check that merges a PR once the required check passes,
  then deletes itself. Lands a PR when CI is green without hand-polling or leaving it hanging.
- **Pinning decisions as ED entries** (ED-16 for naming) so they are not re-litigated.
- **Verifying the secrets question from the docs** before answering, once prompted, instead of
  guessing.
- **Surfacing the genuinely-open items** (lien module brand, legacy "Beacon" prose) as recorded
  open decisions rather than guessing them.

## What the user could synthesize up front (would have saved the most)

- **The naming/branding model** in one paragraph: product name, company name, internal-only names,
  and which are public. This alone would have prevented the naming detour.
- **Infra constraints:** which Supabase org/account is canonical, and that "Beacon" is not used in
  product, platform, or database names (private infra like the repo and GitHub org excepted).
