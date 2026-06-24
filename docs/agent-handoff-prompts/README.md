# Agent Handoff Prompts

Self-contained briefs and kickoff prompts for **starting a new Claude Code session** (or handing
work to another agent) without losing context. Each handoff is a pair: a **brief** (everything
the new session needs to know) and a **kickoff** (the prompt you paste to start it).

## Naming convention

```
<NN>-<topic-slug>-<artifact>.md
```

- **`NN`** — two-digit handoff number (`01`, `02`, …). Groups the pair and orders them in time.
- **`topic-slug`** — short kebab-case description of the work (e.g. `beacon-platform-greenfield`).
- **`artifact`** — one of:
  - `brief` — the context document (read this to get up to speed).
  - `kickoff` — the prompt to paste into the new session.
  - (`notes`, `status`, … if a handoff needs more.)

**Examples**
```
01-beacon-platform-greenfield-brief.md
01-beacon-platform-greenfield-kickoff.md
```
The shared `01-...-greenfield-` prefix means "these belong together."

## How to use a handoff

1. Make sure both files are reachable by the new session — copy the pair into the **target
   repo** (the brief is written to be self-contained, so a paste also works).
2. Start the new session and **paste the `kickoff`** prompt.
3. The kickoff tells the agent to read the `brief` (and the canon docs) before doing anything.

## Index

| # | Topic | Brief | Kickoff | Date |
|---|-------|-------|---------|------|
| 01 | Beacon platform — greenfield build | `01-beacon-platform-greenfield-brief.md` | `01-beacon-platform-greenfield-kickoff.md` | 2026-06-24 |
