---
name: lib/db TypeScript declarations
description: lib/db must be tsc-built before api-server can typecheck cleanly.
---

The api-server tsconfig.json lists lib/db as a TypeScript project reference (`references: [{ path: "../../lib/db" }]`). If lib/db's `dist/` declarations are missing or stale, the api-server typecheck will fail with "Module '@workspace/db' has no exported member 'X'" errors.

**Fix:** Run `pnpm --filter @workspace/db exec tsc -p tsconfig.json` first to generate/refresh the declarations, then run the api-server typecheck.

**Why:** The lib/db tsconfig uses `composite: true` + `emitDeclarationOnly: true`, so it must be built once before downstream consumers can see the types.

**How to apply:** After any schema change in lib/db, always rebuild declarations before running `pnpm --filter @workspace/api-server run typecheck`.

**Also applies to lib/api-zod:** api-server references BOTH lib/db and lib/api-zod, and api-zod is likewise `composite` + `emitDeclarationOnly` (its `exports` point at `./src/index.ts` but consumers resolve via stale `dist/*.d.ts`). After a merge that regenerates api-zod codegen (e.g. new OpenAPI types like AuthUser), api-server typecheck fails with "Module '@workspace/api-zod' has no exported member 'X'". The one-shot fix for all lib refs at once is `pnpm run typecheck:libs` (which is just `tsc --build`) — rebuilds every composite lib decl, then api-server typechecks clean.
