---
name: lib/db TypeScript declarations
description: lib/db must be tsc-built before api-server can typecheck cleanly.
---

The api-server tsconfig.json lists lib/db as a TypeScript project reference (`references: [{ path: "../../lib/db" }]`). If lib/db's `dist/` declarations are missing or stale, the api-server typecheck will fail with "Module '@workspace/db' has no exported member 'X'" errors.

**Fix:** Run `pnpm --filter @workspace/db exec tsc -p tsconfig.json` first to generate/refresh the declarations, then run the api-server typecheck.

**Why:** The lib/db tsconfig uses `composite: true` + `emitDeclarationOnly: true`, so it must be built once before downstream consumers can see the types.

**How to apply:** After any schema change in lib/db, always rebuild declarations before running `pnpm --filter @workspace/api-server run typecheck`.
