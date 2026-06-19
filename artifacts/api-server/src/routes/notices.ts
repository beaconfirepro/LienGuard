/**
 * notices.ts — Notice generation routes (Phase 4).
 *
 * POST  /notices              create notice (draft) from lienStreamId + workMonthId + noticeType
 * PATCH /notices/:id          edit claimAmount, workDescription, monthListed, recipients
 * POST  /notices/:id/approve  approve a draft notice
 * GET   /notices/:id/pdf      generate print-ready statutory PDF (§ 53.056 / § 53.057)
 */

import { Router } from "express";
import { randomUUID } from "crypto";
import PDFDocument from "pdfkit";
import { db } from "@workspace/db";
import {
  noticesTable,
  noticeRecipientsTable,
  workMonthsTable,
  lienStreamsTable,
  lienProjectsTable,
  projectPartyLinksTable,
  invoiceLinksTable,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireSession, getSession } from "../lib/session";

const router = Router();
router.use(requireSession);

// ---------------------------------------------------------------------------
// POST /notices — create a draft notice
// ---------------------------------------------------------------------------

router.post("/notices", async (req, res) => {
  const { orgId } = getSession(req);
  const { lienStreamId, workMonthId, noticeType } = req.body as {
    lienStreamId?: string;
    workMonthId?: string;
    noticeType?: string;
  };

  if (!lienStreamId || !noticeType) {
    res.status(400).json({ error: "lienStreamId and noticeType are required" });
    return;
  }

  if (!["early_warning", "statutory_claim", "retainage_claim"].includes(noticeType)) {
    res.status(400).json({ error: "Invalid noticeType" });
    return;
  }

  // Verify stream belongs to org.
  const [stream] = await db
    .select()
    .from(lienStreamsTable)
    .where(and(eq(lienStreamsTable.id, lienStreamId), eq(lienStreamsTable.orgId, orgId)))
    .limit(1);

  if (!stream) {
    res.status(404).json({ error: "Stream not found" });
    return;
  }

  // Load project + parties.
  const [project] = await db
    .select()
    .from(lienProjectsTable)
    .where(and(eq(lienProjectsTable.id, stream.lienProjectId), eq(lienProjectsTable.orgId, orgId)))
    .limit(1);

  const parties = await db
    .select()
    .from(projectPartyLinksTable)
    .where(
      and(
        eq(projectPartyLinksTable.lienProjectId, stream.lienProjectId),
        eq(projectPartyLinksTable.orgId, orgId),
      ),
    );

  // Determine monthListed and claimAmount from workMonth (if provided).
  let monthListed: Date = new Date();
  let claimAmount = "0.00";

  if (workMonthId) {
    const [wm] = await db
      .select()
      .from(workMonthsTable)
      .where(and(eq(workMonthsTable.id, workMonthId), eq(workMonthsTable.orgId, orgId)))
      .limit(1);

    if (wm) {
      monthListed = wm.month;
      if (wm.invoiceLinkId) {
        const [inv] = await db
          .select({ amount: invoiceLinksTable.amount })
          .from(invoiceLinksTable)
          .where(and(eq(invoiceLinksTable.id, wm.invoiceLinkId), eq(invoiceLinksTable.orgId, orgId)))
          .limit(1);
        if (inv) claimAmount = String(inv.amount);
      }
    }
  }

  const noticeId = randomUUID();

  const [notice] = await db
    .insert(noticesTable)
    .values({
      id: noticeId,
      orgId,
      lienStreamId,
      workMonthId: workMonthId ?? null,
      noticeType: noticeType as "early_warning" | "statutory_claim" | "retainage_claim",
      status: "draft",
      claimAmount,
      monthListed,
    })
    .returning();

  // Auto-create recipients from parties (owner + original_contractor only).
  const recipientRows = parties
    .filter((p) => p.partyRelationType === "owner" || p.partyRelationType === "original_contractor")
    .map((p) => ({
      id: randomUUID(),
      orgId,
      noticeId,
      recipientType: p.partyRelationType as "owner" | "original_contractor",
      legalName: p.cachedLegalName,
      mailingAddress: p.cachedMailingAddress ?? "",
    }));

  const recipients = recipientRows.length
    ? await db.insert(noticeRecipientsTable).values(recipientRows).returning()
    : [];

  res.status(201).json({ notice, recipients });
});

// ---------------------------------------------------------------------------
// PATCH /notices/:id — edit draft notice fields + recipients
// ---------------------------------------------------------------------------

