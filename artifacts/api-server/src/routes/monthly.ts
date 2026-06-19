/**
 * monthly.ts — Monthly workflow routes (Phase 4).
 *
 * POST /monthly/run          1st-of-month: select at-risk, flag supplier risk, pre-generate drafts
 * GET  /monthly/report       monthly lien report rows grouped by project/stream
 * GET  /monthly/send-queue   notices in draft/approved status for the 10th/11th send window
 * POST /monthly/heads-up     log a courtesy heads-up as a CollectionActivity
 */

import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  lienDeadlinesTable,
  workMonthsTable,
  lienStreamsTable,
  lienProjectsTable,
  projectPartyLinksTable,
  noticesTable,
  noticeRecipientsTable,
  invoiceLinksTable,
  supplierNoticeRisksTable,
  collectionActivitiesTable,
  collectionAccountsTable,
  linkedClientsTable,
} from "@workspace/db";
import { eq, and, gte, lt, inArray, or, isNull } from "drizzle-orm";
import { requireSession, getSession } from "../lib/session";

const router = Router();
router.use(requireSession);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function monthBounds(dateStr?: string): { start: Date; end: Date } {
  const ref = dateStr ? new Date(dateStr + "-01") : new Date();
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  return { start, end };
}

function fmtMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// POST /monthly/run
// ---------------------------------------------------------------------------

