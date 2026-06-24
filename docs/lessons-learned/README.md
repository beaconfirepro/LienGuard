# Lessons Learned

One file per Claude Code session. Each captures what worked, what wasted time/tokens, and the
operating rules that follow — so the next session is faster and less error-prone. **Read at least
the most recent file at the start of every session** (wired from `CLAUDE.md`).

## Naming convention

```
LL-<YYYY-MM-DD>-<topic>-<slug>.md
```

- **`LL`** — fixed prefix (Lessons Learned).
- **`YYYY-MM-DD`** — the session date (sorts chronologically).
- **`topic`** — the work area, one or two kebab words (e.g. `architecture`, `auth`, `billing`).
- **`slug`** — a short distinctive descriptor of the session's arc (e.g. `greenfield-pivot`).

**Example**
```
LL-2026-06-24-architecture-greenfield-pivot.md
```

## Rules

- **Append, never overwrite.** Each session gets its own file; the history of mistakes is the value.
- Recurring lessons graduate into the "operating rules" block (kept consistent across files) and,
  when they should bind everyone, into `CLAUDE.md`.

## Index

| Date | Topic | File |
|------|-------|------|
| 2026-06-24 | Architecture — greenfield pivot | `LL-2026-06-24-architecture-greenfield-pivot.md` |
