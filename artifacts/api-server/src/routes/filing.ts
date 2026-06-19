/**
 * filing.ts — Lien Filing & Release routes (Phase 6).
 *
 * POST   /filing/:streamId/escalate   compliance check (all notices on time)
 * POST   /filing/:streamId/affidavit  consolidated § 53.054 affidavit package
 * GET    /filing/stream/:streamId     get filing + release for a stream (UI)
 * GET    /filing/:id/affidavit        serve affidavit PDF on demand
 * POST   /filing/:id/export           hand off to Texas Easy Lien
 * POST   /filing/:id/record           record county filing + compute deadlines
 * POST   /filing/:id/post-notice      Shippo certified-mail to owner + GC
 * POST   /filing/:id/release          create/update § 53.152 lien release
 */

import { Router } from "express";
import PDFDocument from "pdfkit";
import { db } from "@workspace/db";
import {
  lienFilingsTable,
  lienReleasesTable,
  lienStreamsTable,
  lienProjectsTable,
  workMonthsTable,
  noticesTable,
  lienDeadlinesTable,
  mailingRecordsTable,
  projectPartyLinksTable,
} from "@workspace/db";
import { eq, and, inArray, lt } from "drizzle-orm";
import { requireSession, getSession } from "../lib/session";
import { createCertifiedMailLabel } from "../lib/shippo";
import { addBusinessDays } from "../lib/deadlineEngine";

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getStreamWithProject(streamId: string, orgId: string) {
  const [stream] = await db
    .select()
    .from(lienStreamsTable)
    .where(and(eq(lienStreamsTable.id, streamId), eq(lienStreamsTable.orgId, orgId)))
    .limit(1);
  if (!stream) return null;

  const [project] = await db
    .select()
    .from(lienProjectsTable)
    .where(eq(lienProjectsTable.id, stream.lienProjectId))
    .limit(1);

  return { stream, project: project ?? null };
}

async function getFilingById(filingId: string, orgId: string) {
  const [filing] = await db
    .select()
    .from(lienFilingsTable)
    .where(and(eq(lienFilingsTable.id, filingId), eq(lienFilingsTable.orgId, orgId)))
    .limit(1);
  return filing ?? null;
}

/** Adds exactly N calendar days to a date (UTC). */
function addCalendarDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// ---------------------------------------------------------------------------
// GET /filing/stream/:streamId — fetch filing + release for a stream (UI)
// Must be declared BEFORE /:id/* routes.
// ---------------------------------------------------------------------------

router.get("/filing/stream/:streamId", requireSession, async (req, res) => {
  const { orgId } = getSession(req);
  const streamId = req.params["streamId"] as string;

  const ctx = await getStreamWithProject(streamId, orgId);
  if (!ctx) { res.status(404).json({ error: "Stream not found" }); return; }

  const [filing] = await db
    .select()
    .from(lienFilingsTable)
    .where(and(eq(lienFilingsTable.lienStreamId, streamId), eq(lienFilingsTable.orgId, orgId)))
    .limit(1);

  let release = null;
  if (filing) {
    const [r] = await db
      .select()
      .from(lienReleasesTable)
      .where(and(eq(lienReleasesTable.filingId, filing.id), eq(lienReleasesTable.orgId, orgId)))
      .limit(1);
    release = r ?? null;
  }

  const workMonths = await db
    .select()
    .from(workMonthsTable)
    .where(and(eq(workMonthsTable.lienStreamId, streamId), eq(workMonthsTable.orgId, orgId)));

  const notices = await db
    .select()
    .from(noticesTable)
    .where(and(eq(noticesTable.lienStreamId, streamId), eq(noticesTable.orgId, orgId)));

  res.json({
    stream: ctx.stream,
    project: ctx.project,
    filing: filing ?? null,
    release,
    workMonths,
    notices,
  });
});

// ---------------------------------------------------------------------------
// POST /filing/:streamId/escalate — compliance check
// ---------------------------------------------------------------------------

