---
name: Authenticated screenshots (dev session priming)
description: How to capture data-filled screenshots of the Lien & Collections app, which requires a dev session cookie.
---

The Lien & Collections frontend has no auto-login; every API call returns 401 until the `lc_session` cookie is set by visiting `GET /api/dev/session` (dev-only route, sets signed cookie for `org_beacon_test_001`, role=admin by default; `?role=pm|finance|coordinator` to simulate).

**To screenshot authenticated pages:** the `app_preview` screenshot browser persists cookies across calls. First call `screenshot(path="/api/dev/session")` to set the cookie (returns JSON), then screenshot the actual app pages — they now render with data. Without this priming step, every page shows "Unauthorized — valid session required".

**Why:** the preview proxy serves the app at localhost:80 root; the dev session cookie is set on that same origin, so a prior navigation to `/api/dev/session` carries into subsequent app-preview screenshots.
