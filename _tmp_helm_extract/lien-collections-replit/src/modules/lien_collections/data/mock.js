/**
 * Mock data for the standalone Replit build. In Helm these come from the
 * DATA_MODEL Section 3 endpoints via api/client.js + react-query hooks.
 * Texas fire-protection lien sample data.
 */

export const PROJECTS = [
  {
    id: "p1",
    name: "Harbor Logistics — Bay 3",
    client: "Harbor Logistics LLC",
    tier: "Tier 2",
    workflow: "Monthly Notice § 53.056",
    status: "at-risk",
    supplierRisk: true,
    parties: [
      { role: "Owner", name: "Harbor Logistics LLC", address: "4400 Cargo Way, Houston, TX 77029" },
      { role: "General Contractor", name: "Turnbull Construction", address: "912 Industrial Blvd, Houston, TX 77015" },
      { role: "Hiring Party", name: "Turnbull Construction", address: "912 Industrial Blvd, Houston, TX 77015" },
    ],
    checklist: [
      { label: "Owner legal name & address", ok: true },
      { label: "Original contractor identified", ok: true },
      { label: "Signed subcontract on file", ok: true },
      { label: "Month-1 pre-lien notice sent", ok: true },
      { label: "May monthly notice", ok: false },
      { label: "Notarized statement of account", ok: false },
    ],
    streams: [
      { month: "March 2026", amount: 38200, deadline: "Jun 15", days: -3 },
      { month: "April 2026", amount: 41300, deadline: "Jul 15", days: 27 },
      { month: "May 2026", amount: 33250, deadline: "Aug 15", days: 58 },
    ],
    timeline: [
      { text: "Hold placed — May invoice unpaid past 30 days", date: "Jun 14, 2026", color: "#eb143f" },
      { text: "Monthly notice generated for April work", date: "May 12, 2026", color: "#6366f1" },
      { text: "Heads-up email sent to Turnbull AP", date: "Apr 28, 2026", color: "#f59f0a" },
      { text: "Pre-lien notice delivered (certified)", date: "Mar 14, 2026", color: "#14eba3" },
    ],
  },
  {
    id: "p2",
    name: "Northgate Medical — Wing C",
    client: "Northgate Health System",
    tier: "Tier 2",
    workflow: "Monthly Notice § 53.056",
    status: "active",
    supplierRisk: false,
    parties: [
      { role: "Owner", name: "Northgate Health System", address: "2100 Medical Center Dr, Austin, TX 78712" },
      { role: "General Contractor", name: "Meridian Builders", address: "55 Commerce St, Austin, TX 78701" },
      { role: "Hiring Party", name: "Meridian Builders", address: "55 Commerce St, Austin, TX 78701" },
    ],
    checklist: [
      { label: "Owner legal name & address", ok: true },
      { label: "Original contractor identified", ok: true },
      { label: "Signed subcontract on file", ok: true },
      { label: "Month-1 pre-lien notice sent", ok: true },
      { label: "May monthly notice", ok: true },
    ],
    streams: [
      { month: "April 2026", amount: 52400, deadline: "Jul 15", days: 27 },
      { month: "May 2026", amount: 47800, deadline: "Aug 15", days: 58 },
    ],
    timeline: [
      { text: "May monthly notice sent (certified)", date: "Jun 10, 2026", color: "#14eba3" },
      { text: "April progress payment received", date: "May 30, 2026", color: "#14eba3" },
      { text: "Pre-lien notice delivered", date: "Apr 11, 2026", color: "#14eba3" },
    ],
  },
  {
    id: "p5",
    name: "Grandview Hotel",
    client: "Grandview Hospitality",
    tier: "Tier 2",
    workflow: "Monthly Notice § 53.056",
    status: "overdue",
    supplierRisk: false,
    parties: [
      { role: "Owner", name: "Grandview Hospitality", address: "88 Bayfront Ave, Corpus Christi, TX 78401" },
      { role: "General Contractor", name: "Coastal GC", address: "410 Shoreline Dr, Corpus Christi, TX 78402" },
      { role: "Hiring Party", name: "Coastal GC", address: "410 Shoreline Dr, Corpus Christi, TX 78402" },
    ],
    checklist: [
      { label: "Owner legal name & address", ok: true },
      { label: "Original contractor identified", ok: true },
      { label: "Month-1 pre-lien notice sent", ok: true },
      { label: "Affidavit of lien filed", ok: false },
    ],
    streams: [
      { month: "February 2026", amount: 27900, deadline: "May 15", days: -34 },
      { month: "March 2026", amount: 19200, deadline: "Jun 15", days: -3 },
    ],
    timeline: [
      { text: "Escalated to lien filing — affidavit pending", date: "Jun 16, 2026", color: "#eb143f" },
      { text: "Final demand letter sent", date: "Jun 1, 2026", color: "#f59f0a" },
      { text: "Monthly notices sent Feb–Mar", date: "Mar 14, 2026", color: "#14eba3" },
    ],
  },
];