router.post("/filing/:streamId/escalate", requireSession, async (req, res) => {
  const { orgId } = getSession(req);
  const streamId = req.params["streamId"] as string;

  const ctx = await getStreamWithProject(streamId, orgId);
  if (!ctx) { res.status(404).json({ error: "Stream not found" }); return; }

  const workMonths = await db
    .select()
    .from(workMonthsTable)
    .where(and(eq(workMonthsTable.lienStreamId, streamId), eq(workMonthsTable.orgId, orgId)));

  if (workMonths.length === 0) {
    res.json({ ok: true, gaps: [], message: "No work months to check." });
    return;
  }

  const workMonthIds = workMonths.map((wm) => wm.id);

  const deadlines = await db
    .select()
    .from(lienDeadlinesTable)
    .where(
      and(
        inArray(lienDeadlinesTable.workMonthId, workMonthIds),
        eq(lienDeadlinesTable.orgId, orgId),
      ),
    );

  const notices = await db
    .select()
    .from(noticesTable)
    .where(
      and(
        eq(noticesTable.lienStreamId, streamId),
        eq(noticesTable.orgId, orgId),
      ),
    );

  const gaps: Array<{
    workMonthId: string;
    month: string;
    deadlineId: string;
    deadlineDate: string;
    issue: string;
    noticeSentAt: string | null;
  }> = [];

  for (const wm of workMonths) {
    const noticeDeadlines = deadlines.filter(
      (d) => d.workMonthId === wm.id && d.ruleKind === "notice",
    );
    const wmNotices = notices.filter((n) => n.workMonthId === wm.id);
    const sentNotice = wmNotices.find((n) => n.status === "sent" || n.status === "delivered");

    for (const dl of noticeDeadlines) {
      if (!sentNotice) {
        gaps.push({
          workMonthId: wm.id,
          month: new Date(wm.month).toISOString().slice(0, 7),
          deadlineId: dl.id,
          deadlineDate: new Date(dl.adjustedDate).toISOString().slice(0, 10),
          issue: "No statutory notice was sent for this work month.",
          noticeSentAt: null,
        });
      } else if (
        sentNotice.sentAt &&
        new Date(sentNotice.sentAt) > new Date(dl.adjustedDate)
      ) {
        gaps.push({
          workMonthId: wm.id,
          month: new Date(wm.month).toISOString().slice(0, 7),
          deadlineId: dl.id,
          deadlineDate: new Date(dl.adjustedDate).toISOString().slice(0, 10),
          issue: `Notice sent after deadline (sent ${new Date(sentNotice.sentAt).toISOString().slice(0, 10)}).`,
          noticeSentAt: new Date(sentNotice.sentAt).toISOString().slice(0, 10),
        });
      }
    }
  }

  // Update/create the LienFiling record at compliance_check status.
  const [existing] = await db
    .select()
    .from(lienFilingsTable)
    .where(and(eq(lienFilingsTable.lienStreamId, streamId), eq(lienFilingsTable.orgId, orgId)))
    .limit(1);

  if (!existing) {
    await db.insert(lienFilingsTable).values({
      orgId,
      lienStreamId: streamId,
      status: "compliance_check",
    });
  } else if (existing.status === "not_filed") {
    await db
      .update(lienFilingsTable)
      .set({ status: "compliance_check", updatedAt: new Date() })
      .where(eq(lienFilingsTable.id, existing.id));
  }

  // Advance stream to "filing" status if not already further along.
  const { stream } = ctx;
  if (stream.status === "open" || stream.status === "at_risk" || stream.status === "notice_active") {
    await db
      .update(lienStreamsTable)
      .set({ status: "filing", updatedAt: new Date() })
      .where(eq(lienStreamsTable.id, streamId));
  }

  res.json({ ok: gaps.length === 0, gaps });
});

// ---------------------------------------------------------------------------
// POST /filing/:streamId/affidavit — generate § 53.054 consolidated affidavit
// ---------------------------------------------------------------------------

