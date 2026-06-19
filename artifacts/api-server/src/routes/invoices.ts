/**
 * invoices.ts — coordinator invoice management routes.
 *
 * POST /invoices/:id/clear   coordinator marks an invoice as cleared
 * GET  /invoices             list invoices for the org (by project)
 */

import { Router } from "express";
import { db } from "@workspace/db";
import { invoiceLinksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireSession, getSession } from "../lib/session";

const router = Router();
router.use(requireSession);

/**
 * GET /invoices?projectId=
 */
router.get("/invoices", async (req, res) => {
  const { orgId } = getSession(req);
  const { projectId } = req.query as { projectId?: string };

  const conditions = [eq(invoiceLinksTable.orgId, orgId)];
  if (projectId) {
    conditions.push(eq(invoiceLinksTable.lienProjectId, projectId));
  }

  const invoices = await db
    .select()
    .from(invoiceLinksTable)
    .where(and(...conditions));

  return res.json({ invoices });
});

/**
 * POST /invoices/:id/clear
 *
 * Coordinator confirms an invoice is cleared (paid + received).
 * This is distinct from QBO status — QBO may say "open" while coordinator
 * has confirmed receipt, or vice versa.
 */
router.post("/invoices/:id/clear", async (req, res) => {
  const { orgId } = getSession(req);
  const { id } = req.params;
  const { clearedFlag } = req.body as { clearedFlag?: boolean };

  if (clearedFlag === undefined) {
    return res.status(400).json({ error: "clearedFlag is required" });
  }

  const [invoice] = await db
    .select()
    .from(invoiceLinksTable)
    .where(and(eq(invoiceLinksTable.id, id), eq(invoiceLinksTable.orgId, orgId)));

  if (!invoice) return res.status(404).json({ error: "Invoice not found" });

  const userId = req.sessionData?.userId ?? null;
  const now = new Date();

  const [updated] = await db
    .update(invoiceLinksTable)
    .set({
      clearedFlag,
      clearedAt: clearedFlag ? now : null,
      clearedByUserId: clearedFlag ? userId : null,
      updatedAt: now,
    })
    .where(eq(invoiceLinksTable.id, id))
    .returning();

  return res.json({ invoice: updated });
});

export default router;