export const ACCOUNTS = [
  { id: "a1", client: "Grandview Hospitality", amount: 47100, oldest: 124, status: "lapsed", stage: "Lien filing", risk: 92, invoices: 3, lienDeadline: "Jun 15 (overdue)", promise: false, last: 2, via: "certified mail", next: "File lien affidavit", aging: [0, 0, 19200, 27900] },
  { id: "a2", client: "Turnbull Construction", amount: 38200, oldest: 96, status: "overdue", stage: "Pre-lien notice", risk: 81, invoices: 2, lienDeadline: "Jun 15, 2026", promise: false, last: 5, via: "phone", next: "Send pre-lien notice", aging: [0, 0, 38200, 0] },
  { id: "a3", client: "Coastal GC", amount: 24800, oldest: 68, status: "overdue", stage: "Pre-lien notice", risk: 74, invoices: 2, lienDeadline: "Jul 15, 2026", promise: true, last: 1, via: "email", next: "Confirm promise-to-pay", aging: [0, 12400, 12400, 0] },
  { id: "a4", client: "Apex General", amount: 16300, oldest: 41, status: "at-risk", stage: "Soft reminder", risk: 52, invoices: 1, lienDeadline: "Jul 15, 2026", promise: false, last: 9, via: "email", next: "Second reminder call", aging: [0, 16300, 0, 0] },
  { id: "a5", client: "Vantage Construction", amount: 9400, oldest: 22, status: "at-risk", stage: "Soft reminder", risk: 38, invoices: 1, lienDeadline: "Aug 15, 2026", promise: false, last: 16, via: "phone", next: "First reminder call", aging: [9400, 0, 0, 0] },
  { id: "a6", client: "Meridian Builders", amount: 6200, oldest: 14, status: "active", stage: "Soft reminder", risk: 21, invoices: 1, lienDeadline: "—", promise: false, last: 21, via: "email", next: "Soft reminder email", aging: [6200, 0, 0, 0] },
  { id: "a7", client: "Lone Star Mall Partners", amount: 61300, oldest: 156, status: "lapsed", stage: "Agency / attorney", risk: 95, invoices: 4, lienDeadline: "Lapsed", promise: false, last: 11, via: "attorney letter", next: "Attorney follow-up", aging: [0, 0, 0, 61300] },
  { id: "a8", client: "Pinewood Developments", amount: 14200, oldest: 214, status: "overdue", stage: "Write-off", risk: 47, invoices: 1, lienDeadline: "Expired", promise: false, last: 38, via: "email", next: "Recommend write-off", aging: [0, 0, 0, 14200] },
];

// Overdue = past net-30. Collections holds all overdue AR.
export const isOverdue = (a) => a.oldest >= 31;

/** Vendor bills (A/P). Hold what Beacon owes when the client (A/R) hasn't paid. */
export const VENDOR_BILLS = [
  { id: "b1", vendor: "Ferguson Fire & Fabrication", item: "Pipe & fittings — ESFR mains", project: "Harbor Logistics — Bay 3", client: "Harbor Logistics LLC", amount: 18400, due: "Jun 30", status: "open", clientOverdue: true, clientLabel: "Client overdue 96d" },
  { id: "b2", vendor: "Victaulic", item: "Couplings & valves", project: "Harbor Logistics — Bay 3", client: "Harbor Logistics LLC", amount: 9250, due: "Jul 5", status: "open", clientOverdue: true, clientLabel: "Client overdue 96d" },
  { id: "b3", vendor: "Viking Supply", item: "Sprinkler heads", project: "Grandview Hotel", client: "Grandview Hospitality", amount: 12800, due: "Jun 28", status: "hold", clientOverdue: true, clientLabel: "Client overdue 124d" },
  { id: "b4", vendor: "Core & Main", item: "Underground tie-in", project: "Northgate Medical — Wing C", client: "Northgate Health System", amount: 22100, due: "Jul 10", status: "open", clientOverdue: false, clientLabel: "Client current" },
  { id: "b5", vendor: "Potter Electric", item: "Alarm devices", project: "Lincoln Elementary", client: "Austin ISD", amount: 6400, due: "Jul 2", status: "open", clientOverdue: false, clientLabel: "Bonded — current" },
  { id: "b6", vendor: "Ferguson Fire & Fabrication", item: "Hangers & trim", project: "Cedar Ridge Apartments", client: "Cedar Ridge Partners", amount: 14200, due: "Jun 25", status: "paid", clientOverdue: false, clientLabel: "Client paid" },
  { id: "b7", vendor: "Victaulic", item: "Riser assemblies", project: "Lone Star Mall", client: "Lone Star Mall Partners", amount: 19900, due: "Jun 20", status: "open", clientOverdue: true, clientLabel: "Rights lapsed 156d" },
];

export const AGING_TOTALS = [18400, 44900, 31600, 47100]; // 0-30 / 31-60 / 61-90 / 90+

export const DASHBOARD_KPIS = [
  { label: "Active Streams", value: 23, suffix: "", sub: "across 18 projects", color: "#6366f1" },
  { label: "At Risk · June", value: 6, suffix: "", sub: "notice due this month", color: "#f59f0a" },
  { label: "Rights Lapsed", value: 1, suffix: "", sub: "Grandview — escalate", color: "#eb143f" },
  { label: "AR Overdue", value: 142, prefix: "$", suffix: "K", sub: "6 accounts", color: "#eb143f" },
  { label: "Cleared MTD", value: 284.5, prefix: "$", suffix: "K", dec: 1, sub: "waivers issued", color: "#14eba3" },
  { label: "Avg Days to Pay", value: 47, suffix: "d", sub: "−6d vs Q1", color: "#6366f1" },
];

export const findProject = (id) => PROJECTS.find((p) => p.id === id) || PROJECTS[0];
export const findAccount = (id) => ACCOUNTS.find((a) => a.id === id) || ACCOUNTS[0];