router.post("/filing/:streamId/affidavit", requireSession, async (req, res) => {
  const { orgId } = getSession(req);
  const streamId = req.params["streamId"] as string;

  const ctx = await getStreamWithProject(streamId, orgId);
  if (!ctx) { res.status(404).json({ error: "Stream not found" }); return; }
  const { stream, project } = ctx;

  const workMonths = await db
    .select()
    .from(workMonthsTable)
    .where(
      and(
        eq(workMonthsTable.lienStreamId, streamId),
        eq(workMonthsTable.orgId, orgId),
      ),
    );

  const overdueMonths = workMonths.filter((wm) => wm.derivedOverdue && !wm.clearedFlag);

  // Upsert LienFiling at affidavit_draft.
  let [filing] = await db
    .select()
    .from(lienFilingsTable)
    .where(and(eq(lienFilingsTable.lienStreamId, streamId), eq(lienFilingsTable.orgId, orgId)))
    .limit(1);

  const stubDocUrl = `generated://filing/${streamId}/affidavit.pdf`;

  if (!filing) {
    const [inserted] = await db
      .insert(lienFilingsTable)
      .values({
        orgId,
        lienStreamId: streamId,
        status: "affidavit_draft",
        affidavitDocUrl: stubDocUrl,
      })
      .returning();
    filing = inserted;
  } else {
    const [updated] = await db
      .update(lienFilingsTable)
      .set({ status: "affidavit_draft", affidavitDocUrl: stubDocUrl, updatedAt: new Date() })
      .where(eq(lienFilingsTable.id, filing.id))
      .returning();
    filing = updated;
  }

  res.json({
    filing,
    overdueMonths: overdueMonths.map((wm) => ({
      id: wm.id,
      month: new Date(wm.month).toISOString().slice(0, 7),
      claimAmount: null,
    })),
    projectName: project?.cachedProjectName ?? null,
    county: project?.county ?? null,
    affidavitDocUrl: stubDocUrl,
    pdfUrl: `/api/filing/${filing.id}/affidavit`,
  });
});

// ---------------------------------------------------------------------------
// GET /filing/:id/affidavit — serve affidavit PDF on demand
// ---------------------------------------------------------------------------

