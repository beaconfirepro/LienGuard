#!/usr/bin/env bash
# Create + seed the LienGuard schema on YOUR Supabase Postgres.
# Run in Git Bash from anywhere inside the LienGuard repo:  bash setup_supabase_db.sh
set -euo pipefail

# ============================================================================
# EDIT THIS LINE ONLY.
# Supabase dashboard -> Project Settings -> Database -> Connection string.
# Use the "Session pooler" URI (IPv4, port 5432), put in your DB password,
# and keep the ?sslmode=require on the end. It looks like:
#   postgresql://postgres.<project-ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
# ============================================================================
export DATABASE_URL="postgresql://postgres:Hyf9H3X4mC71DWZ9@db.sxpliuieletfwqvinbyr.supabase.co:5432/postgres?sslmode=require"

cd "$(git rev-parse --show-toplevel)"

echo "1/5  Creating tables (Drizzle push) on Supabase ..."
pnpm --filter @workspace/db run push           # if it prompts, accept creating the tables
                                                # (or use: pnpm --filter @workspace/db run push-force)

echo "2/5  Base seed (org, jurisdiction/rules, projects, streams, invoices, notices, waivers, filing, dunning, holds) ..."
pnpm --filter @workspace/db run seed

echo "3/5  Phase 5 seed (waiver approval states + mailing) ..."
( cd artifacts/api-server && pnpm dlx tsx src/scripts/seed-phase5.ts )

echo "4/5  Phase 6 seed (filed lien + release + lapsed stream) ..."
( cd artifacts/api-server && pnpm dlx tsx src/scripts/seed-phase6.ts )

echo "5/5  UAT seed (per-role users + remaining enum states) ..."
( cd artifacts/api-server && pnpm dlx tsx src/scripts/seed-uat.ts )

echo ""
echo "Done. Supabase DB created and seeded (test org: org_beacon_test_001)."
echo "Next: set the app's DATABASE_URL to this same value (Replit secret or local .env)."