router.patch("/notices/:id", async (req, res) => {
  const { orgId } = getSession(req);
  const { id } = req.params;
  const { claimAmount, workDescription, monthListed, recipients } = req.body as {
    claimAmount?: string;
    workDescription?: string;
    monthListed?: string;
    recipients?: { id?: string; recipientType: string; legalName: string; mailingAddress: string }[];
  };

  const [existing] = await db
    .select()
    .from(noticesTable)
    .where(and(eq(noticesTable.id, id), eq(noticesTable.orgId, orgId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Notice not found" });
    return;
  }

  if (existing.status === "sent" || existing.status === "delivered") {
    res.status(409).json({ error: "Cannot edit a sent or delivered notice" });
    return;
  }

  const updates: Partial<typeof existing> = {};
  if (claimAmount !== undefined) updates.claimAmount = claimAmount;
  if (workDescription !== undefined) updates.workDescription = workDescription;
  if (monthListed !== undefined) updates.monthListed = new Date(monthListed);

  const [notice] = await db
    .update(noticesTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(noticesTable.id, id), eq(noticesTable.orgId, orgId)))
    .returning();

  // Update recipients if provided.
  let updatedRecipients = null;
  if (recipients !== undefined) {
    // Delete existing recipients and recreate.
    await db
      .delete(noticeRecipientsTable)
      .where(and(eq(noticeRecipientsTable.noticeId, id), eq(noticeRecipientsTable.orgId, orgId)));

    const rows = recipients.map((r) => ({
      id: r.id ?? randomUUID(),
      orgId,
      noticeId: id,
      recipientType: r.recipientType as "owner" | "original_contractor",
      legalName: r.legalName,
      mailingAddress: r.mailingAddress,
    }));

    updatedRecipients = rows.length
      ? await db.insert(noticeRecipientsTable).values(rows).returning()
      : [];
  }

  res.json({ notice, recipients: updatedRecipients });
});

// ---------------------------------------------------------------------------
// POST /notices/:id/approve
// ---------------------------------------------------------------------------

router.post("/notices/:id/approve", async (req, res) => {
  const { orgId } = getSession(req);
  const { id } = req.params;

  const [existing] = await db
    .select()
    .from(noticesTable)
    .where(and(eq(noticesTable.id, id), eq(noticesTable.orgId, orgId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Notice not found" });
    return;
  }

  if (existing.status !== "draft") {
    res.status(409).json({ error: `Cannot approve a notice in '${existing.status}' status` });
    return;
  }

  const [notice] = await db
    .update(noticesTable)
    .set({
      status: "approved",
      approvedByUserId: "user_coord",
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(noticesTable.id, id), eq(noticesTable.orgId, orgId)))
    .returning();

  res.json({ notice });
});

// ---------------------------------------------------------------------------
// GET /notices/:id/pdf — generate print-ready statutory PDF
// ---------------------------------------------------------------------------

router.get("/notices/:id/pdf", async (req, res) => {
  const { orgId } = getSession(req);
  const { id } = req.params;

  // Load notice.
  const [notice] = await db
    .select()
    .from(noticesTable)
    .where(and(eq(noticesTable.id, id), eq(noticesTable.orgId, orgId)))
    .limit(1);

  if (!notice) {
    res.status(404).json({ error: "Notice not found" });
    return;
  }

  // Load recipients.
  const recipients = await db
    .select()
    .from(noticeRecipientsTable)
    .where(and(eq(noticeRecipientsTable.noticeId, id), eq(noticeRecipientsTable.orgId, orgId)));

  // Load stream + project.
  const [stream] = await db
    .select()
    .from(lienStreamsTable)
    .where(and(eq(lienStreamsTable.id, notice.lienStreamId), eq(lienStreamsTable.orgId, orgId)))
    .limit(1);

  const project = stream
    ? (
        await db
          .select()
          .from(lienProjectsTable)
          .where(
            and(eq(lienProjectsTable.id, stream.lienProjectId), eq(lienProjectsTable.orgId, orgId)),
          )
          .limit(1)
      )[0]
    : undefined;

  // Build PDF.
  const doc = new PDFDocument({ margin: 72, size: "letter" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="notice-${id.slice(0, 8)}.pdf"`,
  );
  doc.pipe(res);

  const BLUE = "#1a2b6b";
  const GRAY = "#555555";
  const LIGHT_GRAY = "#999999";

  // Helper: section divider.
  const divider = () => {
    doc
      .moveTo(72, doc.y)
      .lineTo(540, doc.y)
      .lineWidth(0.5)
      .strokeColor("#dddddd")
      .stroke();
    doc.moveDown(0.5);
  };

  // ── Header ─────────────────────────────────────────────────────────────────
  doc
    .fontSize(9)
    .fillColor(LIGHT_GRAY)
    .text("STATE OF TEXAS — MECHANICS' LIEN NOTICE", { align: "center" });
  doc.moveDown(0.3);

  const isRetainage = notice.noticeType === "retainage_claim";
  const statuteRef = isRetainage ? "§ 53.057" : "§ 53.056";
  const noticeTitle = isRetainage
    ? "NOTICE OF CLAIM FOR UNPAID RETAINAGE"
    : notice.noticeType === "early_warning"
    ? "EARLY WARNING NOTICE (COURTESY)"
    : "NOTICE OF CLAIM FOR UNPAID LABOR OR MATERIALS";

  doc
    .fontSize(14)
    .fillColor(BLUE)
    .font("Helvetica-Bold")
    .text(noticeTitle, { align: "center" });
  doc.moveDown(0.2);
  doc
    .fontSize(10)
    .fillColor(GRAY)
    .font("Helvetica")
    .text(`Texas Property Code ${statuteRef}`, { align: "center" });
  doc.moveDown(1);
  divider();

  // ── Recipients ─────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE).text("NOTICE TO:");
  doc.moveDown(0.4);

  const owner = recipients.find((r) => r.recipientType === "owner");
  const gc = recipients.find((r) => r.recipientType === "original_contractor");

  if (owner) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(GRAY).text("OWNER:");
    doc.font("Helvetica").fontSize(9).fillColor("#333333").text(owner.legalName);
    if (owner.mailingAddress) doc.text(owner.mailingAddress);
    doc.moveDown(0.5);
  }

  if (gc) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(GRAY).text("ORIGINAL CONTRACTOR (GENERAL CONTRACTOR):");
    doc.font("Helvetica").fontSize(9).fillColor("#333333").text(gc.legalName);
    if (gc.mailingAddress) doc.text(gc.mailingAddress);
    doc.moveDown(0.5);
  }

  doc.moveDown(0.5);
  divider();

  // ── Claimant ───────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE).text("CLAIMANT:");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(9).fillColor("#333333");
  doc.text("Beacon Fire Protection");
  doc.text("Texas Contractor License #:");
  doc.moveDown(1);
  divider();

  // ── Property ───────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE).text("PROPERTY IMPROVED:");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(9).fillColor("#333333");
  doc.text(project?.cachedProjectName ?? "(Project name not specified)");
  if (project?.legalPropertyAddress) doc.text(project.legalPropertyAddress);
  if (project?.county) doc.text(`${project.county} County, Texas`);
  doc.moveDown(1);
  divider();

  // ── Work + Claim ───────────────────────────────────────────────────────────
  const monthStr = new Date(notice.monthListed).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const claimFormatted = Number(notice.claimAmount).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE).text("CLAIM DETAILS:");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(9).fillColor("#333333");
  doc.text(`Month of Work Listed: ${monthStr}`);
  doc.text(`Amount of Claim:       ${claimFormatted}`, { characterSpacing: 0.1 });
  if (notice.workDescription) {
    doc.moveDown(0.3);
    doc.text(`Description of Work:   ${notice.workDescription}`);
  }
  doc.moveDown(1);
  divider();

  // ── Statutory Notice Text ──────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE).text("STATUTORY NOTICE:");
  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(8.5).fillColor("#333333");

  if (isRetainage) {
    doc.text(
      `TO THE ABOVE NAMED OWNER AND ORIGINAL CONTRACTOR: This is to notify you that Beacon Fire Protection ` +
        `("Claimant") has furnished labor and/or materials for the construction, ` +
        `alteration, or repair of the above-described property and claims a lien on the property ` +
        `for unpaid RETAINAGE in the amount of ${claimFormatted} for work performed through ${monthStr}. ` +
        `Pursuant to Texas Property Code § 53.057, you are hereby notified that if said amount ` +
        `is not paid, the Claimant intends to perfect and enforce a lien claim against the property.`,
      { lineGap: 3 },
    );
  } else if (notice.noticeType === "early_warning") {
    doc.text(
      `TO THE ABOVE NAMED OWNER AND ORIGINAL CONTRACTOR: This is a courtesy notice from ` +
        `Beacon Fire Protection ("Claimant") to advise you that Claimant has furnished ` +
        `labor and/or materials for improvements to the above-described property in the amount of ` +
        `${claimFormatted} for work performed in ${monthStr}. ` +
        `This notice is provided as a professional courtesy prior to the statutory notice deadline. ` +
        `Payment within ten (10) days will avoid the issuance of a formal statutory notice.`,
      { lineGap: 3 },
    );
  } else {
    doc.text(
      `TO THE ABOVE NAMED OWNER AND ORIGINAL CONTRACTOR: This is to notify you that Beacon Fire Protection ` +
        `("Claimant"), subcontractor, has provided labor and materials for fire-protection work ` +
        `at the above-described property. The unpaid balance for work performed in ${monthStr} ` +
        `is ${claimFormatted}. Pursuant to Texas Property Code § 53.056, you are hereby notified ` +
        `that if payment of said amount is not made, the property described above may be subject ` +
        `to a mechanic's and materialman's lien. ` +
        `If you have paid the original contractor in full, you may have a defense to this claim.`,
      { lineGap: 3 },
    );
  }

  doc.moveDown(1.5);
  divider();

  // ── Signature Block ────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  doc.font("Helvetica").fontSize(9).fillColor(GRAY);
  doc.text(`Date: ${today}`);
  doc.moveDown(2);
  doc.text("By: ___________________________________");
  doc.moveDown(0.3);
  doc.text("   Authorized Representative, Beacon Fire Protection");
  doc.moveDown(2);

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc
    .fontSize(7.5)
    .fillColor(LIGHT_GRAY)
    .text(
      "This notice is prepared pursuant to Texas Property Code Chapter 53. This document is not legal advice. " +
        "Consult a licensed attorney before taking action based on this notice.",
      { align: "center" },
    );

  doc.end();
});

export default router;