router.get("/filing/:id/affidavit", requireSession, async (req, res) => {
  const { orgId } = getSession(req);
  const filingId = req.params["id"] as string;

  const filing = await getFilingById(filingId, orgId);
  if (!filing) { res.status(404).json({ error: "Filing not found" }); return; }

  const [stream] = await db
    .select()
    .from(lienStreamsTable)
    .where(eq(lienStreamsTable.id, filing.lienStreamId))
    .limit(1);

  const [project] = stream
    ? await db
        .select()
        .from(lienProjectsTable)
        .where(eq(lienProjectsTable.id, stream.lienProjectId))
        .limit(1)
    : [];

  const workMonths = await db
    .select()
    .from(workMonthsTable)
    .where(
      and(
        eq(workMonthsTable.lienStreamId, filing.lienStreamId),
        eq(workMonthsTable.orgId, orgId),
      ),
    );

  const overdueMonths = workMonths.filter((wm) => wm.derivedOverdue && !wm.clearedFlag);

  const notices = await db
    .select()
    .from(noticesTable)
    .where(and(eq(noticesTable.lienStreamId, filing.lienStreamId), eq(noticesTable.orgId, orgId)));

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="affidavit-${filing.lienStreamId.slice(0, 8)}.pdf"`,
  );

  const doc = new PDFDocument({ margin: 72 });
  doc.pipe(res);

  // Title
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("AFFIDAVIT OF MECHANIC'S LIEN", { align: "center" })
    .moveDown(0.5);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text("Texas Property Code § 53.054", { align: "center" })
    .moveDown(1);

  // Claimant
  doc.fontSize(11).font("Helvetica-Bold").text("Claimant:").font("Helvetica");
  doc.text("Beacon Fire Protection");
  doc.text("1000 Industrial Blvd, Austin, TX 78744").moveDown(1);

  // Property
  doc.font("Helvetica-Bold").text("Property:").font("Helvetica");
  doc.text(project?.legalPropertyAddress ?? "(property address not set)");
  doc.text(`County: ${project?.county ?? filing.county ?? "(county not set)"}`).moveDown(1);

  // Overdue months
  doc.font("Helvetica-Bold").text("Claim for Unpaid Labor and Materials:").font("Helvetica");
  doc.moveDown(0.5);

  if (overdueMonths.length === 0) {
    doc.text("No overdue work months found.");
  } else {
    for (const wm of overdueMonths) {
      const month = new Date(wm.month).toISOString().slice(0, 7);
      const relatedNotice = notices.find((n) => n.workMonthId === wm.id);
      const claimAmt = relatedNotice
        ? `$${Number(relatedNotice.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        : "(amount pending)";
      const desc = relatedNotice?.workDescription ?? "Fire protection labor and materials";

      doc.text(`  Work Month: ${month}`);
      doc.text(`  Claim Amount: ${claimAmt}`);
      doc.text(`  Description: ${desc}`);
      doc.moveDown(0.5);
    }
  }

  doc.moveDown(1);

  // Filing info (if recorded)
  if (filing.filingDate) {
    doc.font("Helvetica-Bold").text("Filing Record:").font("Helvetica");
    doc.text(`Filed: ${new Date(filing.filingDate).toISOString().slice(0, 10)}`);
    doc.text(`County: ${filing.county ?? "(county)"}`);
    if (filing.recordingRef) doc.text(`Recording Reference: ${filing.recordingRef}`);
    doc.moveDown(1);
  }

  // Notarization block
  doc.moveDown(2);
  doc.font("Helvetica-Bold").text("NOTARIZATION BLOCK").font("Helvetica");
  doc.moveDown(1);
  doc.text("STATE OF TEXAS  §");
  doc.text("COUNTY OF ________________  §");
  doc.moveDown(1);
  doc.text(
    "Before me, the undersigned authority, personally appeared the affiant, " +
      "who, being by me duly sworn, deposed as stated herein.",
  );
  doc.moveDown(2);
  doc.text("Signature: _________________________________    Date: _______________");
  doc.moveDown(0.5);
  doc.text("Notary Public: _____________________________    My commission expires: _______________");

  doc.end();
});

// ---------------------------------------------------------------------------
// POST /filing/:id/export — hand off to Texas Easy Lien
// ---------------------------------------------------------------------------

router.post("/filing/:id/export", requireSession, async (req, res) => {
  const { orgId } = getSession(req);
  const filingId = req.params["id"] as string;

  const filing = await getFilingById(filingId, orgId);
  if (!filing) { res.status(404).json({ error: "Filing not found" }); return; }

  if (filing.status !== "affidavit_draft") {
    res.status(409).json({
      error: `Export requires status affidavit_draft; current: ${filing.status}`,
    });
    return;
  }

  const [updated] = await db
    .update(lienFilingsTable)
    .set({ status: "exported", updatedAt: new Date() })
    .where(eq(lienFilingsTable.id, filingId))
    .returning();

  res.json({ filing: updated });
});

// ---------------------------------------------------------------------------
// POST /filing/:id/record — record county filing + compute post-filing deadlines
// ---------------------------------------------------------------------------