router.post("/run", async (req, res) => {
  const { orgId } = getSession(req);
  const { month } = req.query as { month?: string };
  const { start, end } = monthBounds(month);

  // 1. Find notice deadlines falling in the target month.
  const deadlines = await db
    .select({
      id: lienDeadlinesTable.id,
      workMonthId: lienDeadlinesTable.workMonthId,
      adjustedDate: lienDeadlinesTable.adjustedDate,
    })
    .from(lienDeadlinesTable)
    .where(
      and(
        eq(lienDeadlinesTable.orgId, orgId),
        eq(lienDeadlinesTable.ruleKind, "notice"),
        gte(lienDeadlinesTable.adjustedDate, start),
        lt(lienDeadlinesTable.adjustedDate, end),
      ),
    );

  if (!deadlines.length) {
    res.json({ created: 0, skipped: 0, supplierRisksFlagged: 0, message: "No notice deadlines found for this month." });
    return;
  }

  const workMonthIds = deadlines.map((d) => d.workMonthId!).filter(Boolean);

  // 2. Load work months that are overdue and not cleared.
  const workMonths = await db
    .select()
    .from(workMonthsTable)
    .where(
      and(
        eq(workMonthsTable.orgId, orgId),
        inArray(workMonthsTable.id, workMonthIds),
        eq(workMonthsTable.derivedOverdue, true),
        eq(workMonthsTable.clearedFlag, false),
      ),
    );

  const atRiskWorkMonthIds = new Set(workMonths.map((w) => w.id));

  // 3. Load streams for the at-risk work months.
  const streamIds = [...new Set(workMonths.map((w) => w.lienStreamId))];
  const streams = streamIds.length
    ? await db
        .select()
        .from(lienStreamsTable)
        .where(and(eq(lienStreamsTable.orgId, orgId), inArray(lienStreamsTable.id, streamIds)))
    : [];

  const streamMap = new Map(streams.map((s) => [s.id, s]));

  // 4. Load projects for streams.
  const projectIds = [...new Set(streams.map((s) => s.lienProjectId))];
  const projects = projectIds.length
    ? await db
        .select()
        .from(lienProjectsTable)
        .where(and(eq(lienProjectsTable.orgId, orgId), inArray(lienProjectsTable.id, projectIds)))
    : [];

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // 5. Load parties (owner + original_contractor) for projects.
  const partiesByProject = new Map<string, { recipientType: string; legalName: string; mailingAddress: string }[]>();
  if (projectIds.length) {
    const parties = await db
      .select()
      .from(projectPartyLinksTable)
      .where(
        and(
          eq(projectPartyLinksTable.orgId, orgId),
          inArray(projectPartyLinksTable.lienProjectId, projectIds),
        ),
      );
    for (const p of parties) {
      if (p.partyRelationType !== "owner" && p.partyRelationType !== "original_contractor") continue;
      const list = partiesByProject.get(p.lienProjectId) ?? [];
      list.push({
        recipientType: p.partyRelationType,
        legalName: p.cachedLegalName,
        mailingAddress: p.cachedMailingAddress ?? "",
      });
      partiesByProject.set(p.lienProjectId, list);
    }
  }

  // 6. Check which stream+workMonth combos already have a notice.
  const existingNotices = streamIds.length
    ? await db
        .select({ lienStreamId: noticesTable.lienStreamId, workMonthId: noticesTable.workMonthId })
        .from(noticesTable)
        .where(and(eq(noticesTable.orgId, orgId), inArray(noticesTable.lienStreamId, streamIds)))
    : [];

  const existingKeys = new Set(
    existingNotices.map((n) => `${n.lienStreamId}:${n.workMonthId ?? ""}`),
  );

  // 7. Create draft notices for at-risk work months that don't have one yet.
  let created = 0;
  let skipped = 0;

  for (const wm of workMonths) {
    if (!atRiskWorkMonthIds.has(wm.id)) continue;
    const stream = streamMap.get(wm.lienStreamId);
    if (!stream) continue;
    const project = projectMap.get(stream.lienProjectId);
    if (!project) continue;

    const key = `${stream.id}:${wm.id}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    // Determine notice type.
    const noticeType =
      project.lienWorkflowType === "commercial_sub" ? "statutory_claim" : "statutory_claim";

    // Determine claim amount from invoice link on work month.
    let claimAmount = "0.00";
    if (wm.invoiceLinkId) {
      const [inv] = await db
        .select({ amount: invoiceLinksTable.amount })
        .from(invoiceLinksTable)
        .where(and(eq(invoiceLinksTable.id, wm.invoiceLinkId), eq(invoiceLinksTable.orgId, orgId)))
        .limit(1);
      if (inv) claimAmount = String(inv.amount);
    }

    const noticeId = randomUUID();
    await db.insert(noticesTable).values({
      id: noticeId,
      orgId,
      lienStreamId: stream.id,
      workMonthId: wm.id,
      noticeType,
      status: "draft",
      claimAmount,
      monthListed: wm.month,
    });

    // Create recipient records from parties.
    const parties = partiesByProject.get(project.id) ?? [];
    for (const party of parties) {
      await db.insert(noticeRecipientsTable).values({
        id: randomUUID(),
        orgId,
        noticeId,
        recipientType: party.recipientType as "owner" | "original_contractor",
        legalName: party.legalName,
        mailingAddress: party.mailingAddress,
      });
    }

    created++;
  }

  // 8. Flag supplier notice risks: supplier deadline before Beacon's notice deadline same month.
  let supplierRisksFlagged = 0;
  if (projectIds.length) {
    const supplierInvoices = await db
      .select()
      .from(invoiceLinksTable)
      .where(
        and(
          eq(invoiceLinksTable.orgId, orgId),
          eq(invoiceLinksTable.isSupplierInvoice, true),
          inArray(invoiceLinksTable.lienProjectId, projectIds),
        ),
      );

    for (const inv of supplierInvoices) {
      if (!inv.lienProjectId) continue;
      // Find the beacon deadline for the same project/month.
      const beaconStream = streams.find((s) => s.lienProjectId === inv.lienProjectId);
      if (!beaconStream) continue;

      // Find the notice deadline for the stream in target month.
      const dl = deadlines.find((d) => {
        const wm = workMonths.find((w) => w.id === d.workMonthId);
        return wm?.lienStreamId === beaconStream.id;
      });
      if (!dl) continue;

      const supplierDue = new Date(inv.dueDate);
      const beaconDue = dl.adjustedDate;

      if (supplierDue <= beaconDue) {
        // Check if risk already exists.
        const [existing] = await db
          .select({ id: supplierNoticeRisksTable.id })
          .from(supplierNoticeRisksTable)
          .where(
            and(
              eq(supplierNoticeRisksTable.orgId, orgId),
              eq(supplierNoticeRisksTable.invoiceLinkId, inv.id),
            ),
          )
          .limit(1);

        if (!existing) {
          await db.insert(supplierNoticeRisksTable).values({
            id: randomUUID(),
            orgId,
            lienProjectId: inv.lienProjectId,
            invoiceLinkId: inv.id,
            status: "flagged",
            supplierDeadline: supplierDue,
            beaconDeadline: beaconDue,
            monthAffected: start,
          });
          supplierRisksFlagged++;
        }
      }
    }
  }

  res.json({
    month: fmtMonth(start),
    created,
    skipped,
    supplierRisksFlagged,
    atRiskStreams: atRiskWorkMonthIds.size,
  });
});

// ---------------------------------------------------------------------------
// GET /monthly/report?month=YYYY-MM
// ---------------------------------------------------------------------------

router.get("/report", async (req, res) => {
  const { orgId } = getSession(req);
  const { month } = req.query as { month?: string };
  const { start, end } = monthBounds(month);

  // Find notice deadlines in the target month.
  const deadlines = await db
    .select()
    .from(lienDeadlinesTable)
    .where(
      and(
        eq(lienDeadlinesTable.orgId, orgId),
        eq(lienDeadlinesTable.ruleKind, "notice"),
        gte(lienDeadlinesTable.adjustedDate, start),
        lt(lienDeadlinesTable.adjustedDate, end),
      ),
    );

  if (!deadlines.length) {
    res.json({ month: fmtMonth(start), rows: [] });
    return;
  }

  const workMonthIds = deadlines.map((d) => d.workMonthId!).filter(Boolean);

  const workMonths = await db
    .select()
    .from(workMonthsTable)
    .where(and(eq(workMonthsTable.orgId, orgId), inArray(workMonthsTable.id, workMonthIds)));

  const wmMap = new Map(workMonths.map((w) => [w.id, w]));

  const streamIds = [...new Set(workMonths.map((w) => w.lienStreamId))];
  if (!streamIds.length) {
    res.json({ month: fmtMonth(start), rows: [] });
    return;
  }

  const streams = await db
    .select()
    .from(lienStreamsTable)
    .where(and(eq(lienStreamsTable.orgId, orgId), inArray(lienStreamsTable.id, streamIds)));

  const streamMap = new Map(streams.map((s) => [s.id, s]));

  const projectIds = [...new Set(streams.map((s) => s.lienProjectId))];
  const projects = await db
    .select()
    .from(lienProjectsTable)
    .where(and(eq(lienProjectsTable.orgId, orgId), inArray(lienProjectsTable.id, projectIds)));

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // Load notices for these streams.
  const notices = await db
    .select()
    .from(noticesTable)
    .where(and(eq(noticesTable.orgId, orgId), inArray(noticesTable.lienStreamId, streamIds)));

  // Group notices by stream+workMonth.
  const noticeMap = new Map<string, typeof notices[0]>();
  for (const n of notices) {
    const key = `${n.lienStreamId}:${n.workMonthId ?? ""}`;
    // Prefer highest-status notice (sent > approved > draft).
    const STATUS_ORDER: Record<string, number> = { sent: 3, delivered: 4, approved: 2, draft: 1 };
    const existing = noticeMap.get(key);
    if (!existing || (STATUS_ORDER[n.status] ?? 0) > (STATUS_ORDER[existing.status] ?? 0)) {
      noticeMap.set(key, n);
    }
  }

  // Load supplier risks for these projects.
  const supplierRisks = projectIds.length
    ? await db
        .select()
        .from(supplierNoticeRisksTable)
        .where(
          and(
            eq(supplierNoticeRisksTable.orgId, orgId),
            inArray(supplierNoticeRisksTable.lienProjectId, projectIds),
            gte(supplierNoticeRisksTable.monthAffected, start),
            lt(supplierNoticeRisksTable.monthAffected, end),
          ),
        )
    : [];

  const supplierRiskSet = new Set(supplierRisks.map((r) => r.lienProjectId));

  // Build rows.
  const rows = deadlines.map((dl) => {
    const wm = wmMap.get(dl.workMonthId!);
    if (!wm) return null;
    const stream = streamMap.get(wm.lienStreamId);
    if (!stream) return null;
    const project = projectMap.get(stream.lienProjectId);
    if (!project) return null;

    const key = `${stream.id}:${wm.id}`;
    const notice = noticeMap.get(key) ?? null;

    return {
      deadlineId: dl.id,
      projectId: project.id,
      projectName: project.cachedProjectName ?? project.hubspotProjectId,
      streamId: stream.id,
      workStream: stream.workStream,
      contractorTier: project.contractorTier,
      lienWorkflowType: project.lienWorkflowType,
      workMonthId: wm.id,
      workMonth: wm.month,
      derivedOverdue: wm.derivedOverdue,
      clearedFlag: wm.clearedFlag,
      noticeDeadline: dl.adjustedDate,
      supplierRisk: supplierRiskSet.has(project.id),
      streamStatus: stream.status,
      notice: notice
        ? {
            id: notice.id,
            type: notice.noticeType,
            status: notice.status,
            claimAmount: notice.claimAmount,
          }
        : null,
    };
  });

  res.json({
    month: fmtMonth(start),
    rows: rows.filter(Boolean),
  });
});

// ---------------------------------------------------------------------------
// GET /monthly/send-queue
// ---------------------------------------------------------------------------

router.get("/send-queue", async (req, res) => {
  const { orgId } = getSession(req);

  // Return all draft/approved notices with full context.
  const notices = await db
    .select()
    .from(noticesTable)
    .where(
      and(
        eq(noticesTable.orgId, orgId),
        or(eq(noticesTable.status, "draft"), eq(noticesTable.status, "approved")),
      ),
    );

  if (!notices.length) {
    res.json({ notices: [] });
    return;
  }

  // Load recipients.
  const noticeIds = notices.map((n) => n.id);
  const recipients = await db
    .select()
    .from(noticeRecipientsTable)
    .where(and(eq(noticeRecipientsTable.orgId, orgId), inArray(noticeRecipientsTable.noticeId, noticeIds)));

  const recipientsByNotice = new Map<string, typeof recipients>();
  for (const r of recipients) {
    const list = recipientsByNotice.get(r.noticeId) ?? [];
    list.push(r);
    recipientsByNotice.set(r.noticeId, list);
  }

  // Load streams + projects.
  const streamIds = [...new Set(notices.map((n) => n.lienStreamId))];
  const streams = await db
    .select()
    .from(lienStreamsTable)
    .where(and(eq(lienStreamsTable.orgId, orgId), inArray(lienStreamsTable.id, streamIds)));

  const streamMap = new Map(streams.map((s) => [s.id, s]));

  const projectIds = [...new Set(streams.map((s) => s.lienProjectId))];
  const projects = projectIds.length
    ? await db
        .select()
        .from(lienProjectsTable)
        .where(and(eq(lienProjectsTable.orgId, orgId), inArray(lienProjectsTable.id, projectIds)))
    : [];

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // Load notice deadlines for work months.
  const workMonthIds = notices.map((n) => n.workMonthId).filter(Boolean) as string[];
  const deadlines = workMonthIds.length
    ? await db
        .select()
        .from(lienDeadlinesTable)
        .where(
          and(
            eq(lienDeadlinesTable.orgId, orgId),
            eq(lienDeadlinesTable.ruleKind, "notice"),
            inArray(lienDeadlinesTable.workMonthId, workMonthIds),
          ),
        )
    : [];

  const deadlineByWorkMonth = new Map(deadlines.map((d) => [d.workMonthId!, d]));

  const enriched = notices.map((n) => {
    const stream = streamMap.get(n.lienStreamId);
    const project = stream ? projectMap.get(stream.lienProjectId) : undefined;
    const deadline = n.workMonthId ? deadlineByWorkMonth.get(n.workMonthId) : undefined;

    return {
      id: n.id,
      status: n.status,
      noticeType: n.noticeType,
      claimAmount: n.claimAmount,
      workDescription: n.workDescription,
      monthListed: n.monthListed,
      createdAt: n.createdAt,
      noticeDeadline: deadline?.adjustedDate ?? null,
      recipients: recipientsByNotice.get(n.id) ?? [],
      stream: stream
        ? { id: stream.id, workStream: stream.workStream, status: stream.status }
        : null,
      project: project
        ? {
            id: project.id,
            projectName: project.cachedProjectName ?? project.hubspotProjectId,
            contractorTier: project.contractorTier,
            lienWorkflowType: project.lienWorkflowType,
            county: project.county,
            legalPropertyAddress: project.legalPropertyAddress,
          }
        : null,
    };
  });

  // Sort by noticeDeadline ascending (soonest first), nulls last.
  enriched.sort((a, b) => {
    if (!a.noticeDeadline) return 1;
    if (!b.noticeDeadline) return -1;
    return new Date(a.noticeDeadline).getTime() - new Date(b.noticeDeadline).getTime();
  });

  res.json({ notices: enriched });
});

// ---------------------------------------------------------------------------
// POST /monthly/heads-up
// ---------------------------------------------------------------------------

router.post("/heads-up", async (req, res) => {
  const { orgId } = getSession(req);
  const {
    lienProjectId,
    method,
    notes,
    date,
  } = req.body as {
    lienProjectId?: string;
    method?: string;
    notes?: string;
    date?: string;
  };

  if (!lienProjectId || !method) {
    res.status(400).json({ error: "lienProjectId and method are required" });
    return;
  }

  // Find the collection account via invoice link → linked client → account.
  const [invoiceRow] = await db
    .select({ linkedClientId: invoiceLinksTable.linkedClientId })
    .from(invoiceLinksTable)
    .where(
      and(
        eq(invoiceLinksTable.orgId, orgId),
        eq(invoiceLinksTable.lienProjectId, lienProjectId),
        eq(invoiceLinksTable.isSupplierInvoice, false),
      ),
    )
    .limit(1);

  if (!invoiceRow?.linkedClientId) {
    res.status(422).json({ error: "No linked client found for this project" });
    return;
  }

  const [account] = await db
    .select({ id: collectionAccountsTable.id })
    .from(collectionAccountsTable)
    .where(
      and(
        eq(collectionAccountsTable.orgId, orgId),
        eq(collectionAccountsTable.linkedClientId, invoiceRow.linkedClientId),
      ),
    )
    .limit(1);

  if (!account) {
    res.status(422).json({ error: "No collection account found for this client" });
    return;
  }

  const activityDate = date ? new Date(date) : new Date();

  const [activity] = await db
    .insert(collectionActivitiesTable)
    .values({
      id: randomUUID(),
      orgId,
      accountId: account.id,
      method: method as "email" | "phone" | "letter" | "sms" | "portal" | "in_person",
      activityDate,
      notes: notes ?? null,
      createdByUserId: "user_coord",
    })
    .returning();

  res.status(201).json({ activity });
});

export default router;
