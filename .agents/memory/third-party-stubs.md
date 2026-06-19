---
name: Shippo + NotaryLive stubs
description: Both third-party clients (Shippo certified mail, NotaryLive notarization) use stub fallbacks when env vars are absent.
---

**Rule:** `lib/shippo.ts` and `lib/notarylive.ts` check for `SHIPPO_API_KEY` and `NOTARYLIVE_API_KEY` respectively. If absent, they return deterministic fake data so the full mailing/notarization flow can run in dev without real accounts.

**Why:** These are paid third-party services. Dev/test environments should not require live credentials. The stub returns realistic tracking numbers and session refs that let the backend state machine advance normally.

**How to apply:**
- Set `SHIPPO_API_KEY` in production env secrets to activate real certified-mail labels.
- Set `NOTARYLIVE_API_KEY` in production env secrets to activate real RON sessions.
- For webhook testing in dev, use `SHIPPO_WEBHOOK_SECRET` / `NOTARYLIVE_WEBHOOK_SECRET` to enable signature validation.