router.post("/filing/:id/record", requireSession, async (req, res) => {
  const { orgId } = getSession(req);
  const filingId = req.params["id"] as string;

  const filing = await getFilingById(filingId, orgId);
  if (!filing) { res.status(404).json({ error: "Filing not found" }); return; }

  const { county, filingDate, recordingRef, filingFee } = req.body as {
    county?: string;
    filingDate?: string;
    recordingRef?: string;
    filingFee?: number | string;
  };

  if (!county || !filingDate || !recordingRef) {
    res.status(400).json({ error: "county, filingDate, and recordingRef are required" });
    return;
  }

  if (!["affidavit_draft", "exported", "compliance_check"].includes(filing.status)) {
    res.status(409).json({
      error: `Record requires status affidavit_draft, exported, or compliance_check; current: ${filing.status}`,
    });
    return;
  }

  const filingDateObj = new Date(filingDate);
  if (isNaN(filingDateObj.getTime())) {
    res.status(400).json({ error: "Invalid filingDate format (ISO 8601 expected)" });
    return;
  }

  // § 53.055 — 5 business days after filing date
  const postFilingNoticeDeadline = addBusinessDays(filingDateObj, 5);
  // § 53.158 — 1 year (365 days) enforcement window
  const enforcementDeadline = addCalendarDays(filingDateObj, 365);

  const [updated] = await db
    .update(lienFilingsTable)
    .set({
      county,
      filingDate: filingDateObj,
      recordingRef,
      filingFee: filingFee != null ? String(filingFee) : undefined,
      status: "filed",
      postFilingNoticeDeadline,
      enforcementDeadline,
      updatedAt: new Date(),
    })
    .where(eq(lienFilingsTable.id, filingId))
    .returning();

  // Advance stream to "filed"
  await db
    .update(lienStreamsTable)
    .set({ status: "filed", updatedAt: new Date() })
    .where(eq(lienStreamsTable.id, filing.lienStreamId));

  res.json({
    filing: updated,
    postFilingNoticeDeadline: postFilingNoticeDeadline.toISOString().slice(0, 10),
    enforcementDeadline: enforcementDeadline.toISOString().slice(0, 10),
  });
});

// ---------------------------------------------------------------------------
// POST /filing/:id/post-notice — send filed affidavit copies via Shippo
// ---------------------------------------------------------------------------

router.post("/filing/:id/post-notice", requireSession, async (req, res) => {
  const { orgId } = getSession(req);
  const filingId = req.params["id"] as string;

  const filing = await getFilingById(filingId, orgId);
  if (!filing) { res.status(404).json({ error: "Filing not found" }); return; }

  if (filing.status !== "filed") {
    res.status(409).json({
      error: `Post-notice requires status filed; current: ${filing.status}`,
    });
    return;
  }

  const [stream] = await db
    .select()
    .from(lienStreamsTable)
    .where(eq(lienStreamsTable.id, filing.lienStreamId))
    .limit(1);

  const parties = stream
    ? await db
        .select()
        .from(projectPartyLinksTable)
        .where(
          and(
            eq(projectPartyLinksTable.lienProjectId, stream.lienProjectId),
            eq(projectPartyLinksTable.orgId, orgId),
            inArray(projectPartyLinksTable.partyRelationType, ["owner", "original_contractor"]),
          ),
        )
    : [];

  // § 53.055 requires certified notice to BOTH the owner AND the original contractor.
  // Verify both required party types are present before proceeding.
  const ownerParty = parties.find((p) => p.partyRelationType === "owner");
  const gcParty = parties.find((p) => p.partyRelationType === "original_contractor");
  const missingTypes: string[] = [];
  if (!ownerParty) missingTypes.push("owner");
  if (!gcParty) missingTypes.push("original_contractor");

  if (missingTypes.length > 0) {
    res.status(422).json({
      error:
        `Missing required party type(s): ${missingTypes.join(", ")}. ` +
        "§ 53.055 requires certified notice to both the owner and the original contractor. " +
        "Add the missing project parties before sending post-filing notice.",
      missingPartyTypes: missingTypes,
    });
    return;
  }

  const mailingResults: Array<{
    partyId: string;
    partyType: string;
    partyName: string;
    trackingNumber: string;
    labelUrl: string;
  }> = [];
  const failedParties: Array<{ partyId: string; partyType: string; reason: string }> = [];

  for (const party of parties) {
    try {
      const label = await createCertifiedMailLabel(
        {
          name: party.cachedLegalName,
          street1: party.cachedMailingAddress ?? "Unknown Address",
        },
        `filing-${filingId}-${party.id}`,
      );
      mailingResults.push({
        partyId: party.id,
        partyType: party.partyRelationType,
        partyName: party.cachedLegalName,
        trackingNumber: label.trackingNumber,
        labelUrl: label.labelUrl,
      });
    } catch (err) {
      failedParties.push({
        partyId: party.id,
        partyType: party.partyRelationType,
        reason: err instanceof Error ? err.message : "Shippo label creation failed",
      });
    }
  }

  // If any required recipient failed, return an error without advancing status.
  if (failedParties.length > 0) {
    res.status(502).json({
      error: "Certified mail label generation failed for one or more required recipients. " +
        "Filing status was NOT advanced. Resolve the issue and retry.",
      failedParties,
      succeeded: mailingResults,
    });
    return;
  }

  // Store the primary mailing record for the filing.
  // Schema has a unique constraint on filing_id (one record per filing);
  // all recipients' tracking numbers are returned in the response for auditability.
  const primaryResult = mailingResults[0];
  if (primaryResult) {
    await db
      .insert(mailingRecordsTable)
      .values({
        orgId,
        filingId,
        provider: "shippo",
        trackingNumber: primaryResult.trackingNumber,
        labelUrl: primaryResult.labelUrl,
        sentDate: new Date(),
      })
      .onConflictDoNothing();
  }

  // Only advance status once all required recipients are confirmed mailed.
  const [updated] = await db
    .update(lienFilingsTable)
    .set({ status: "post_filing_notice_sent", updatedAt: new Date() })
    .where(eq(lienFilingsTable.id, filingId))
    .returning();

  res.json({ filing: updated, mailings: mailingResults });
});

