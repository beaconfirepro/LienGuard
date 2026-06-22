# Lien & Collections — Module 22

Standalone **React + Vite + Tailwind** build of Helm's Lien & Collections module for
Beacon Fire Protection, packaged to run on **Replit**. Design tokens, component names,
and IDs mirror Helm's `designSystem.js` so dropping this into the main app is *a move,
not a rewrite* (UI_SPEC DD-UI-1, SCOPE §12).

---

## Run on Replit

1. Create a new Repl → **Import from a folder / upload zip**, or push this folder to a GitHub repo and **Import from GitHub**.
2. Replit auto-detects Node. If it doesn't run automatically, in the Shell:
   ```bash
   npm install
   npm run dev
   ```
3. The webview opens the dev server (Vite, bound to `0.0.0.0:5173`). `vite.config.js`
   already sets `allowedHosts: true` so the Replit proxy host loads cleanly.

Run locally the same way: `npm install && npm run dev`.

---

## Design system

| Layer | File |
|---|---|
| Color / surface / radius tokens (dark-first, light-compatible) | `src/index.css` (CSS variables) |
| Token source of truth — `COLORS`, `LAYOUT`, `ANIMATION`, `ESCALATION_STAGES` | `src/config/designSystem.js` |
| Tailwind semantic colors (`bg-surface`, `text-text-dim`, `text-success`, …) | `tailwind.config.js` |
| Helpers (`cn`, `money`, `alpha`, `daysAgo`) | `src/lib/utils.js` |

**Status / severity** always pairs a brand colour with an icon **and** a label
(DD-UI-5): `success #14eba3` cleared · `warning #f59f0a` at-risk · `error #eb143f`
overdue/lapsed · `info #6366f1` active. Type/data uses **JetBrains Mono**, UI uses **DM Sans**.

### Shared components (C-01 … C-13) — `src/modules/lien_collections/components`
`StatusBadge` · `DeadlineCountdown` · `SourceDataPopover` · `PartyCard` · `MoneyCell` ·
`QueueList` · `ChecklistIndicator` · `NoticePreview` · `ApprovalGateBanner` ·
`AgingBuckets` · `ActivityTimeline` · `ResponsiveTable` · `useResponsive` / `Screen` / `Grid`.

---

## App shell (DD-UI-2 / DD-UI-4)

`layout/AppShell.jsx` recreates the Helm 4-zone shell:

```
┌ Helm core sidebar ┬ Header (global) ───────────────────────┐
│  Dashboard        ├ Sub-header (title · LP/RP toggles)      │
│  Projects         ├──────────────┬───────────────┬─────────┤
│  Scheduling       │ Module rail  │   Content      │  Queue  │
│  Partner Network  │ (sections +  │   (Outlet)     │  panel  │
│ ▸Lien &Collections│  page nav)   │                │  (RP)   │
└───────────────────┴──────────────┴───────────────┴─────────┘
```

- The **core sidebar** stays Helm's global nav; the **module rail** (col 2) is the
  module's own vertical nav with the Liens / Collections / Config section switcher.
- The **right panel** is the queue surface — pages register it with
  `useRightPanel(<Panel/>, deps)`. It auto-stacks full-width under the content when
  there isn't room for three columns, and collapses to a drawer / bottom-tab bar on phone (DD-UI-3).

## Pages (UI_SPEC §2)

`Dashboard` (P1) · `MonthlyReport` (P2) · `SendQueue` (P3) · `ProjectLienDetail` (P4) ·
`WaiverWorkspace` (P6) · `FilingWorkspace` (P7) · `CollectionsPipeline` (P8) ·
`AccountDetail` (P9) · `TenantConfig` (P10). Routes are wired in `src/App.jsx`.

**Collections (P8)** holds all overdue AR: a collapsible **call list** (who to call,
last contact, ranked by risk) plus collapsible **escalation-stage sections**. *Add to
call list* on any account adds it to the call list while keeping it in its stage section.

---

## Wiring real data

`src/modules/lien_collections/data/mock.js` is the only fake layer. Replace it with
react-query hooks (`useLienProjects`, `useMonthlyReport`, `useCollections`) that call the
DATA_MODEL §3 endpoints through `api/client.js`. Components consume plain props, so no
component changes are needed.