// ---------------------------------------------------------------------------
// POST /filing/:id/release — create/update § 53.152 lien release
// ---------------------------------------------------------------------------

router.post("/filing/:id/release", requireSession, async (req, res) => {
  const { orgId } = getSession(req);
  const filingId = req.params["id"] as string;

  const filing = await getFilingById(filingId, orgId);
  if (!filing) { res.status(404).json({ error: "Filing not found" }); return; }

  if (!["filed", "post_filing_notice_sent"].includes(filing.status)) {
    res.status(409).json({
      error: `Release requires a filed lien (status: filed or post_filing_notice_sent); current: ${filing.status}`,
    });
    return;
  }

  const { status, signedDate, filingConfirmation } = req.body as {
    status?: string;
    signedDate?: string;
    filingConfirmation?: string;
  };

  const validStatuses = ["requested", "generated", "signed", "filed"];
  const releaseStatus = (validStatuses.includes(status ?? "") ? status : "requested") as
    | "requested"
    | "generated"
    | "signed"
    | "filed";

  // Upsert release
  const [existing] = await db
    .select()
    .from(lienReleasesTable)
    .where(and(eq(lienReleasesTable.filingId, filingId), eq(lienReleasesTable.orgId, orgId)))
    .limit(1);

  let release;
  if (!existing) {
    const [inserted] = await db
      .insert(lienReleasesTable)
      .values({
        orgId,
        filingId,
        status: releaseStatus,
        requestedAt: new Date(),
        signedDate: signedDate ? new Date(signedDate) : undefined,
        filingConfirmation: filingConfirmation ?? undefined,
      })
      .returning();
    release = inserted;
  } else {
    const [updated] = await db
      .update(lienReleasesTable)
      .set({
        status: releaseStatus,
        signedDate: signedDate ? new Date(signedDate) : existing.signedDate,
        filingConfirmation: filingConfirmation ?? existing.filingConfirmation,
        updatedAt: new Date(),
      })
      .where(eq(lienReleasesTable.id, existing.id))
      .returning();
    release = updated;
  }

  // If the release is "filed", advance the stream to "released"
  if (releaseStatus === "filed") {
    await db
      .update(lienStreamsTable)
      .set({ status: "released", updatedAt: new Date() })
      .where(eq(lienStreamsTable.id, filing.lienStreamId));
  }

  res.json({ release, filing });
});

export default router;
